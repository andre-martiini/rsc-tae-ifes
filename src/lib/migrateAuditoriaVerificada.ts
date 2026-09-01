import type { EstadoAuditoria } from '../data/auditoria';

export interface MigracaoAuditoriaVerificadaStats {
  totalOperacoesAntes: number;
  sinalizacoesRejeitadasAntes: number;
  migradas: number;
  sinalizacoesRejeitadasDepois: number;
  sinalizacoesVerificadasDepois: number;
}

/**
 * Migração de dado idempotente: somente operações `sinalizar` gravadas com o
 * antigo estado semântico `rejeitada` passam a `verificada`.
 */
export function migrarAuditoriaVerificada(
  estado: EstadoAuditoria | null,
): { estado: EstadoAuditoria | null; stats: MigracaoAuditoriaVerificadaStats } {
  const operacoes = estado?.operacoes ?? [];
  const sinalizacoesRejeitadasAntes = operacoes.filter(
    (op) => op.tipo === 'sinalizar' && op.status === 'rejeitada',
  ).length;

  const estadoMigrado = estado && sinalizacoesRejeitadasAntes > 0
    ? {
        ...estado,
        operacoes: estado.operacoes.map((op) =>
          op.tipo === 'sinalizar' && op.status === 'rejeitada'
            ? { ...op, status: 'verificada' as const }
            : op,
        ),
      }
    : estado;

  const operacoesDepois = estadoMigrado?.operacoes ?? [];
  return {
    estado: estadoMigrado,
    stats: {
      totalOperacoesAntes: operacoes.length,
      sinalizacoesRejeitadasAntes,
      migradas: sinalizacoesRejeitadasAntes,
      sinalizacoesRejeitadasDepois: operacoesDepois.filter(
        (op) => op.tipo === 'sinalizar' && op.status === 'rejeitada',
      ).length,
      sinalizacoesVerificadasDepois: operacoesDepois.filter(
        (op) => op.tipo === 'sinalizar' && op.status === 'verificada',
      ).length,
    },
  };
}
