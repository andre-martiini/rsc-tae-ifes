import type { Documento } from '../data/mock';

export type InstructionDocumentSlot = {
  categoria: NonNullable<Documento['categoria_instrucao']>;
  titulo: string;
  codigo?: string;
  descricao: string;
  obrigatorio: boolean;
};

export const INSTRUCTION_DOCUMENT_SLOTS: readonly InstructionDocumentSlot[] = [
  {
    categoria: 'portaria_estabilidade',
    titulo: 'Portaria de estabilidade',
    descricao: 'Ato que comprova a conclusão do estágio probatório e a estabilidade no serviço público.',
    obrigatorio: true,
  },
  {
    categoria: 'siape_dados_funcionais',
    titulo: 'Dados individuais funcionais',
    codigo: 'CDCOINDFUN',
    descricao: 'Extrato do SIAPE com os dados funcionais atuais do servidor.',
    obrigatorio: true,
  },
  {
    categoria: 'siape_posicao_carreira',
    titulo: 'Posição e progressão na carreira',
    codigo: 'CACOPOSPRO',
    descricao: 'Extrato detalhado do SIAPE com o histórico de posicionamento e progressão funcional.',
    obrigatorio: true,
  },
  {
    categoria: 'siape_cargo_confianca',
    titulo: 'Cargo de confiança e função',
    codigo: 'CACODETPFU',
    descricao: 'Extrato do SIAPE com o detalhamento de provimento de função, cargo de confiança ou equivalente.',
    obrigatorio: true,
  },
  {
    categoria: 'portaria_concessao_anterior',
    titulo: 'Portaria de concessão anterior do RSC',
    descricao: 'Documento reservado para futuras concessões. Não é obrigatório no primeiro requerimento.',
    obrigatorio: false,
  },
] as const;

export const REQUIRED_INSTRUCTION_CATEGORIES = INSTRUCTION_DOCUMENT_SLOTS
  .filter((slot) => slot.obrigatorio)
  .map((slot) => slot.categoria);

export function getInstructionDocument(
  documentos: Documento[],
  categoria: NonNullable<Documento['categoria_instrucao']>,
) {
  return documentos.find((doc) => doc.categoria_instrucao === categoria);
}
