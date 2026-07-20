import { describe, it, expect } from 'vitest';
import { dividirEmBlocosMarkdown, parseInlineMarkdown } from './markdownLite';

describe('dividirEmBlocosMarkdown', () => {
  it('separa parágrafo, cabeçalho e lista em blocos distintos', () => {
    const texto = [
      '## Formação Acadêmica',
      '',
      'Concluiu **Mestrado** em 2020.',
      '',
      '- Item um',
      '- Item dois',
    ].join('\n');

    const blocos = dividirEmBlocosMarkdown(texto);
    expect(blocos).toEqual([
      { tipo: 'heading', nivel: 2, texto: 'Formação Acadêmica' },
      { tipo: 'paragrafo', texto: 'Concluiu **Mestrado** em 2020.' },
      { tipo: 'lista', itens: ['Item um', 'Item dois'] },
    ]);
  });

  it('trata um bloco de várias linhas sem marcador de lista como parágrafo', () => {
    const texto = 'Linha um\nLinha dois continua o mesmo parágrafo.';
    const blocos = dividirEmBlocosMarkdown(texto);
    expect(blocos).toEqual([{ tipo: 'paragrafo', texto }]);
  });

  it('ignora blocos vazios entre múltiplas quebras de linha', () => {
    const blocos = dividirEmBlocosMarkdown('Um\n\n\n\nDois');
    expect(blocos).toEqual([
      { tipo: 'paragrafo', texto: 'Um' },
      { tipo: 'paragrafo', texto: 'Dois' },
    ]);
  });
});

describe('parseInlineMarkdown (via markdownLite)', () => {
  it('reexporta o mesmo comportamento usado pelo PDF', () => {
    const runs = parseInlineMarkdown('**negrito** e *itálico*');
    expect(runs).toContainEqual({ text: 'negrito', bold: true, italic: false });
    expect(runs).toContainEqual({ text: 'itálico', bold: false, italic: true });
  });
});
