import type { Documento, Servidor } from '../data/mock';
import { isServidorInativo } from './rsc';

export type InstructionDocumentSlot = {
  categoria: NonNullable<Documento['categoria_instrucao']>;
  titulo: string;
  codigo?: string;
  descricao: string;
  obrigatorio: boolean;
};

export const INSTRUCTION_DOCUMENT_SLOTS: readonly InstructionDocumentSlot[] = [
  {
    categoria: 'diploma_certificado_escolaridade',
    titulo: 'Diploma ou certificado de conclusão',
    descricao:
      'Anexe um único PDF com o diploma, certificado ou declaração oficial de conclusão que comprove a escolaridade exigida para o RSC pretendido, no mínimo a titulação imediatamente anterior à correspondente ao incentivo financeiro solicitado.',
    obrigatorio: true,
  },
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

const DESCRICAO_ESTABILIDADE_INATIVO =
  'Servidor aposentado: a portaria de estabilidade é dispensada, porque a aposentadoria pressupõe o estágio probatório já concluído. Anexe-a apenas se tiver o ato em mãos.';

/**
 * Slots de instrução ajustados à situação funcional do servidor. O aposentado
 * costuma não ter (nem conseguir resgatar) a portaria de estabilidade, então o
 * slot deixa de ser obrigatório para ele e não trava o fechamento do dossiê.
 */
export function getInstructionDocumentSlots(
  servidor?: Pick<Servidor, 'situacao_funcional'> | null,
): readonly InstructionDocumentSlot[] {
  if (!servidor || !isServidorInativo(servidor)) return INSTRUCTION_DOCUMENT_SLOTS;

  return INSTRUCTION_DOCUMENT_SLOTS.map((slot) =>
    slot.categoria === 'portaria_estabilidade'
      ? { ...slot, obrigatorio: false, descricao: `${slot.descricao} ${DESCRICAO_ESTABILIDADE_INATIVO}` }
      : slot,
  );
}

export function getRequiredInstructionCategories(
  servidor?: Pick<Servidor, 'situacao_funcional'> | null,
): NonNullable<Documento['categoria_instrucao']>[] {
  return getInstructionDocumentSlots(servidor)
    .filter((slot) => slot.obrigatorio)
    .map((slot) => slot.categoria);
}

export function getInstructionDocument(
  documentos: Documento[],
  categoria: NonNullable<Documento['categoria_instrucao']>,
) {
  return documentos.find((doc) => doc.categoria_instrucao === categoria);
}
