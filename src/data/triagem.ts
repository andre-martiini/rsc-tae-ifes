export type ConfiancaSugestao = 'alta' | 'media' | 'baixa';

export type StatusSugestao =
  | 'pendente'      // aguardando revisão do usuário
  | 'confirmada'    // virou Lancamento (guarda lancamento_id)
  | 'editada'       // confirmada com alterações do usuário
  | 'descartada';   // rejeitada pelo usuário

export interface SugestaoTriagem {
  id: string;                      // uuid gerado no parse
  documentos_ids: string[];        // FKs -> Documento.id (validado no parse); múltiplos quando a IA agrupa documentos do mesmo item
  item_rsc_id: string | null;      // FK -> ItemRSC.id; null = "não classificável"
  confianca: ConfiancaSugestao;
  periodos: Array<{ inicio: string; fim: string }>; // ISO yyyy-mm-dd; pode ser vazio
  justificativa: string;           // por que a IA sugeriu esse encaixe
  observacoes?: string;            // ressalvas da IA (ex.: "documento sem assinatura visível")
  quantidade_sugerida?: number;    // para itens manuais: nº real de designações/produtos (nem sempre = nº de documentos)
  ja_contemplado?: boolean;        // a IA indicou que o fato já é coberto por lançamento existente
  status: StatusSugestao;
  lancamento_id?: string;          // preenchido ao confirmar
}

export interface EstadoTriagem {
  schema_version: 1;
  documento_ids: string[];         // documentos enviados nesta triagem
  sugestoes: SugestaoTriagem[];
  ultima_colagem_em?: string;      // ISO datetime
  erros_ultima_colagem?: string[]; // relatório do parser
}
