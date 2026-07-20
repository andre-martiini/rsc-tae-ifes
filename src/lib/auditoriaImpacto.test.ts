import { describe, it, expect } from 'vitest';
import { calcularEfeitoOperacao, projetarPontuacao } from './auditoriaImpacto';
import type { ItemRSC, Lancamento } from '../data/mock';
import type { OperacaoAuditoria } from '../data/auditoria';

const itemManual: ItemRSC = {
  id: 'item-manual',
  numero: 2,
  inciso: 'I',
  descricao: 'Coordenação de núcleos.',
  unidade_medida: 'Por designação',
  pontos_por_unidade: 4.5,
  quantidade_automatica: false,
  modo_calculo: 'manual',
};

const itemAuto: ItemRSC = {
  id: 'item-auto',
  numero: 8,
  inciso: 'IV',
  descricao: 'Responsável por setor.',
  unidade_medida: 'Por ano ou fração acima de seis meses',
  pontos_por_unidade: 3,
  quantidade_automatica: true,
  modo_calculo: 'auto_ano_fracao',
};

const itens = [itemManual, itemAuto];
const itensById = new Map(itens.map((i) => [i.id, i]));

function makeLanc(over: Partial<Lancamento> = {}): Lancamento {
  return {
    id: 'lanc-1',
    servidor_id: 'srv-1',
    item_rsc_id: 'item-manual',
    comprovantes_ids: [],
    data_inicio: '2020-01-01',
    data_fim: '2020-12-31',
    quantidade_informada: 34,
    pontos_calculados: 153,
    status_auditoria: 'Pendente',
    ...over,
  };
}

function makeOp(over: Partial<OperacaoAuditoria> = {}): OperacaoAuditoria {
  return {
    id: 'op-1',
    tipo: 'ajustar_quantidade',
    lancamento_id: 'lanc-1',
    severidade: 'alta',
    justificativa: 'j',
    status: 'pendente',
    origem: 'consolidar',
    criada_em: '2026-07-20T00:00:00.000Z',
    ...over,
  };
}

describe('calcularEfeitoOperacao', () => {
  it('ajustar_quantidade: mostra antes/depois e delta em pontos', () => {
    const efeito = calcularEfeitoOperacao(
      makeOp({ tipo: 'ajustar_quantidade', nova_quantidade: 2 }),
      makeLanc(),
      itensById,
    );
    expect(efeito).not.toBeNull();
    expect(efeito!.quantidadeAntes).toBe(34);
    expect(efeito!.quantidadeDepois).toBe(2);
    expect(efeito!.pontosAntes).toBe(153);
    expect(efeito!.pontosDepois).toBe(9);
    expect(efeito!.delta).toBe(-144);
  });

  it('remover_lancamento: delta é a perda total dos pontos', () => {
    const efeito = calcularEfeitoOperacao(
      makeOp({ tipo: 'remover_lancamento' }),
      makeLanc({ pontos_calculados: 9 }),
      itensById,
    );
    expect(efeito!.removido).toBe(true);
    expect(efeito!.pontosDepois).toBe(0);
    expect(efeito!.delta).toBe(-9);
  });

  it('reclassificar para item automático recalcula quantidade pelos períodos', () => {
    const efeito = calcularEfeitoOperacao(
      makeOp({
        tipo: 'reclassificar',
        novo_item_rsc_id: 'item-auto',
        novos_periodos: [{ inicio: '2019-01-01', fim: '2020-12-31' }], // 2 anos
      }),
      makeLanc({ pontos_calculados: 4.5, quantidade_informada: 1 }),
      itensById,
    );
    expect(efeito!.itemDepois?.id).toBe('item-auto');
    expect(efeito!.quantidadeDepois).toBe(2);
    expect(efeito!.pontosDepois).toBe(6);
    expect(efeito!.delta).toBe(1.5);
  });

  it('sinalizar e lançamento inexistente retornam null', () => {
    expect(calcularEfeitoOperacao(makeOp({ tipo: 'sinalizar' }), makeLanc(), itensById)).toBeNull();
    expect(calcularEfeitoOperacao(makeOp(), undefined, itensById)).toBeNull();
  });
});

describe('projetarPontuacao', () => {
  it('projeta o total só com operações aprovadas', () => {
    const lancs = [
      makeLanc({ id: 'lanc-1', pontos_calculados: 153, quantidade_informada: 34 }),
      makeLanc({ id: 'lanc-2', pontos_calculados: 9, quantidade_informada: 2 }),
    ];
    const ops = [
      makeOp({ id: 'op-a', lancamento_id: 'lanc-1', nova_quantidade: 2, status: 'aprovada' }),
      makeOp({ id: 'op-b', lancamento_id: 'lanc-2', nova_quantidade: 1, status: 'pendente' }),
    ];
    const proj = projetarPontuacao(ops, lancs, itens);
    expect(proj.totalAtual).toBe(162);
    expect(proj.totalProjetado).toBe(18); // lanc-1 vira 9, lanc-2 intacto (pendente)
    expect(proj.delta).toBe(-144);
    expect(proj.consideradas).toBe(1);
  });

  it('remover aprovado zera o lançamento e ignora demais operações sobre ele', () => {
    const lancs = [makeLanc({ id: 'lanc-1', pontos_calculados: 153 })];
    const ops = [
      makeOp({ id: 'op-rm', tipo: 'remover_lancamento', status: 'aprovada' }),
      makeOp({ id: 'op-q', nova_quantidade: 2, status: 'aprovada' }),
    ];
    const proj = projetarPontuacao(ops, lancs, itens);
    expect(proj.totalProjetado).toBe(0);
    expect(proj.consideradas).toBe(1);
  });
});
