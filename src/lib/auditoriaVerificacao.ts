import type { OperacaoAuditoria } from '../data/auditoria';

/** Transição sem efeitos no dossiê: altera somente o status da sinalização. */
export function concluirVerificacao(op: OperacaoAuditoria): OperacaoAuditoria {
  if (op.tipo !== 'sinalizar') {
    throw new Error('Somente operações de verificação manual podem ser concluídas.');
  }
  return { ...op, status: 'verificada' };
}
