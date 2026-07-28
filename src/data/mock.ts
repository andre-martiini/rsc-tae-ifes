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
  'Técnico de Nível Médio',
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
  instituicao?: string;
  lotacao: string;
  escolaridade_atual: EscolaridadeAtual | string;
  situacao_funcional?: SituacaoFuncional;
  em_estagio_probatorio?: boolean;
  nivel_classificacao?: 'A' | 'B' | 'C' | 'D' | 'E';
  cargo?: string;
  /** Data de ingresso em Instituição Federal de Ensino (ISO date string) */
  data_ingresso?: string;
  /** Data de Início do Efetivo Exercício atual — exibida no campo oficial do ANEXO IV */
  data_ingresso_ife?: string;
  /** Função ou encargo comissionado, se houver */
  funcao_encargo?: string;
  database_siape_prefix?: string;
  database_cargo?: string;
  database_classe?: string;
  database_situacao?: string;
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
    | 'documento_apoio'
    | 'instrucao_processual';
  categoria_instrucao?:
    | 'portaria_estabilidade'
    | 'diploma_certificado_escolaridade'
    | 'siape_dados_funcionais'
    | 'siape_posicao_carreira'
    | 'siape_cargo_confianca'
    | 'portaria_concessao_anterior';
  hash_arquivo?: string;
  hashes_componentes?: string[];
  arquivos_componentes?: Array<{
    nome_arquivo: string;
    hash_arquivo: string;
  }>;
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
  /** @deprecated use comprovantes_ids */
  documento_id?: string;
  /** Lista de IDs de Documento anexados a este lançamento (substitui documento_id) */
  comprovantes_ids?: string[];
  fato_gerador_id?: string;
  fato_gerador_descricao?: string;
  data_inicio: string;
  data_fim: string;
  /** Períodos individuais (ex.: uma portaria por período). data_inicio/data_fim guardam a abrangência total. */
  periodos?: Array<{ inicio: string; fim: string }>;
  quantidade_informada: number;
  justificativa_alteracao?: string;
  declaracao_nao_duplicidade?: boolean;
  declaracao_nao_ordinaria?: boolean;
  justificativa_nao_ordinaria?: string;
  pontos_calculados: number;
  status_auditoria: 'Pendente' | 'Aprovado' | 'Rejeitado';
  observacao?: string;
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
  /** Memorial narrativo exigido pelo art. 13, II e § 1º, do Decreto nº 13.048/2026. */
  memorial_texto?: string;
}

export { rolItensRSC as mockItensRSC };
