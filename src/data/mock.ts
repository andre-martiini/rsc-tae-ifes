export type Inciso = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

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
  regra_aceite: string;
  limite_pontos?: number;
}

export interface Documento {
  id: string;
  servidor_id: string;
  nome_arquivo: string;
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

export const mockServidor: Servidor = {
  id: 'srv-001',
  siape: '1234567',
  nome_completo: 'João da Silva Sauro',
  email_institucional: 'joao.silva@ifes.edu.br',
  lotacao: 'Campus Barra de São Francisco',
  escolaridade_atual: 'Mestrado',
};

export const mockItensRSC: ItemRSC[] = [
  {
    id: 'item-1',
    numero: 1,
    inciso: 'I',
    descricao: 'Participação em Comissão Própria de Avaliação (CPA)',
    unidade_medida: 'mês',
    pontos_por_unidade: 0.5,
    regra_aceite: 'Portaria de designação contendo o período de atuação. O período não pode sobrepor outra comissão do mesmo tipo.',
    limite_pontos: 10,
  },
  {
    id: 'item-2',
    numero: 2,
    inciso: 'I',
    descricao: 'Participação em Colegiado de Curso',
    unidade_medida: 'mês',
    pontos_por_unidade: 0.3,
    regra_aceite: 'Ata de posse ou portaria de designação.',
    limite_pontos: 6,
  },
  {
    id: 'item-3',
    numero: 3,
    inciso: 'II',
    descricao: 'Coordenação de Projeto de Extensão',
    unidade_medida: 'projeto',
    pontos_por_unidade: 5,
    regra_aceite: 'Declaração da Pró-Reitoria de Extensão atestando a conclusão do projeto.',
    limite_pontos: 20,
  },
  {
    id: 'item-4',
    numero: 4,
    inciso: 'IV',
    descricao: 'Atuação na área de gestão de contratos',
    unidade_medida: 'mês',
    pontos_por_unidade: 1,
    regra_aceite: 'Portaria de designação como fiscal ou gestor de contrato. Cada mês completo equivale a 1 ponto.',
    limite_pontos: 30,
  },
  {
    id: 'item-5',
    numero: 5,
    inciso: 'V',
    descricao: 'Exercício de Cargo de Direção (CD)',
    unidade_medida: 'mês',
    pontos_por_unidade: 2,
    regra_aceite: 'Portaria de nomeação publicada no DOU.',
    limite_pontos: 40,
  },
  {
    id: 'item-6',
    numero: 6,
    inciso: 'VI',
    descricao: 'Publicação de Artigo em Periódico Qualis A',
    unidade_medida: 'artigo',
    pontos_por_unidade: 10,
    regra_aceite: 'Cópia do artigo publicado com o DOI ou link da revista.',
  },
];

export const mockDocumentos: Documento[] = [
  {
    id: 'doc-1',
    servidor_id: 'srv-001',
    nome_arquivo: 'portaria_cpa_2022.pdf',
    data_upload: '2023-01-15T10:00:00Z',
  },
  {
    id: 'doc-2',
    servidor_id: 'srv-001',
    nome_arquivo: 'declaracao_extensao.pdf',
    data_upload: '2023-02-20T14:30:00Z',
  }
];

export const mockLancamentos: Lancamento[] = [
  {
    id: 'lanc-1',
    servidor_id: 'srv-001',
    item_rsc_id: 'item-1',
    documento_id: 'doc-1',
    data_inicio: '2022-01-01',
    data_fim: '2022-12-31',
    quantidade_informada: 12,
    pontos_calculados: 6,
    status_auditoria: 'Aprovado',
  }
];
