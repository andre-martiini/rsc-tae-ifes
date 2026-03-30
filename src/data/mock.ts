export type Inciso = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export const CAMPI_IFES = [
  'Reitoria',
  'Campus Alegre',
  'Campus Aracruz',
  'Campus Barra de São Francisco',
  'Campus Cachoeiro de Itapemirim',
  'Campus Cariacica',
  'Campus Centro-Serrano',
  'Campus Colatina',
  'Campus Guarapari',
  'Campus Ibatiba',
  'Campus Itapina',
  'Campus Linhares',
  'Campus Montanha',
  'Campus Nova Venécia',
  'Campus Piúma',
  'Campus Santa Teresa',
  'Campus São Mateus',
  'Campus Serra',
  'Campus Viana',
  'Campus Vila Velha',
  'Campus Vitória',
] as const;

export const RSC_LEVELS = [
  {
    id: 'RSC-I',
    label: 'RSC-TAE I',
    equivalencia: 'Ensino Fundamental',
    pontosMinimos: 10,
    itensMinimos: 2,
  },
  {
    id: 'RSC-II',
    label: 'RSC-TAE II',
    equivalencia: 'Ensino Médio',
    pontosMinimos: 20,
    itensMinimos: 3,
  },
  {
    id: 'RSC-III',
    label: 'RSC-TAE III',
    equivalencia: 'Graduação',
    pontosMinimos: 25,
    itensMinimos: 4,
  },
  {
    id: 'RSC-IV',
    label: 'RSC-TAE IV',
    equivalencia: 'Especialização',
    pontosMinimos: 30,
    itensMinimos: 5,
  },
  {
    id: 'RSC-V',
    label: 'RSC-TAE V',
    equivalencia: 'Mestrado',
    pontosMinimos: 52,
    itensMinimos: 8,
  },
  {
    id: 'RSC-VI',
    label: 'RSC-TAE VI',
    equivalencia: 'Doutorado',
    pontosMinimos: 75,
    itensMinimos: 12,
  },
] as const;

export interface Servidor {
  id: string;
  siape: string;
  nome_completo: string;
  email_institucional: string;
  lotacao: string;
  escolaridade_atual: string;
  cargo?: string;
  data_ingresso?: string;
}

export interface ItemRSC {
  id: string;
  numero: number;
  inciso: Inciso;
  descricao: string;
  unidade_medida: string;
  pontos_por_unidade: number;
  quantidade_automatica: boolean;
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
}

export { rolItensRSC as mockItensRSC } from './rolItens';
