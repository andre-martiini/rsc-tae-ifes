import { describe, expect, it } from 'vitest';
import type { Lancamento } from '../data/mock';
import {
  comprovantesDoLancamento,
  mesclarConteudoNoLancamento,
  mesclarLancamentosDoItem,
} from './mesclarLancamentos';

function criarLancamento(overrides: Partial<Lancamento> & { id: string }): Lancamento {
  return {
    servidor_id: 'serv-1',
    item_rsc_id: 'item-11',
    data_inicio: '',
    data_fim: '',
    quantidade_informada: 1,
    pontos_calculados: 1,
    status_auditoria: 'Pendente',
    ...overrides,
  };
}

describe('comprovantesDoLancamento', () => {
  it('usa comprovantes_ids quando presente', () => {
    const lancamento = criarLancamento({ id: 'l1', comprovantes_ids: ['d1', 'd2'], documento_id: 'legado' });
    expect(comprovantesDoLancamento(lancamento)).toEqual(['d1', 'd2']);
  });

  it('recai no documento_id legado quando comprovantes_ids está ausente ou vazio', () => {
    expect(comprovantesDoLancamento(criarLancamento({ id: 'l1', documento_id: 'legado' }))).toEqual(['legado']);
    expect(
      comprovantesDoLancamento(criarLancamento({ id: 'l1', comprovantes_ids: [], documento_id: 'legado' })),
    ).toEqual(['legado']);
  });

  it('retorna vazio sem comprovantes nem documento legado', () => {
    expect(comprovantesDoLancamento(criarLancamento({ id: 'l1' }))).toEqual([]);
  });
});

describe('mesclarConteudoNoLancamento', () => {
  it('une comprovantes sem duplicar, soma quantidades e recalcula pontos', () => {
    const alvo = criarLancamento({
      id: 'l1',
      comprovantes_ids: ['d1', 'd2'],
      quantidade_informada: 6,
      pontos_calculados: 6,
    });
    const patch = mesclarConteudoNoLancamento(
      alvo,
      { comprovantes_ids: ['d2', 'd3'], quantidade_informada: 2 },
      1,
    );
    expect(patch.comprovantes_ids).toEqual(['d1', 'd2', 'd3']);
    expect(patch.quantidade_informada).toBe(8);
    expect(patch.pontos_calculados).toBe(8);
  });

  it('soma quantidades decimais sem erro de ponto flutuante', () => {
    const alvo = criarLancamento({ id: 'l1', quantidade_informada: 0.1 });
    const patch = mesclarConteudoNoLancamento(alvo, { comprovantes_ids: [], quantidade_informada: 0.2 }, 10);
    expect(patch.quantidade_informada).toBe(0.3);
    expect(patch.pontos_calculados).toBe(3);
  });

  it('concatena períodos ordenados, sem fundi-los, e recalcula a abrangência', () => {
    const alvo = criarLancamento({
      id: 'l1',
      data_inicio: '2024-05-01',
      data_fim: '2024-06-30',
      periodos: [{ inicio: '2024-05-01', fim: '2024-06-30' }],
    });
    const patch = mesclarConteudoNoLancamento(
      alvo,
      {
        comprovantes_ids: [],
        quantidade_informada: 1,
        periodos: [{ inicio: '2024-01-01', fim: '2024-02-28' }],
      },
      1,
    );
    expect(patch.periodos).toEqual([
      { inicio: '2024-01-01', fim: '2024-02-28' },
      { inicio: '2024-05-01', fim: '2024-06-30' },
    ]);
    expect(patch.data_inicio).toBe('2024-01-01');
    expect(patch.data_fim).toBe('2024-06-30');
  });

  it('lê os períodos legados de data_inicio/data_fim quando o alvo não tem lista periodos', () => {
    const alvo = criarLancamento({ id: 'l1', data_inicio: '2023-01-01', data_fim: '2023-12-31' });
    const patch = mesclarConteudoNoLancamento(alvo, { comprovantes_ids: [], quantidade_informada: 1 }, 1);
    expect(patch.periodos).toEqual([{ inicio: '2023-01-01', fim: '2023-12-31' }]);
    expect(patch.data_inicio).toBe('2023-01-01');
  });

  it('item manual sem períodos resulta em periodos undefined e datas vazias', () => {
    const alvo = criarLancamento({ id: 'l1', quantidade_informada: 3 });
    const patch = mesclarConteudoNoLancamento(alvo, { comprovantes_ids: ['d9'], quantidade_informada: 2 }, 1);
    expect(patch.periodos).toBeUndefined();
    expect(patch.data_inicio).toBe('');
    expect(patch.data_fim).toBe('');
  });

  it('concatena observações distintas e ignora repetidas/vazias', () => {
    const alvo = criarLancamento({ id: 'l1', observacao: 'Portaria 10/2024' });
    const patch = mesclarConteudoNoLancamento(
      alvo,
      { comprovantes_ids: [], quantidade_informada: 1, observacao: 'Certificado do congresso' },
      1,
    );
    expect(patch.observacao).toBe('Portaria 10/2024\nCertificado do congresso');

    const patchRepetida = mesclarConteudoNoLancamento(
      alvo,
      { comprovantes_ids: [], quantidade_informada: 1, observacao: ' Portaria 10/2024 ' },
      1,
    );
    expect(patchRepetida.observacao).toBe('Portaria 10/2024');
  });
});

