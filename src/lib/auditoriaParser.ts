import type { Lancamento, ItemRSC } from '../data/mock';
import { itemDossierCode, getLancamentoDocumentIds } from './documentOrdering';
import { validarIntervaloDatas } from './dateUtils';
import type {
  OperacaoParseada,
  TipoOperacao,
  SeveridadeOperacao,
} from '../data/auditoria';

/** Fase 4.4 — Versão de schema suportada pelo parser */
const SCHEMA_VERSION_ESPERADA = 1;

export interface ResultadoParseAuditoria {
  operacoes: OperacaoParseada[];
  erros: string[];
  ignoradas: number;
}

export interface ContextoParseAuditoria {
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
}

const TIPOS_VALIDOS = new Set<TipoOperacao>([
  'remover_lancamento',
  'reclassificar',
  'ajustar_periodos',
  'ajustar_quantidade',
  'sinalizar',
]);

// ── Extração de candidatos JSON ─────────────────────────────────────────

function encontrarBlocosJson(texto: string): string[] {
  const candidatos: string[] = [];

  // 1. Blocos entre cercas de código ```json ... ``` ou ``` ... ```
  const cercaRegex = /```(?:json)?\s*\n?([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = cercaRegex.exec(texto)) !== null) {
    candidatos.push(match[1].trim());
  }

  // 2. Se não encontrou cercas, procurar objetos JSON balanceados
  if (candidatos.length === 0) {
    let depth = 0;
    let start = -1;
    for (let i = 0; i < texto.length; i++) {
      if (texto[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (texto[i] === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          candidatos.push(texto.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }

  return candidatos;
}

function parseJsonSeguro(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Validação ───────────────────────────────────────────────────────────

function normalizarSeveridade(value: unknown): SeveridadeOperacao {
  if (value === 'alta' || value === 'media' || value === 'baixa') return value;
  return 'baixa';
}

function gerarId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Parser principal ────────────────────────────────────────────────────

export function parseResultadoAuditoria(
  texto: string,
  contexto: ContextoParseAuditoria,
): ResultadoParseAuditoria {
  const erros: string[] = [];
  let ignoradas = 0;
  const operacoes: OperacaoParseada[] = [];

  const lancIds = new Set(contexto.lancamentos.map((l) => l.id));
  const itemIds = new Set(contexto.itensRSC.map((i) => i.id));

  // IDs duplicados tornam impossível atribuir operações ao lançamento certo:
  // justificativas de um inciso apareceriam em outro e correções seriam
  // aplicadas a todos os lançamentos gêmeos de uma vez.
  if (lancIds.size < contexto.lancamentos.length) {
    return {
      operacoes: [],
      erros: [
        'Há lançamentos com identificadores duplicados nesta sessão. Recarregue a página (a migração automática corrige os identificadores), gere o prompt de auditoria novamente e reenvie à IA antes de colar a resposta.',
      ],
      ignoradas: 0,
    };
  }

  // Dedup: (lancamento_id, tipo) → índice em operacoes
  const dedup = new Map<string, number>();

  const candidatos = encontrarBlocosJson(texto);

  if (candidatos.length === 0) {
    return {
      operacoes: [],
      erros: ['Nenhum JSON válido encontrado no texto colado. Verifique se copiou a resposta completa.'],
      ignoradas: 0,
    };
  }

  let algumJsonValido = false;

  for (const raw of candidatos) {
    const parsed = parseJsonSeguro(raw);
    if (!parsed || typeof parsed !== 'object') continue;
    algumJsonValido = true;

    // Fase 4.4 — Validar schema_version
    if (parsed.schema_version === undefined) {
      return {
        operacoes: [],
        erros: ['Resposta sem schema_version — não é possível processar. Verifique se copiou a resposta completa.'],
        ignoradas: 0,
      };
    }
    if (typeof parsed.schema_version !== 'number' || parsed.schema_version !== SCHEMA_VERSION_ESPERADA) {
      return {
        operacoes: [],
        erros: [`schema_version "${parsed.schema_version}" não suportada (esperada: ${SCHEMA_VERSION_ESPERADA}). Atualize o prompt ou o sistema.`],
        ignoradas: 0,
      };
    }

    const opsRaw = Array.isArray(parsed.operacoes) ? parsed.operacoes : [];

    for (const op of opsRaw) {
      if (!op || typeof op !== 'object') {
        ignoradas++;
        continue;
      }

      const lancamento_id = op.lancamento_id;
      if (typeof lancamento_id !== 'string' || !lancIds.has(lancamento_id)) {
        erros.push(`lancamento_id "${lancamento_id}" não reconhecido — operação ignorada.`);
        ignoradas++;
        continue;
      }

      const tipo = op.tipo;
      if (typeof tipo !== 'string' || !TIPOS_VALIDOS.has(tipo as TipoOperacao)) {
        erros.push(`tipo "${tipo}" inválido para lançamento ${lancamento_id} — operação ignorada.`);
        ignoradas++;
        continue;
      }

      const sev = normalizarSeveridade(op.severidade);
      const justificativa = typeof op.justificativa === 'string' ? op.justificativa : '';

      const tipoOperacao = tipo as TipoOperacao;

      // Validar campos específicos por tipo
      let novo_item_rsc_id: string | undefined;
      let novos_periodos: Array<{ inicio: string; fim: string }> | undefined;
      let nova_quantidade: number | undefined;
      let descricao: string | undefined;
      let documentos_remover: string[] | undefined;

      // documentos_remover é opcional e acompanha ajustes (não sinalizar/remover).
      // Cada id precisa pertencer ao próprio lançamento; ids inválidos são descartados.
      if (op.documentos_remover !== undefined && tipoOperacao !== 'sinalizar' && tipoOperacao !== 'remover_lancamento') {
        if (!Array.isArray(op.documentos_remover)) {
          erros.push(`documentos_remover inválido (esperado lista) para lançamento ${lancamento_id} — campo ignorado.`);
        } else {
          const lancDaOp = contexto.lancamentos.find((l) => l.id === lancamento_id);
          const docsDoLanc = new Set(lancDaOp ? getLancamentoDocumentIds(lancDaOp) : []);
          const validos: string[] = [];
          for (const docId of op.documentos_remover) {
            if (typeof docId === 'string' && docsDoLanc.has(docId)) {
              if (!validos.includes(docId)) validos.push(docId);
            } else {
              erros.push(`documento_id "${docId}" em documentos_remover não pertence ao lançamento ${lancamento_id} — ignorado.`);
            }
          }
          // Guarda: se a IA tentar remover todos os comprovantes, ignora o campo
          // (esvaziar o lançamento deveria ser remover_lancamento, não ajuste).
          if (validos.length > 0 && validos.length >= docsDoLanc.size) {
            erros.push(`documentos_remover do lançamento ${lancamento_id} removeria todos os comprovantes — use remover_lancamento; campo ignorado.`);
          } else if (validos.length > 0) {
            documentos_remover = validos;
          }
        }
      }

      if (tipoOperacao === 'reclassificar') {
        if (typeof op.novo_item_rsc_id !== 'string' || !itemIds.has(op.novo_item_rsc_id)) {
          erros.push(`novo_item_rsc_id "${op.novo_item_rsc_id}" inválido para reclassificação do lançamento ${lancamento_id} — operação ignorada.`);
          ignoradas++;
          continue;
        }
        // A IA às vezes se autocontradiz: identifica um problema de enquadramento,
        // mas propõe "reclassificar" para o item onde o lançamento já está.
        const lancAtualReclass = contexto.lancamentos.find((l) => l.id === lancamento_id);
        if (lancAtualReclass && lancAtualReclass.item_rsc_id === op.novo_item_rsc_id) {
          erros.push(`reclassificar do lançamento ${lancamento_id} propõe o mesmo item já registrado (${op.novo_item_rsc_id}) — resposta inconsistente da IA, operação ignorada.`);
          ignoradas++;
          continue;
        }
        novo_item_rsc_id = op.novo_item_rsc_id;

        const novoItem = contexto.itensRSC.find((i) => i.id === novo_item_rsc_id);

        // Fase 11.1 — reclassificação atômica: bloquear se faltar período (item temporal) ou quantidade (item manual)
        if (novoItem && novoItem.modo_calculo !== 'manual') {
          // Item baseado em data: novos_periodos é obrigatório
          if (!Array.isArray(op.novos_periodos) || op.novos_periodos.length === 0) {
            erros.push(`reclassificação do lançamento ${lancamento_id} para ${novo_item_rsc_id} (${itemDossierCode(novoItem)}) requer novos_periodos — operação ignorada.`);
            ignoradas++;
            continue;
          }
          const periodosValidos: Array<{ inicio: string; fim: string }> = [];
          for (const p of op.novos_periodos) {
            const intervalo = validarIntervaloDatas(p?.inicio, p?.fim);
            if (intervalo) {
              periodosValidos.push(intervalo);
            }
          }
          if (periodosValidos.length === 0) {
            erros.push(`novos_periodos inválidos para reclassificação do lançamento ${lancamento_id} — operação ignorada.`);
            ignoradas++;
            continue;
          }
          novos_periodos = periodosValidos;
        }

        if (novoItem && novoItem.modo_calculo === 'manual') {
          // Item manual: nova_quantidade é obrigatória
          if (typeof op.nova_quantidade !== 'number' || op.nova_quantidade <= 0) {
            erros.push(`reclassificação do lançamento ${lancamento_id} para ${novo_item_rsc_id} (${itemDossierCode(novoItem)}) requer nova_quantidade — operação ignorada.`);
            ignoradas++;
            continue;
          }
          nova_quantidade = op.nova_quantidade;
        }
      }

      if (tipoOperacao === 'ajustar_periodos') {
        // Rejeitar ajustar_periodos para itens manuais (não baseados em data)
        const lancAtual = contexto.lancamentos.find((l) => l.id === lancamento_id);
        const itemAtual = lancAtual ? contexto.itensRSC.find((i) => i.id === lancAtual.item_rsc_id) : null;
        if (itemAtual && itemAtual.modo_calculo === 'manual') {
          erros.push(`ajustar_periodos não aplicável para lançamento ${lancamento_id} (${itemDossierCode(itemAtual)} — ${itemAtual.unidade_medida}): item manual, use ajustar_quantidade — operação ignorada.`);
          ignoradas++;
          continue;
        }

        if (Array.isArray(op.novos_periodos)) {
          const periodosValidos: Array<{ inicio: string; fim: string }> = [];
          for (const p of op.novos_periodos) {
            const intervalo = validarIntervaloDatas(p?.inicio, p?.fim);
            if (intervalo) {
              periodosValidos.push(intervalo);
            }
          }
          if (periodosValidos.length === 0) {
            erros.push(`novos_periodos inválidos para lançamento ${lancamento_id} — operação ignorada.`);
            ignoradas++;
            continue;
          }
          novos_periodos = periodosValidos;
        } else {
          erros.push(`novos_periodos ausente para ajustar_periodos do lançamento ${lancamento_id} — operação ignorada.`);
          ignoradas++;
          continue;
        }
      }

      if (tipoOperacao === 'ajustar_quantidade') {
        if (typeof op.nova_quantidade !== 'number' || op.nova_quantidade <= 0) {
          erros.push(`nova_quantidade inválida para lançamento ${lancamento_id} — operação ignorada.`);
          ignoradas++;
          continue;
        }
        // A IA às vezes se autocontradiz: aponta a quantidade atual como errada,
        // mas sugere "corrigir" para o mesmo valor. Isso não é uma correção real.
        const lancAtual = contexto.lancamentos.find((l) => l.id === lancamento_id);
        if (lancAtual && lancAtual.quantidade_informada === op.nova_quantidade) {
          erros.push(`ajustar_quantidade do lançamento ${lancamento_id} propõe o mesmo valor já registrado (${op.nova_quantidade}) — resposta inconsistente da IA, operação ignorada.`);
          ignoradas++;
          continue;
        }
        nova_quantidade = op.nova_quantidade;
      }

      if (tipoOperacao === 'sinalizar') {
        if (typeof op.descricao !== 'string' || op.descricao.trim() === '') {
          erros.push(`descricao ausente para sinalizar do lançamento ${lancamento_id} — operação ignorada.`);
          ignoradas++;
          continue;
        }
        descricao = op.descricao;
      }

      // Deduplicar
      const dedupKey = `${lancamento_id}|${tipoOperacao}`;
      const existenteIdx = dedup.get(dedupKey);
      if (existenteIdx !== undefined) {
        // Mescla justificativa
        operacoes[existenteIdx].justificativa = [
          operacoes[existenteIdx].justificativa,
          justificativa,
        ].filter(Boolean).join(' | ');
        continue;
      }

      const operacao: OperacaoParseada = {
        id: gerarId(),
        tipo: tipoOperacao,
        lancamento_id,
        severidade: sev,
        justificativa,
        status: 'pendente',
      };

      if (novo_item_rsc_id) operacao.novo_item_rsc_id = novo_item_rsc_id;
      if (novos_periodos) operacao.novos_periodos = novos_periodos;
      if (nova_quantidade !== undefined) operacao.nova_quantidade = nova_quantidade;
      if (descricao) operacao.descricao = descricao;
      if (documentos_remover) operacao.documentos_remover = documentos_remover;

      dedup.set(dedupKey, operacoes.length);
      operacoes.push(operacao);
    }
  }

  if (!algumJsonValido) {
    return {
      operacoes: [],
      erros: ['Nenhum JSON válido encontrado no texto colado. Verifique se copiou a resposta completa.'],
      ignoradas,
    };
  }

  return { operacoes, erros, ignoradas };
}
