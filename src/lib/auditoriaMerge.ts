import type {
  EstadoAuditoria,
  OperacaoAuditoria,
  OperacaoParseada,
  OrigemAuditoria,
} from '../data/auditoria';

/**
 * Mescla as operações recém-extraídas de uma auditoria (Consolidar ou Dossiê
 * Inteligente) no estado persistido do módulo, seguindo a regra "substituir por
 * origem": as pendentes/aprovadas/rejeitadas/verificadas da MESMA origem são descartadas e
 * substituídas pelas novas; as já APLICADAS daquela origem (histórico) e todas
 * as operações de OUTRAS origens permanecem intactas.
 */
export function mergeOperacoesPorOrigem(
  estadoAtual: EstadoAuditoria | null,
  origem: OrigemAuditoria,
  novasOps: OperacaoParseada[],
  erros: string[],
  agora: string = new Date().toISOString(),
): EstadoAuditoria {
  const anteriores = estadoAtual?.operacoes ?? [];

  // Preserva: histórico aplicado desta origem + tudo de outras origens.
  const mantidas = anteriores.filter(
    (op) => op.origem !== origem || op.status === 'aplicada',
  );

  const novas: OperacaoAuditoria[] = novasOps.map((op) => ({
    ...op,
    status: 'pendente',
    origem,
    criada_em: agora,
  }));

  return {
    schema_version: 1,
    operacoes: [...mantidas, ...novas],
    ultima_colagem_por_origem: {
      ...(estadoAtual?.ultima_colagem_por_origem ?? {}),
      [origem]: { em: agora, erros },
    },
  };
}
