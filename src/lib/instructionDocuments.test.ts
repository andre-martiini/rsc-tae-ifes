import { describe, expect, it } from 'vitest';
import {
  getInstructionDocumentSlots,
  getRequiredInstructionCategories,
  INSTRUCTION_DOCUMENT_SLOTS,
  REQUIRED_INSTRUCTION_CATEGORIES,
} from './instructionDocuments';

describe('documentos de instrução do processo', () => {
  it('exige diploma ou certificado de conclusão no dossiê', () => {
    const slot = INSTRUCTION_DOCUMENT_SLOTS.find(
      (item) => item.categoria === 'diploma_certificado_escolaridade',
    );

    expect(slot?.obrigatorio).toBe(true);
    expect(REQUIRED_INSTRUCTION_CATEGORIES).toContain(
      'diploma_certificado_escolaridade',
    );
    expect(REQUIRED_INSTRUCTION_CATEGORIES).toHaveLength(5);
  });
});

describe('portaria de estabilidade conforme a situação funcional', () => {
  it('mantém a portaria obrigatória para servidor ativo', () => {
    expect(getRequiredInstructionCategories({ situacao_funcional: 'Ativo' })).toContain(
      'portaria_estabilidade',
    );
  });

  it('dispensa a portaria de estabilidade para servidor aposentado', () => {
    const categorias = getRequiredInstructionCategories({ situacao_funcional: 'Inativo' });

    expect(categorias).not.toContain('portaria_estabilidade');
    expect(categorias).toHaveLength(4);

    const slot = getInstructionDocumentSlots({ situacao_funcional: 'Inativo' }).find(
      (item) => item.categoria === 'portaria_estabilidade',
    );
    expect(slot?.obrigatorio).toBe(false);
    expect(slot?.descricao).toContain('aposentado');
  });

  it('sem servidor definido, mantém a lista padrão', () => {
    expect(getRequiredInstructionCategories()).toEqual(REQUIRED_INSTRUCTION_CATEGORIES);
  });
});
