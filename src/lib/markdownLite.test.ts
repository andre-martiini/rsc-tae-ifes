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
      {
        tipo: 'lista',
        ordenada: false,
        itens: [
          { marcador: '-', texto: 'Item um' },
          { marcador: '-', texto: 'Item dois' },
        ],
      },
    ]);
  });

  it('reconhece listas ordenadas (1., 2.) e listas com marcadores gráficos (•, ◦, ▪)', () => {
    const textoBullet = '• Marcador um\n◦ Marcador dois\n▪ Marcador três';
    const blocosBullet = dividirEmBlocosMarkdown(textoBullet);
    expect(blocosBullet).toEqual([
      {
        tipo: 'lista',
        ordenada: false,
        itens: [
          { marcador: '•', texto: 'Marcador um' },
          { marcador: '◦', texto: 'Marcador dois' },
          { marcador: '▪', texto: 'Marcador três' },
        ],
      },
    ]);

    const textoOrdenado = '1. Primeiro item\n2. Segundo item';
    const blocosOrdenado = dividirEmBlocosMarkdown(textoOrdenado);
    expect(blocosOrdenado).toEqual([
      {
        tipo: 'lista',
        ordenada: true,
        itens: [
          { marcador: '1.', texto: 'Primeiro item' },
          { marcador: '2.', texto: 'Segundo item' },
        ],
      },
    ]);
  });

  it('preserva a numeração original quando itens numerados aparecem em blocos separados (títulos de seção da IA)', () => {
    const texto = [
      '1. APRESENTAÇÃO E SÍNTESE DA TRAJETÓRIA PROFISSIONAL',
      '',
      'Ingressei no Ifes em 2010.',
      '',
      '2. DESENVOLVIMENTO DA TRAJETÓRIA',
      '',
      '2.1. Liderança e Gestão de Processos (Requisito I)',
    ].join('\n');

    const blocos = dividirEmBlocosMarkdown(texto);
    expect(blocos).toEqual([
      { tipo: 'lista', ordenada: true, itens: [{ marcador: '1.', texto: 'APRESENTAÇÃO E SÍNTESE DA TRAJETÓRIA PROFISSIONAL' }] },
      { tipo: 'paragrafo', texto: 'Ingressei no Ifes em 2010.' },
      { tipo: 'lista', ordenada: true, itens: [{ marcador: '2.', texto: 'DESENVOLVIMENTO DA TRAJETÓRIA' }] },
      { tipo: 'lista', ordenada: true, itens: [{ marcador: '2.1.', texto: 'Liderança e Gestão de Processos (Requisito I)' }] },
    ]);
  });

  it('trata um bloco de várias linhas sem marcador de lista como parágrafo único contínuo', () => {
    const texto = 'Linha um\nLinha dois continua o mesmo parágrafo.';
    const blocos = dividirEmBlocosMarkdown(texto);
    expect(blocos).toEqual([{ tipo: 'paragrafo', texto: 'Linha um Linha dois continua o mesmo parágrafo.' }]);
  });

  it('funde itens de lista com marcador separados por linha em branco em uma só lista', () => {
    const texto = [
      '* **Governança:** primeiro item.',
      '',
      '* **Domínio Normativo:** segundo item.',
      '',
      '* **Inovação:** terceiro item.',
    ].join('\n');

    const blocos = dividirEmBlocosMarkdown(texto);
    expect(blocos).toEqual([
      {
        tipo: 'lista',
        ordenada: false,
        itens: [
          { marcador: '*', texto: '**Governança:** primeiro item.' },
          { marcador: '*', texto: '**Domínio Normativo:** segundo item.' },
          { marcador: '*', texto: '**Inovação:** terceiro item.' },
        ],
      },
    ]);
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
