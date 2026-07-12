import type { Documento, ItemRSC } from '../data/mock';
import type { ConfiancaSugestao, SugestaoTriagem } from '../data/triagem';
import { validarIntervaloDatas } from './dateUtils';

/** Fase 4.4 — Versão de schema suportada pelo parser */
const SCHEMA_VERSION_ESPERADA = 1;

export interface ResultadoParse {
  sugestoes: SugestaoTriagem[];
  erros: string[];
  ignoradas: number;
}

export interface ContextoParse {
  documentos: Documento[];
  itensRSC: ItemRSC[];
}

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

function normalizarConfianca(value: unknown): ConfiancaSugestao {
  if (value === 'alta' || value === 'media' || value === 'baixa') return value;
  return 'baixa';
}

function gerarId(): string {
  return `sug-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Normaliza o campo de documentos: aceita tanto `documentos_ids` (array)
 * quanto `documento_id` (string única, formato antigo).
 */
function extrairDocumentosIds(raw: any, docIds: Set<string>): { ids: string[]; erro: string | null } {
  const ids: string[] = [];

  // Formato novo: documentos_ids (array)
  if (Array.isArray(raw.documentos_ids)) {
    for (const id of raw.documentos_ids) {
      if (typeof id === 'string' && docIds.has(id)) {
        if (!ids.includes(id)) ids.push(id);
      }
    }
  }

  // Formato antigo: documento_id (string única) — compatibilidade
  if (typeof raw.documento_id === 'string' && docIds.has(raw.documento_id)) {
    if (!ids.includes(raw.documento_id)) ids.push(raw.documento_id);
  }

  if (ids.length === 0) {
    const tentativa = Array.isArray(raw.documentos_ids) ? raw.documentos_ids : raw.documento_id;
    return { ids: [], erro: `documento(s) "${tentativa}" não reconhecido(s) — sugestão ignorada.` };
  }

  return { ids, erro: null };
}

// ── Parser principal ────────────────────────────────────────────────────

export function parseResultadoTriagem(texto: string, contexto: ContextoParse): ResultadoParse {
  const erros: string[] = [];
  let ignoradas = 0;
  const sugestoes: SugestaoTriagem[] = [];

  const docIds = new Set(contexto.documentos.map((d) => d.id));
  const itemIds = new Set(contexto.itensRSC.map((i) => i.id));

  // Dedup: item_rsc_id (para garantir uma sugestão por item)
  // null = não classificável, dedup por documento individual
  const dedupByItem = new Map<string, number>();

  const candidatos = encontrarBlocosJson(texto);

  if (candidatos.length === 0) {
    return {
      sugestoes: [],
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
        sugestoes: [],
        erros: ['Resposta sem schema_version — não é possível processar. Verifique se copiou a resposta completa.'],
        ignoradas: 0,
      };
    }
    if (typeof parsed.schema_version !== 'number' || parsed.schema_version !== SCHEMA_VERSION_ESPERADA) {
      return {
        sugestoes: [],
        erros: [`schema_version "${parsed.schema_version}" não suportada (esperada: ${SCHEMA_VERSION_ESPERADA}). Atualize o prompt ou o sistema.`],
        ignoradas: 0,
      };
    }

    // Processar sugestoes
    const sugestoesRaw = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [];
    for (const s of sugestoesRaw) {
      if (!s || typeof s !== 'object') {
        ignoradas++;
        continue;
      }

      // Extrair e validar documentos_ids (ou documento_id legacy)
      const { ids: docsIds, erro: docErro } = extrairDocumentosIds(s, docIds);
      if (docErro) {
        erros.push(docErro);
        ignoradas++;
        continue;
      }

      let item_rsc_id = s.item_rsc_id;
      if (item_rsc_id !== null && (typeof item_rsc_id !== 'string' || !itemIds.has(item_rsc_id))) {
        erros.push(`item_rsc_id "${item_rsc_id}" não reconhecido — sugestão ignorada.`);
        ignoradas++;
        continue;
      }

      // Validar períodos (Fase 6.1 — usar parseIsoDateStrict)
      let periodos: Array<{ inicio: string; fim: string }> = [];
      let observacoesExtras = '';
      if (Array.isArray(s.periodos)) {
        for (const p of s.periodos) {
          const intervalo = validarIntervaloDatas(p?.inicio, p?.fim);
          if (intervalo) {
            periodos.push(intervalo);
          } else {
            observacoesExtras = 'períodos removidos: datas inválidas';
          }
        }
      }

      const confianca = normalizarConfianca(s.confianca);
      const justificativa = typeof s.justificativa === 'string' ? s.justificativa : '';
      const observacoes = [
        typeof s.observacoes === 'string' ? s.observacoes : '',
        observacoesExtras,
      ].filter(Boolean).join('; ') || undefined;

      // Para itens manuais: a IA pode informar o número real de designações/produtos,
      // que pode diferir do número de documentos (alterações e retificações não contam).
      const quantidade_sugerida =
        typeof s.quantidade_sugerida === 'number' && s.quantidade_sugerida > 0
          ? s.quantidade_sugerida
          : undefined;

      // Deduplicar por item_rsc_id (garante uma sugestão por item)
      // Se item_rsc_id é null (não classificável), dedup por documento individual
      const dedupKey = item_rsc_id ?? `__null__|${docsIds.sort().join(',')}`;

      const existenteIdx = dedupByItem.get(dedupKey);
      if (existenteIdx !== undefined) {
        // Mescla: adiciona documentos novos e períodos novos
        const existente = sugestoes[existenteIdx];
        for (const id of docsIds) {
          if (!existente.documentos_ids.includes(id)) {
            existente.documentos_ids.push(id);
          }
        }
        existente.periodos = [...existente.periodos, ...periodos];
        // Soma quantidade_sugerida quando a IA agrupa documentos do mesmo item
        if (quantidade_sugerida !== undefined) {
          existente.quantidade_sugerida = (existente.quantidade_sugerida ?? 0) + quantidade_sugerida;
        }
        // Concatena justificativa
        if (justificativa && !existente.justificativa.includes(justificativa)) {
          existente.justificativa = [existente.justificativa, justificativa].filter(Boolean).join(' | ');
        }
        continue;
      }

      const sugestao: SugestaoTriagem = {
        id: gerarId(),
        documentos_ids: docsIds,
        item_rsc_id: item_rsc_id ?? null,
        confianca,
        periodos,
        justificativa,
        observacoes,
        quantidade_sugerida,
        status: 'pendente',
      };

      dedupByItem.set(dedupKey, sugestoes.length);
      sugestoes.push(sugestao);
    }

    // Processar nao_analisaveis
    const naoAnalisaveisRaw = Array.isArray(parsed.nao_analisaveis) ? parsed.nao_analisaveis : [];
    for (const na of naoAnalisaveisRaw) {
      if (!na || typeof na !== 'object') {
        ignoradas++;
        continue;
      }

      const { ids: docsIds, erro: docErro } = extrairDocumentosIds(na, docIds);
      if (docErro) {
        erros.push(`documento(s) (não analisável) ${docErro}`);
        ignoradas++;
        continue;
      }

      const dedupKey = `__null__|${docsIds.sort().join(',')}`;
      if (dedupByItem.has(dedupKey)) continue;

      const motivo = typeof na.motivo === 'string' ? na.motivo : 'não analisável';

      const sugestao: SugestaoTriagem = {
        id: gerarId(),
        documentos_ids: docsIds,
        item_rsc_id: null,
        confianca: 'baixa',
        periodos: [],
        justificativa: motivo,
        status: 'pendente',
      };

      dedupByItem.set(dedupKey, sugestoes.length);
      sugestoes.push(sugestao);
    }
  }

  if (!algumJsonValido) {
    return {
      sugestoes: [],
      erros: ['Nenhum JSON válido encontrado no texto colado. Verifique se copiou a resposta completa.'],
      ignoradas,
    };
  }

  return { sugestoes, erros, ignoradas };
}
