import { describe, it, expect } from 'vitest';
import {
  calcularNovoLancamento,
  calcularMesclagemLancamento,
  encontrarLancamentoParaMesclar,
} from './lancamentoVinculo';
import type { ItemRSC, Lancamento } from '../data/mock';

const itemManual: ItemRSC = {
  id: 'item-manual',
  numero: 1,
  inciso: 'I',
  descricao: 'Item manual',
  unidade_medida: 'designação',
  pontos_por_unidade: 5,
  quantidade_automatica: false,
  modo_calculo: 'manual',
};

const itemAnoFracao: ItemRSC = {
  ...itemManual,
  id: 'item-ano-fracao',
  modo_calculo: 'auto_ano_fracao',
};

function lancamento(overrides: Partial<Lancamento> = {}): Lancamento {
  return {
    id: 'lanc-1',
    servidor_id: 'srv-1',
    item_rsc_id: itemManual.id,
    comprovantes_ids: ['doc-1'],
    data_inicio: '2026-01-01',
    data_fim: '2026-01-01',
    quantidade_informada: 1,
    pontos_calculados: 5,
    status_auditoria: 'Pendente',
    ...overrides,
  };
}

describe('calcularNovoLancamento', () => {
  it('em item manual, usa 1 unidade por documento quando não há override', () => {
    const resultado = calcularNovoLancamento({
      servidorId: 'srv-1',
      item: itemManual,
      documentosIds: ['doc-1', 'doc-2'],
      dataReferencia: '2026-08-06',
    });
    expect(resultado.quantidade_informada).toBe(2);
    expect(resultado.pontos_calculados).toBe(10);
    expect(resultado.data_inicio).toBe('2026-08-06');
    expect(resultado.periodos).toBeUndefined();
  });

  it('em item manual, respeita quantidadeOverride mesmo com outro nº de documentos', () => {
    const resultado = calcularNovoLancamento({
      servidorId: 'srv-1',
      item: itemManual,
      documentosIds: ['doc-1'],
      quantidadeOverride: 5,
      dataReferencia: '2026-08-06',
    });
    expect(resultado.quantidade_informada).toBe(5);
    expect(resultado.pontos_calculados).toBe(25);
  });

  it('em item auto_ano_fracao, ignora quantidadeOverride e calcula pelos períodos', () => {
    const resultado = calcularNovoLancamento({
      servidorId: 'srv-1',
      item: itemAnoFracao,
      documentosIds: ['doc-1'],
      periodos: [{ inicio: '2025-01-01', fim: '2025-12-31' }],
      quantidadeOverride: 99,
      dataReferencia: '2026-08-06',
    });
    expect(resultado.quantidade_informada).toBe(1);
    expect(resultado.data_inicio).toBe('2025-01-01');
    expect(resultado.data_fim).toBe('2025-12-31');
  });

  it('descarta períodos inválidos silenciosamente', () => {
    const resultado = calcularNovoLancamento({
      servidorId: 'srv-1',
      item: itemManual,
      documentosIds: ['doc-1'],
      periodos: [{ inicio: '', fim: '' }],
      dataReferencia: '2026-08-06',
    });
    expect(resultado.periodos).toBeUndefined();
    expect(resultado.data_inicio).toBe('2026-08-06');
  });
});

describe('calcularMesclagemLancamento', () => {
  it('em item manual, soma quantidade apenas dos documentos novos', () => {
    const alvo = lancamento({ comprovantes_ids: ['doc-1'], quantidade_informada: 3, pontos_calculados: 15 });
    const resultado = calcularMesclagemLancamento({
      item: itemManual,
      alvo,
      documentosIds: ['doc-1', 'doc-2'],
    });
    expect(resultado.novosDocumentos).toEqual(['doc-2']);
    expect(resultado.comprovantes_ids).toEqual(['doc-1', 'doc-2']);
    expect(resultado.quantidade_informada).toBe(4);
    expect(resultado.pontos_calculados).toBe(20);
    expect(resultado.deltaPontos).toBe(5);
  });

  it('não repete documento já presente e não altera quantidade se nada é novo', () => {
    const alvo = lancamento({ comprovantes_ids: ['doc-1'], quantidade_informada: 3, pontos_calculados: 15 });
    const resultado = calcularMesclagemLancamento({
      item: itemManual,
      alvo,
      documentosIds: ['doc-1'],
    });
    expect(resultado.novosDocumentos).toEqual([]);
    expect(resultado.comprovantes_ids).toEqual(['doc-1']);
    expect(resultado.quantidade_informada).toBe(3);
    expect(resultado.deltaPontos).toBe(0);
  });

  it('respeita quantidadeAdicional explícita em vez do nº de documentos novos', () => {
    const alvo = lancamento({ comprovantes_ids: ['doc-1'], quantidade_informada: 3, pontos_calculados: 15 });
    const resultado = calcularMesclagemLancamento({
      item: itemManual,
      alvo,
      documentosIds: ['doc-1', 'doc-2'],
      quantidadeAdicional: 5,
    });
    expect(resultado.quantidade_informada).toBe(8);
    expect(resultado.pontos_calculados).toBe(40);
  });

  it('em item auto_mes, recalcula quantidade pela união dos períodos', () => {
    const alvo = lancamento({
      item_rsc_id: itemAnoFracao.id,
      comprovantes_ids: ['doc-1'],
      periodos: [{ inicio: '2026-01-01', fim: '2026-01-31' }],
      quantidade_informada: 1,
      pontos_calculados: 5,
    });
    const itemAutoMes: ItemRSC = { ...itemManual, id: itemAnoFracao.id, modo_calculo: 'auto_mes' };
    const resultado = calcularMesclagemLancamento({
      item: itemAutoMes,
      alvo,
      documentosIds: ['doc-1', 'doc-2'],
      periodosNovos: [{ inicio: '2026-02-01', fim: '2026-02-28' }],
    });
    expect(resultado.periodos).toEqual([
      { inicio: '2026-01-01', fim: '2026-01-31' },
      { inicio: '2026-02-01', fim: '2026-02-28' },
    ]);
    expect(resultado.quantidade_informada).toBe(1.97);
  });
});

describe('encontrarLancamentoParaMesclar', () => {
  it('retorna null quando não há lançamento do item', () => {
    expect(encontrarLancamentoParaMesclar('item-x', [], ['doc-1'])).toBeNull();
  });

  it('prefere o lançamento que já compartilha documentos com o conjunto informado', () => {
    const semSobreposicao = lancamento({ id: 'lanc-a', comprovantes_ids: ['doc-9'] });
    const comSobreposicao = lancamento({ id: 'lanc-b', comprovantes_ids: ['doc-1'] });
    const resultado = encontrarLancamentoParaMesclar(
      itemManual.id,
      [semSobreposicao, comSobreposicao],
      ['doc-1', 'doc-2'],
    );
    expect(resultado?.id).toBe('lanc-b');
  });

  it('exclui o próprio lançamento da sugestão ao buscar candidatos', () => {
    const unico = lancamento({ id: 'lanc-1' });
    expect(encontrarLancamentoParaMesclar(itemManual.id, [unico], ['doc-1'], 'lanc-1')).toBeNull();
  });
});
