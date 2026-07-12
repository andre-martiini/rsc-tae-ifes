import { describe, it, expect } from 'vitest';
import {
  periodoValido,
  mesclarPeriodos,
  totalDiasPeriodos,
  totalDiasBrutos,
  unidadesAnoFracao,
  unidadesMes,
  abrangenciaPeriodos,
  periodosDoLancamento,
  type Periodo,
} from './periodos';

describe('periodoValido', () => {
  it('aceita período válido com inicio <= fim', () => {
    expect(periodoValido({ inicio: '2020-01-01', fim: '2020-12-31' })).toBe(true);
  });

  it('aceita inicio == fim', () => {
    expect(periodoValido({ inicio: '2020-06-15', fim: '2020-06-15' })).toBe(true);
  });

  it('rejeita fim anterior ao inicio', () => {
    expect(periodoValido({ inicio: '2020-12-31', fim: '2020-01-01' })).toBe(false);
  });

  it('rejeita strings vazias', () => {
    expect(periodoValido({ inicio: '', fim: '' })).toBe(false);
  });
});

describe('mesclarPeriodos', () => {
  it('mescla períodos sobrepostos', () => {
    const periodos: Periodo[] = [
      { inicio: '2020-01-01', fim: '2020-06-30' },
      { inicio: '2020-06-01', fim: '2020-12-31' },
    ];
    const resultado = mesclarPeriodos(periodos);
    expect(resultado).toEqual([{ inicio: '2020-01-01', fim: '2020-12-31' }]);
  });

  it('não mescla períodos contíguos (comportamento atual: exige sobreposição)', () => {
    const periodos: Periodo[] = [
      { inicio: '2020-01-01', fim: '2020-06-30' },
      { inicio: '2020-07-01', fim: '2020-12-31' },
    ];
    const resultado = mesclarPeriodos(periodos);
    expect(resultado).toHaveLength(2);
  });

  it('não mescla períodos disjuntos', () => {
    const periodos: Periodo[] = [
      { inicio: '2020-01-01', fim: '2020-03-31' },
      { inicio: '2020-07-01', fim: '2020-12-31' },
    ];
    const resultado = mesclarPeriodos(periodos);
    expect(resultado).toHaveLength(2);
  });

  it('ordena períodos desordenados antes de mesclar', () => {
    const periodos: Periodo[] = [
      { inicio: '2020-06-01', fim: '2020-12-31' },
      { inicio: '2020-01-01', fim: '2020-06-30' },
    ];
    const resultado = mesclarPeriodos(periodos);
    expect(resultado).toEqual([{ inicio: '2020-01-01', fim: '2020-12-31' }]);
  });

  it('remove períodos inválidos', () => {
    const periodos: Periodo[] = [
      { inicio: '', fim: '2020-12-31' },
      { inicio: '2020-01-01', fim: '2020-06-30' },
    ];
    const resultado = mesclarPeriodos(periodos);
    expect(resultado).toEqual([{ inicio: '2020-01-01', fim: '2020-06-30' }]);
  });
});

describe('totalDiasPeriodos', () => {
  it('soma dias de período único (inclusivo)', () => {
    const periodos: Periodo[] = [{ inicio: '2020-01-01', fim: '2020-01-31' }];
    expect(totalDiasPeriodos(periodos)).toBe(31);
  });

  it('não conta sobreposição em dobro', () => {
    const periodos: Periodo[] = [
      { inicio: '2020-01-01', fim: '2020-06-30' },
      { inicio: '2020-06-01', fim: '2020-12-31' },
    ];
    // 2020 é bissexto: jan-dez = 366 dias
    expect(totalDiasPeriodos(periodos)).toBe(366);
  });
});

describe('totalDiasBrutos', () => {
  it('soma dias contando sobreposição em dobro', () => {
    const periodos: Periodo[] = [
      { inicio: '2020-01-01', fim: '2020-06-30' },
      { inicio: '2020-06-01', fim: '2020-12-31' },
    ];
    // jan-jun = 182 dias, jul-dez = 184 dias, sobreposição jun = 30 dias
    // brutos = 182 + 184 = 366
    expect(totalDiasBrutos(periodos)).toBeGreaterThan(totalDiasPeriodos(periodos));
  });
});

describe('unidadesAnoFracao', () => {
  it('retorna 1 para exatamente 12 meses (365 dias)', () => {
    expect(unidadesAnoFracao(365)).toBe(1);
  });

  it('retorna 0 para 6 meses exatos (180 dias)', () => {
    expect(unidadesAnoFracao(180)).toBe(0);
  });

  it('retorna 1 para 18 meses (540 dias) — fração de 6 meses não soma', () => {
    // 540/30 = 18 meses → 1 ano completo + 6 meses de fração. Como a regra é
    // "> 6" (estrito), 6 meses exatos não somam unidade extra.
    expect(unidadesAnoFracao(540)).toBe(1);
  });
});

describe('unidadesMes', () => {
  it('converte 60 dias para 2 meses', () => {
    expect(unidadesMes(60)).toBe(2);
  });

  it('converte 90 dias para 3 meses', () => {
    expect(unidadesMes(90)).toBe(3);
  });
});

describe('abrangenciaPeriodos', () => {
  it('retorna menor inicio e maior fim', () => {
    const periodos: Periodo[] = [
      { inicio: '2020-07-01', fim: '2020-09-30' },
      { inicio: '2020-01-01', fim: '2020-03-31' },
      { inicio: '2020-05-01', fim: '2020-12-31' },
    ];
    expect(abrangenciaPeriodos(periodos)).toEqual({
      inicio: '2020-01-01',
      fim: '2020-12-31',
    });
  });

  it('retorna null para lista vazia', () => {
    expect(abrangenciaPeriodos([])).toBeNull();
  });
});

describe('periodosDoLancamento', () => {
  it('usa periodos quando presentes', () => {
    const lanc = {
      periodos: [{ inicio: '2020-01-01', fim: '2020-06-30' }],
      data_inicio: '2019-01-01',
      data_fim: '2019-12-31',
    };
    expect(periodosDoLancamento(lanc)).toEqual([
      { inicio: '2020-01-01', fim: '2020-06-30' },
    ]);
  });

  it('cai para data_inicio/data_fim quando não há periodos', () => {
    const lanc = {
      data_inicio: '2019-01-01',
      data_fim: '2019-12-31',
    };
    expect(periodosDoLancamento(lanc)).toEqual([
      { inicio: '2019-01-01', fim: '2019-12-31' },
    ]);
  });

  it('retorna array vazio quando não há dados', () => {
    expect(periodosDoLancamento({})).toEqual([]);
  });
});
