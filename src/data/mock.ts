import { institutionConfig } from '../config/institution';

export type Inciso = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export const INSTITUTION_UNITS = institutionConfig.units as readonly string[];

export const RSC_LEVELS = [
  {
    id: 'RSC-I',
    label: 'RSC-TAE I',
    equivalencia: 'Ensino Fundamental',
    pontosMinimos: 10,
    itensMinimos: 1,
    incisosObrigatorios: null,
  },
  {
    id: 'RSC-II',
    label: 'RSC-TAE II',
    equivalencia: 'Ensino Médio',
    pontosMinimos: 20,
    itensMinimos: 2,
    incisosObrigatorios: null,
  },
  {
    id: 'RSC-III',
    label: 'RSC-TAE III',
    equivalencia: 'Graduação',
    pontosMinimos: 25,
    itensMinimos: 2,
    incisosObrigatorios: null,
  },
  {
    id: 'RSC-IV',
    label: 'RSC-TAE IV',
    equivalencia: 'Especialização',
    pontosMinimos: 30,
    itensMinimos: 3,
    incisosObrigatorios: [['II', 'IV', 'V', 'VI']] as Inciso[][],
  },
  {
    id: 'RSC-V',
    label: 'RSC-TAE V',
    equivalencia: 'Mestrado',
    pontosMinimos: 52,
    itensMinimos: 5,
    incisosObrigatorios: [['IV', 'V', 'VI']] as Inciso[][],
  },
  {
    id: 'RSC-VI',
    label: 'RSC-TAE VI',
    equivalencia: 'Doutorado',
    pontosMinimos: 75,
    itensMinimos: 7,
    incisosObrigatorios: [['VI']] as Inciso[][],
  },
] as const;

export interface Servidor {
  id: string;
  siape: string;
  nome_completo: string;
  email_institucional: string;
  instituicao?: string;
  lotacao: string;
  escolaridade_atual: string;
  nivel_classificacao?: 'A' | 'B' | 'C' | 'D' | 'E';
  cargo?: string;
  data_ingresso?: string;
}

export type ModoCalculo = 'manual' | 'auto_ano_fracao' | 'auto_mes';

export interface ItemRSC {
  id: string;
  numero: number;
  inciso: Inciso;
  descricao: string;
  unidade_medida: string;
  pontos_por_unidade: number;
  quantidade_automatica: boolean;
  modo_calculo: ModoCalculo;
  regra_aceite: string;
  documentos_comprobatorios: string;
  limite_pontos?: number;
}

export interface Documento {
  id: string;
  servidor_id: string;
  nome_arquivo: string;
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
}

export interface Lancamento {
  id: string;
  servidor_id: string;
  item_rsc_id: string;
  documento_id?: string;
  data_inicio: string;
  data_fim: string;
  quantidade_informada: number;
  justificativa_alteracao?: string;
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
}

export { rolItensRSC as mockItensRSC } from './rolItens';
