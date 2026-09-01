import { describe, expect, it } from 'vitest';
import type { EstadoAuditoria, OperacaoAuditoria } from '../data/auditoria';
import { migrarAuditoriaVerificada } from './migrateAuditoriaVerificada';

function op(overrides: Partial<OperacaoAuditoria>): OperacaoAuditoria {
  return {
    id: 'op-1',
    tipo: 'sinalizar',
    lancamento_id: 'lanc-1',
    severidade: 'baixa',
    justificativa: 'Conferir',
    descricao: 'Conferir manualmente',
    status: 'rejeitada',
    origem: 'triagem',
    criada_em: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('migração do estado verificada', () => {
  it('migra somente sinalizar/rejeitada e informa contagens antes e depois', () => {
    const estado: EstadoAuditoria = {
      schema_version: 1,
      operacoes: [
        op({ id: 'sinal-antiga' }),
        op({ id: 'correcao-rejeitada', tipo: 'ajustar_quantidade' }),
        op({ id: 'sinal-pendente', status: 'pendente' }),
      ],
    };

    const resultado = migrarAuditoriaVerificada(estado);

    expect(resultado.estado?.operacoes.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'sinal-antiga', status: 'verificada' },
      { id: 'correcao-rejeitada', status: 'rejeitada' },
      { id: 'sinal-pendente', status: 'pendente' },
    ]);
    expect(resultado.stats).toEqual({
      totalOperacoesAntes: 3,
      sinalizacoesRejeitadasAntes: 1,
      migradas: 1,
      sinalizacoesRejeitadasDepois: 0,
      sinalizacoesVerificadasDepois: 1,
    });
  });

  it('é idempotente', () => {
    const inicial: EstadoAuditoria = { schema_version: 1, operacoes: [op({})] };
    const primeira = migrarAuditoriaVerificada(inicial);
    const segunda = migrarAuditoriaVerificada(primeira.estado);

    expect(segunda.estado).toBe(primeira.estado);
    expect(segunda.stats.migradas).toBe(0);
    expect(segunda.stats.sinalizacoesVerificadasDepois).toBe(1);
  });
});
