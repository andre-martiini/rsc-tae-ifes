import { describe, expect, it } from 'vitest';
import {
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
