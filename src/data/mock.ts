export type Inciso = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

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
}

export interface Lancamento {
  id: string;
  servidor_id: string;
  item_rsc_id: string;
  documento_id: string;
  data_inicio: string;
  data_fim: string;
  quantidade_informada: number;
  justificativa_alteracao?: string;
  pontos_calculados: number;
  status_auditoria: 'Pendente' | 'Aprovado' | 'Rejeitado';
}

export interface ProcessoRSC {
  status: 'Rascunho' | 'Enviado';
  nivel_pleiteado_id?: string;
  pontos_total_submissao?: number;
  itens_distintos_submissao?: number;
  submitted_at?: string;
}

export const mockServidor: Servidor = {
  id: 'srv-001',
  siape: '1234567',
  nome_completo: 'João da Silva Sauro',
  email_institucional: 'joao.silva@ifes.edu.br',
  lotacao: 'Campus Barra de São Francisco',
  escolaridade_atual: 'Mestrado',
};

export { rolItensRSC as mockItensRSC } from './rolItens';

export const mockDocumentos: Documento[] = [
  {
    id: 'doc-1',
    servidor_id: 'srv-001',
    nome_arquivo: 'portaria_cpa_2022.pdf',
    hash_arquivo: 'sha256-placeholder-001',
    caminho_storage: 'uploads/srv-001/portaria_cpa_2022.pdf',
    mime_type: 'application/pdf',
    tamanho_bytes: 182340,
    data_upload: '2023-01-15T10:00:00Z',
  },
  {
    id: 'doc-2',
    servidor_id: 'srv-001',
    nome_arquivo: 'declaracao_extensao.pdf',
    hash_arquivo: 'sha256-placeholder-002',
    caminho_storage: 'uploads/srv-001/declaracao_extensao.pdf',
    mime_type: 'application/pdf',
    tamanho_bytes: 148220,
    data_upload: '2023-02-20T14:30:00Z',
  },
];

export const mockLancamentos: Lancamento[] = [
  {
    id: 'lanc-1',
    servidor_id: 'srv-001',
    item_rsc_id: 'item-3',
    documento_id: 'doc-1',
    data_inicio: '2022-01-01',
    data_fim: '2022-12-31',
    quantidade_informada: 12,
    pontos_calculados: 30,
    status_auditoria: 'Aprovado',
  },
];

export const mockProcessoRSC: ProcessoRSC = {
  status: 'Rascunho',
};
