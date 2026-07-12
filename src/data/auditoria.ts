export type TipoOperacao =
  | 'remover_lancamento'    // remover lançamento duplicado/redundante
  | 'reclassificar'         // mudar item_rsc_id
  | 'ajustar_periodos'      // corrigir datas
  | 'ajustar_quantidade'    // corrigir quantidade (itens manuais)
  | 'sinalizar';            // apenas sinalizar problema (sem auto-fix)

export type SeveridadeOperacao = 'alta' | 'media' | 'baixa';
export type StatusOperacao = 'pendente' | 'aprovada' | 'rejeitada';

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
  status: StatusOperacao;
}

export interface EstadoAuditoria {
  schema_version: 1;
  operacoes: OperacaoAuditoria[];
  ultima_colagem_em?: string;
  erros_ultima_colagem?: string[];
}
