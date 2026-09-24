import { describe, expect, it } from 'vitest';
import { AVISO_SERVIDOR_INATIVO, getServidorFunctionalEligibility } from './rsc';

describe('getServidorFunctionalEligibility', () => {
  it('aceita servidor ativo fora do estágio probatório sem avisos', () => {
    const result = getServidorFunctionalEligibility({
      situacao_funcional: 'Ativo',
      data_ingresso_ife: '2010-03-01',
    });
    expect(result).toEqual({ ok: true, reasons: [], warnings: [] });
  });

  it('permite servidor inativo (aposentado), mas com aviso de falta de previsão normativa', () => {
    const result = getServidorFunctionalEligibility({
      situacao_funcional: 'Inativo',
      data_ingresso_ife: '1995-03-01',
    });
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([AVISO_SERVIDOR_INATIVO]);
  });

  it('continua bloqueando servidor em estágio probatório', () => {
    const hoje = new Date();
    const ingresso = `${hoje.getFullYear() - 1}-01-01`;
    const result = getServidorFunctionalEligibility({
      situacao_funcional: 'Ativo',
      data_ingresso_ife: ingresso,
    });
    expect(result.ok).toBe(false);
  });
});
