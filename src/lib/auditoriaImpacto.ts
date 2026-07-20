import type { ItemRSC, Lancamento } from '../data/mock';
import type { OperacaoAuditoria } from '../data/auditoria';
import { calculateLancamentoPoints, normalizePointValue, sumPointValues } from './points';
import {
  periodosDoLancamento,
  totalDiasPeriodos,
  unidadesAnoFracao,
  unidadesMes,
  type Periodo,
} from './periodos';

/**
 * Efeito concreto de uma operação de auditoria sobre um lançamento: o estado
 * atual ("antes") e o estado resultante ("depois"), incluindo o impacto em
 * pontos. Usado pela tela de Auditoria para mostrar ao usuário exatamente o
 * que muda antes de ele aprovar — a mesma matemática de
 * aplicarOperacoesAuditoria, mas em modo de simulação (nada é alterado).
 */
export interface EfeitoOperacao {
  itemAntes: ItemRSC | null;
  itemDepois: ItemRSC | null;
  quantidadeAntes: number;
  quantidadeDepois: number;
  periodosAntes: Periodo[];
  periodosDepois: Periodo[];
  pontosAntes: number;
  pontosDepois: number;
  /** pontosDepois - pontosAntes (normalizado) */
  delta: number;
  /** true quando a operação exclui o lançamento */
  removido: boolean;
}

function quantidadePorPeriodos(item: ItemRSC, periodos: Periodo[]): number {
  const dias = totalDiasPeriodos(periodos);
  return item.modo_calculo === 'auto_mes' ? unidadesMes(dias) : unidadesAnoFracao(dias);
}

/**
 * Calcula o antes/depois de uma operação sem aplicá-la. Retorna null para
 * operações que não alteram nada ('sinalizar') ou cujo lançamento/item não
 * pôde ser resolvido (ex.: lançamento já removido).
 */
export function calcularEfeitoOperacao(
  op: OperacaoAuditoria,
  lanc: Lancamento | undefined,
  itensById: Map<string, ItemRSC>,
): EfeitoOperacao | null {
  if (!lanc || op.tipo === 'sinalizar') return null;

  const itemAntes = itensById.get(lanc.item_rsc_id) ?? null;
  const periodosAntes = periodosDoLancamento(lanc);
  const pontosAntes = lanc.pontos_calculados;
  const quantidadeAntes = lanc.quantidade_informada;

  const base: Omit<EfeitoOperacao, 'quantidadeDepois' | 'periodosDepois' | 'pontosDepois' | 'delta' | 'itemDepois' | 'removido'> = {
    itemAntes,
    quantidadeAntes,
    periodosAntes,
    pontosAntes,
  };

  if (op.tipo === 'remover_lancamento') {
    return {
      ...base,
      itemDepois: itemAntes,
      quantidadeDepois: 0,
      periodosDepois: [],
      pontosDepois: 0,
      delta: normalizePointValue(-pontosAntes),
      removido: true,
    };
  }

  if (op.tipo === 'reclassificar') {
    if (!op.novo_item_rsc_id) return null;
    const novoItem = itensById.get(op.novo_item_rsc_id);
    if (!novoItem) return null;
    const periodosDepois = op.novos_periodos ?? periodosAntes;
    let quantidadeDepois = op.nova_quantidade ?? quantidadeAntes;
    if (novoItem.modo_calculo !== 'manual') {
      quantidadeDepois = quantidadePorPeriodos(novoItem, periodosDepois);
    }
    const pontosDepois = calculateLancamentoPoints(quantidadeDepois, novoItem.pontos_por_unidade);
    return {
      ...base,
      itemDepois: novoItem,
      quantidadeDepois,
      periodosDepois,
      pontosDepois,
      delta: normalizePointValue(pontosDepois - pontosAntes),
      removido: false,
    };
  }

  if (op.tipo === 'ajustar_periodos') {
    if (!op.novos_periodos || !itemAntes) return null;
    const periodosDepois = op.novos_periodos;
    let quantidadeDepois = quantidadeAntes;
    if (itemAntes.modo_calculo !== 'manual') {
      quantidadeDepois = quantidadePorPeriodos(itemAntes, periodosDepois);
    }
    const pontosDepois = calculateLancamentoPoints(quantidadeDepois, itemAntes.pontos_por_unidade);
    return {
      ...base,
      itemDepois: itemAntes,
      quantidadeDepois,
      periodosDepois,
      pontosDepois,
      delta: normalizePointValue(pontosDepois - pontosAntes),
      removido: false,
    };
  }

  if (op.tipo === 'ajustar_quantidade') {
    if (op.nova_quantidade === undefined || !itemAntes) return null;
    const pontosDepois = calculateLancamentoPoints(op.nova_quantidade, itemAntes.pontos_por_unidade);
    return {
      ...base,
      itemDepois: itemAntes,
      quantidadeDepois: op.nova_quantidade,
      periodosDepois: periodosAntes,
      pontosDepois,
      delta: normalizePointValue(pontosDepois - pontosAntes),
      removido: false,
    };
  }

  return null;
}

export interface ProjecaoPontuacao {
  totalAtual: number;
  totalProjetado: number;
  delta: number;
  /** operações aprovadas que entraram na simulação */
  consideradas: number;
}

/**
 * Simula o total de pontos do dossiê após aplicar todas as operações
 * APROVADAS, na mesma ordem usada por aplicarOperacoesAuditoria
 * (remover → reclassificar → ajustar_periodos → ajustar_quantidade),
 * inclusive quando várias operações atingem o mesmo lançamento.
 */
export function projetarPontuacao(
  operacoes: OperacaoAuditoria[],
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
): ProjecaoPontuacao {
  const itensById = new Map(itensRSC.map((i) => [i.id, i]));
  const totalAtual = sumPointValues(lancamentos.map((l) => l.pontos_calculados));

  type Sim = { lanc: Lancamento; removido: boolean };
  const sims = new Map<string, Sim>(
    lancamentos.map((l) => [l.id, { lanc: { ...l }, removido: false }]),
  );

  const aprovadas = operacoes.filter((o) => o.status === 'aprovada' && o.tipo !== 'sinalizar');
  const ordem: OperacaoAuditoria['tipo'][] = ['remover_lancamento', 'reclassificar', 'ajustar_periodos', 'ajustar_quantidade'];
  let consideradas = 0;

  for (const tipo of ordem) {
    for (const op of aprovadas.filter((o) => o.tipo === tipo)) {
      const sim = sims.get(op.lancamento_id);
      if (!sim || sim.removido) continue;

      const efeito = calcularEfeitoOperacao(op, sim.lanc, itensById);
      if (!efeito) continue;
      consideradas++;

      if (efeito.removido) {
        sim.removido = true;
        sim.lanc = { ...sim.lanc, pontos_calculados: 0 };
        continue;
      }
      sim.lanc = {
        ...sim.lanc,
        item_rsc_id: efeito.itemDepois?.id ?? sim.lanc.item_rsc_id,
        quantidade_informada: efeito.quantidadeDepois,
        periodos: efeito.periodosDepois.length > 0 ? efeito.periodosDepois : sim.lanc.periodos,
        pontos_calculados: efeito.pontosDepois,
      };
    }
  }

  const totalProjetado = sumPointValues(
    Array.from(sims.values()).filter((s) => !s.removido).map((s) => s.lanc.pontos_calculados),
  );

  return {
    totalAtual,
    totalProjetado,
    delta: normalizePointValue(totalProjetado - totalAtual),
    consideradas,
  };
}
