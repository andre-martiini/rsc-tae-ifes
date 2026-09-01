export type TipoOperacao =
  | 'remover_lancamento'    // remover lançamento duplicado/redundante
  | 'reclassificar'         // mudar item_rsc_id
  | 'ajustar_periodos'      // corrigir datas
  | 'ajustar_quantidade'    // corrigir quantidade (itens manuais)
  | 'sinalizar';            // apenas sinalizar problema (sem auto-fix)

export type SeveridadeOperacao = 'alta' | 'media' | 'baixa';
export type StatusOperacao = 'pendente' | 'aprovada' | 'rejeitada' | 'verificada' | 'aplicada';

/** De qual auditoria a operação veio. */
export type OrigemAuditoria = 'consolidar' | 'triagem';

export const ORIGEM_LABEL: Record<OrigemAuditoria, string> = {
  consolidar: 'Consolidar',
  triagem: 'Dossiê Inteligente',
};

export interface OperacaoAuditoria {
  id: string;                               // uuid gerado no parse
  tipo: TipoOperacao;
  lancamento_id: string;                    // FK → Lancamento.id (validado no parse)
  severidade: SeveridadeOperacao;
  justificativa: string;
  novo_item_rsc_id?: string;                // para reclassificar
  novos_periodos?: Array<{ inicio: string; fim: string }>; // para ajustar_periodos / reclassificar (item baseado em data)
  nova_quantidade?: number;                 // para ajustar_quantidade / reclassificar (item manual)
  descricao?: string;                       // para sinalizar
  documentos_remover?: string[];            // documento_id(s) a desvincular do lançamento (comprovante que não sustenta o fato)
  status: StatusOperacao;
  origem: OrigemAuditoria;                   // de qual auditoria veio (Consolidar / Dossiê Inteligente)
  criada_em: string;                         // ISO — quando foi importada para o módulo
  aplicada_em?: string;                      // ISO — quando foi aplicada ao dossiê
}

/**
 * Operação recém-extraída da resposta da IA, antes de ser importada para o módulo.
 * A origem, a data de criação e o histórico de aplicação são carimbados no merge.
 */
export type OperacaoParseada = Omit<OperacaoAuditoria, 'origem' | 'criada_em' | 'aplicada_em'>;

/** Metadados da última colagem de resposta da IA, por origem. */
export interface ColagemOrigem {
  em: string;                                // ISO
  erros: string[];
}

export interface EstadoAuditoria {
  schema_version: 1;
  operacoes: OperacaoAuditoria[];
  ultima_colagem_por_origem?: Partial<Record<OrigemAuditoria, ColagemOrigem>>;
}
