/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mesclagem de lançamentos de um MESMO item do rol.
 *
 * Motivação (relatos de usuários, ago/2026): servidores juntam comprovantes
 * aos poucos e cada "Salvar" cria um lançamento novo — o item chega à
 * avaliação fragmentado em 2+ lançamentos, disparando alertas de possível
 * duplicidade de quantidade na bancada. A regra do rol é que o total do item
 * é a SOMA dos lançamentos; concentrar tudo num lançamento único elimina a
 * ambiguidade sem mudar a pontuação.
 *
 * As funções aqui são puras: recebem lançamentos e devolvem o patch a aplicar
 * via `updateLancamento` (e os ids a remover, no caso da mesclagem total).
 * Nenhum documento é apagado — a união de `comprovantes_ids` preserva todos.
 */

import type { Lancamento } from '../data/mock';
import { abrangenciaPeriodos, periodoValido, periodosDoLancamento, type Periodo } from './periodos';
import { addPointValues, calculateLancamentoPoints } from './points';

/** Comprovantes efetivos de um lançamento, cobrindo o legado `documento_id`. */
export function comprovantesDoLancamento(
  lancamento: Pick<Lancamento, 'comprovantes_ids' | 'documento_id'>,
): string[] {
  if (lancamento.comprovantes_ids && lancamento.comprovantes_ids.length > 0) {
    return lancamento.comprovantes_ids;
  }
  return lancamento.documento_id ? [lancamento.documento_id] : [];
}

/** Conteúdo novo a somar num lançamento existente (subconjunto do formulário). */
export interface ConteudoNovoLancamento {
  comprovantes_ids: string[];
  quantidade_informada: number;
  periodos?: Periodo[];
  observacao?: string;
}

/** Patch resultante da mesclagem, aplicável via `updateLancamento`. */
export interface PatchMesclagem {
  comprovantes_ids: string[];
  quantidade_informada: number;
  pontos_calculados: number;
  data_inicio: string;
  data_fim: string;
  periodos?: Periodo[];
  observacao?: string;
}

function unirIds(...listas: string[][]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const lista of listas) {
    for (const id of lista) {
      if (!vistos.has(id)) {
        vistos.add(id);
        resultado.push(id);
      }
    }
  }
  return resultado;
}

/**
 * Períodos são concatenados e ordenados, NUNCA fundidos entre si: cada período
 * declarado (ex.: uma portaria por período) continua visível como foi
 * informado. Sobreposições são tratadas apenas na contagem de dias
 * (`totalDiasPeriodos`), não aqui.
 */
function unirPeriodos(...conjuntos: Periodo[][]): Periodo[] {
  return conjuntos
    .flat()
    .filter(periodoValido)
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));
}

function unirObservacoes(observacoes: Array<string | undefined>): string | undefined {
  const distintas: string[] = [];
  for (const obs of observacoes) {
    const texto = obs?.trim();
    if (texto && !distintas.includes(texto)) distintas.push(texto);
  }
  return distintas.length > 0 ? distintas.join('\n') : undefined;
}

/**
 * Soma o conteúdo do formulário de novo lançamento a um lançamento existente
 * do mesmo item: união de comprovantes, soma de quantidades (com recálculo de
 * pontos) e concatenação de períodos e observações.
 */
export function mesclarConteudoNoLancamento(
  alvo: Lancamento,
  novo: ConteudoNovoLancamento,
  pontosPorUnidade: number,
): PatchMesclagem {
  const quantidadeTotal = addPointValues(alvo.quantidade_informada, novo.quantidade_informada);
  const periodos = unirPeriodos(periodosDoLancamento(alvo), novo.periodos ?? []);
  const abrangencia = abrangenciaPeriodos(periodos);

  return {
    comprovantes_ids: unirIds(comprovantesDoLancamento(alvo), novo.comprovantes_ids),
    quantidade_informada: quantidadeTotal,
    pontos_calculados: calculateLancamentoPoints(quantidadeTotal, pontosPorUnidade),
    data_inicio: abrangencia?.inicio ?? '',
    data_fim: abrangencia?.fim ?? '',
    periodos: periodos.length > 0 ? periodos : undefined,
    observacao: unirObservacoes([alvo.observacao, novo.observacao]),
  };
}

export interface ResultadoMesclagemTotal {
  /** Lançamento que permanece (o mais antigo do item). */
  alvoId: string;
  patch: PatchMesclagem;
  /** Lançamentos absorvidos, a remover após aplicar o patch. */
  removerIds: string[];
}

/**
 * Mescla TODOS os lançamentos de um item num único: o mais antigo permanece
 * (id estável) e absorve comprovantes, quantidades, períodos e observações
 * dos demais. Descrições de fato gerador dos absorvidos que se perderiam são
 * preservadas na observação.
 */
export function mesclarLancamentosDoItem(
  itemLancamentos: Lancamento[],
  pontosPorUnidade: number,
): ResultadoMesclagemTotal | null {
  if (itemLancamentos.length < 2) return null;

  const [alvo, ...fontes] = itemLancamentos;

  const quantidadeTotal = itemLancamentos.reduce(
    (soma, lancamento) => addPointValues(soma, lancamento.quantidade_informada),
    0,
  );
  const periodos = unirPeriodos(...itemLancamentos.map(periodosDoLancamento));
  const abrangencia = abrangenciaPeriodos(periodos);

  const fatosGeradoresPerdidos = fontes
    .map((fonte) => fonte.fato_gerador_descricao?.trim())
    .filter((descricao): descricao is string => !!descricao && descricao !== alvo.fato_gerador_descricao?.trim())
    .map((descricao) => `Fato gerador (lançamento mesclado): ${descricao}`);

  return {
    alvoId: alvo.id,
    removerIds: fontes.map((fonte) => fonte.id),
    patch: {
      comprovantes_ids: unirIds(...itemLancamentos.map(comprovantesDoLancamento)),
      quantidade_informada: quantidadeTotal,
      pontos_calculados: calculateLancamentoPoints(quantidadeTotal, pontosPorUnidade),
      data_inicio: abrangencia?.inicio ?? '',
      data_fim: abrangencia?.fim ?? '',
      periodos: periodos.length > 0 ? periodos : undefined,
      observacao: unirObservacoes([
        ...itemLancamentos.map((lancamento) => lancamento.observacao),
        ...fatosGeradoresPerdidos,
      ]),
    },
  };
}
