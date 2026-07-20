import { describe, it, expect } from 'vitest';
import { mergeOperacoesPorOrigem } from './auditoriaMerge';
import type { EstadoAuditoria, OperacaoAuditoria, OperacaoParseada } from '../data/auditoria';

function parseada(over: Partial<OperacaoParseada> = {}): OperacaoParseada {
  return {
    id: `op-${Math.random().toString(36).slice(2, 8)}`,
    tipo: 'sinalizar',
    lancamento_id: 'lanc-1',
    severidade: 'baixa',
    justificativa: 'j',
    descricao: 'd',
    status: 'pendente',
    ...over,
  };
}

function armazenada(over: Partial<OperacaoAuditoria> = {}): OperacaoAuditoria {
  return {
    ...parseada(),
    origem: 'triagem',
    criada_em: '2026-01-01T00:00:00.000Z',
    ...over,
  } as OperacaoAuditoria;
}

const AGORA = '2026-07-20T12:00:00.000Z';

describe('mergeOperacoesPorOrigem', () => {
  it('carimba origem, status pendente e criada_em nas novas operações', () => {
    const estado = mergeOperacoesPorOrigem(null, 'consolidar', [parseada({ id: 'a' })], [], AGORA);
    expect(estado.operacoes).toHaveLength(1);
    expect(estado.operacoes[0]).toMatchObject({
      id: 'a',
      origem: 'consolidar',
      status: 'pendente',
      criada_em: AGORA,
    });
    expect(estado.ultima_colagem_por_origem?.consolidar).toEqual({ em: AGORA, erros: [] });
  });

  it('substitui operações não-aplicadas da MESMA origem', () => {
    const inicial: EstadoAuditoria = {
      schema_version: 1,
      operacoes: [
        armazenada({ id: 'old-pend', origem: 'consolidar', status: 'pendente' }),
        armazenada({ id: 'old-aprov', origem: 'consolidar', status: 'aprovada' }),
      ],
    };
    const estado = mergeOperacoesPorOrigem(inicial, 'consolidar', [parseada({ id: 'new' })], [], AGORA);
    const ids = estado.operacoes.map((o) => o.id);
    expect(ids).toEqual(['new']);
  });

  it('preserva histórico APLICADO da mesma origem', () => {
    const inicial: EstadoAuditoria = {
      schema_version: 1,
      operacoes: [
        armazenada({ id: 'aplicada-1', origem: 'consolidar', status: 'aplicada', aplicada_em: AGORA }),
        armazenada({ id: 'pend-1', origem: 'consolidar', status: 'pendente' }),
      ],
    };
    const estado = mergeOperacoesPorOrigem(inicial, 'consolidar', [parseada({ id: 'new' })], [], AGORA);
    const ids = estado.operacoes.map((o) => o.id).sort();
    expect(ids).toEqual(['aplicada-1', 'new']);
  });

  it('não toca em operações de OUTRA origem', () => {
    const inicial: EstadoAuditoria = {
      schema_version: 1,
      operacoes: [
        armazenada({ id: 'tri-pend', origem: 'triagem', status: 'pendente' }),
      ],
    };
    const estado = mergeOperacoesPorOrigem(inicial, 'consolidar', [parseada({ id: 'con-new' })], [], AGORA);
    const ids = estado.operacoes.map((o) => o.id).sort();
    expect(ids).toEqual(['con-new', 'tri-pend']);
  });

  it('mantém metadados de colagem de outras origens', () => {
    const inicial: EstadoAuditoria = {
      schema_version: 1,
      operacoes: [],
      ultima_colagem_por_origem: { triagem: { em: '2026-01-01T00:00:00.000Z', erros: ['x'] } },
    };
    const estado = mergeOperacoesPorOrigem(inicial, 'consolidar', [], ['e1'], AGORA);
    expect(estado.ultima_colagem_por_origem?.triagem).toEqual({ em: '2026-01-01T00:00:00.000Z', erros: ['x'] });
    expect(estado.ultima_colagem_por_origem?.consolidar).toEqual({ em: AGORA, erros: ['e1'] });
  });
});