describe('mesclarLancamentosDoItem', () => {
  it('retorna null com menos de dois lançamentos', () => {
    expect(mesclarLancamentosDoItem([], 1)).toBeNull();
    expect(mesclarLancamentosDoItem([criarLancamento({ id: 'l1' })], 1)).toBeNull();
  });

  it('mantém o lançamento mais antigo e absorve os demais', () => {
    const resultado = mesclarLancamentosDoItem(
      [
        criarLancamento({ id: 'l1', comprovantes_ids: ['d1', 'd2'], quantidade_informada: 6 }),
        criarLancamento({ id: 'l2', comprovantes_ids: ['d3'], quantidade_informada: 2 }),
        criarLancamento({ id: 'l3', documento_id: 'd4', quantidade_informada: 1 }),
      ],
      1,
    );
    expect(resultado).not.toBeNull();
    expect(resultado!.alvoId).toBe('l1');
    expect(resultado!.removerIds).toEqual(['l2', 'l3']);
    expect(resultado!.patch.comprovantes_ids).toEqual(['d1', 'd2', 'd3', 'd4']);
    expect(resultado!.patch.quantidade_informada).toBe(9);
    expect(resultado!.patch.pontos_calculados).toBe(9);
  });

  it('não duplica um comprovante compartilhado entre lançamentos', () => {
    const resultado = mesclarLancamentosDoItem(
      [
        criarLancamento({ id: 'l1', comprovantes_ids: ['d1', 'compartilhado'] }),
        criarLancamento({ id: 'l2', comprovantes_ids: ['compartilhado', 'd2'] }),
      ],
      1,
    );
    expect(resultado!.patch.comprovantes_ids).toEqual(['d1', 'compartilhado', 'd2']);
  });

  it('reúne períodos de todos os lançamentos e cobre a abrangência total', () => {
    const resultado = mesclarLancamentosDoItem(
      [
        criarLancamento({
          id: 'l1',
          periodos: [{ inicio: '2024-03-01', fim: '2024-04-30' }],
          data_inicio: '2024-03-01',
          data_fim: '2024-04-30',
        }),
        criarLancamento({ id: 'l2', data_inicio: '2023-01-01', data_fim: '2023-06-30' }),
      ],
      1,
    );
    expect(resultado!.patch.periodos).toEqual([
      { inicio: '2023-01-01', fim: '2023-06-30' },
      { inicio: '2024-03-01', fim: '2024-04-30' },
    ]);
    expect(resultado!.patch.data_inicio).toBe('2023-01-01');
    expect(resultado!.patch.data_fim).toBe('2024-04-30');
  });

  it('preserva na observação o fato gerador dos lançamentos absorvidos', () => {
    const resultado = mesclarLancamentosDoItem(
      [
        criarLancamento({ id: 'l1', observacao: 'Obs A', fato_gerador_descricao: 'Comissão X' }),
        criarLancamento({ id: 'l2', observacao: 'Obs B', fato_gerador_descricao: 'Comissão Y' }),
        criarLancamento({ id: 'l3', fato_gerador_descricao: 'Comissão X' }),
      ],
      1,
    );
    expect(resultado!.patch.observacao).toBe(
      'Obs A\nObs B\nFato gerador (lançamento mesclado): Comissão Y',
    );
  });
});
