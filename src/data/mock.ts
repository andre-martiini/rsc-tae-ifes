import { institutionConfig } from '../config/institution';
import {
  type Inciso,
  type ItemRSC,
  type ModoCalculo,
  RSC_LEVELS,
  rolItensRSC,
} from './normative/rsc-pcctae-2026';

export type { Inciso, ItemRSC, ModoCalculo };

export const INSTITUTION_UNITS = institutionConfig.units as readonly string[];
export { RSC_LEVELS };
export const ESCOLARIDADES = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental',
  'Ensino Médio',
  'Graduação',
  'Especialização',
  'Mestrado',
  'Doutorado',
] as const;

export type EscolaridadeAtual = (typeof ESCOLARIDADES)[number];

export const SITUACOES_FUNCIONAIS = ['Ativo', 'Inativo'] as const;
export type SituacaoFuncional = (typeof SITUACOES_FUNCIONAIS)[number];

export interface Servidor {
  id: string;
  siape: string;
  nome_completo: string;
  email_institucional: string;
  instituicao?: string;
  lotacao: string;
  escolaridade_atual: EscolaridadeAtual | string;
  situacao_funcional?: SituacaoFuncional;
  em_estagio_probatorio?: boolean;
  nivel_classificacao?: 'A' | 'B' | 'C' | 'D' | 'E';
  cargo?: string;
  /** Data de ingresso em Instituição Federal de Ensino (ISO date string) */
  data_ingresso?: string;
  /** Data de ingresso na IFE atual — exibida no campo oficial do ANEXO IV */
  data_ingresso_ife?: string;
  /** Função ou encargo comissionado, se houver */
  funcao_encargo?: string;
  /** Telefone de contato do servidor */
  telefone?: string;
}

export interface Documento {
  id: string;
  servidor_id: string;
  nome_arquivo: string;
  tipo_documento?:
    | 'comprobatorio_principal'
    | 'complementar'
    | 'autodeclaracao'
    | 'referencia_institucional'
    | 'evidencia_vinculada'
    | 'documento_apoio';
  hash_arquivo?: string;
  caminho_storage?: string;
  mime_type?: string;
  tamanho_bytes?: number;
  data_upload: string;
  gedoc_links?: string[];
  autodeclaracao?: boolean;
  convertido_para_pdf?: boolean;
  arquivo_origem_nome?: string;
  arquivo_origem_mime?: string;
  transcricao?: string;
}

export interface Lancamento {
  id: string;
  servidor_id: string;
  item_rsc_id: string;
  documento_id?: string;
  fato_gerador_id?: string;
  fato_gerador_descricao?: string;
  data_inicio: string;
  data_fim: string;
  quantidade_informada: number;
  justificativa_alteracao?: string;
  declaracao_nao_duplicidade?: boolean;
  declaracao_nao_ordinaria?: boolean;
  justificativa_nao_ordinaria?: string;
  pontos_calculados: number;
  status_auditoria: 'Pendente' | 'Aprovado' | 'Rejeitado';
}

export interface ProcessoRSC {
  status: 'Rascunho' | 'Em triagem';
  nivel_pleiteado_id?: string;
  pontos_total_submissao?: number;
  itens_distintos_submissao?: number;
  submitted_at?: string;
  saldo_concessao_anterior?: number;
  numero_processo_anterior?: string;
  data_ultima_concessao?: string;
}

export { rolItensRSC as mockItensRSC };
