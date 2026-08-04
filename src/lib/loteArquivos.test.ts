import { describe, it, expect } from 'vitest';
import { dividirEmLotes, nomeParteComprovantes, LIMITE_TAMANHO_ARQUIVO_BYTES } from './loteArquivos';

type Doc = { nome: string; bytes: number };
const tamanho = (d: Doc) => d.bytes;

describe('dividirEmLotes', () => {
  it('mantém tudo em um lote só quando o total cabe no limite', () => {
    const docs: Doc[] = [
      { nome: 'a', bytes: 10 },
      { nome: 'b', bytes: 20 },
      { nome: 'c', bytes: 30 },
    ];
    const lotes = dividirEmLotes(docs, tamanho, 100);
    expect(lotes).toHaveLength(1);
    expect(lotes[0]).toHaveLength(3);
  });

  it('fecha o lote antes de estourar o limite e preserva a ordem', () => {
    const docs: Doc[] = [
      { nome: 'a', bytes: 40 },
      { nome: 'b', bytes: 40 },
      { nome: 'c', bytes: 40 },
      { nome: 'd', bytes: 10 },
    ];
    const lotes = dividirEmLotes(docs, tamanho, 100);

    expect(lotes.map((lote) => lote.map((d) => d.nome))).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);

    // Nenhum lote ultrapassa o limite.
    for (const lote of lotes) {
      expect(lote.reduce((s, d) => s + d.bytes, 0)).toBeLessThanOrEqual(100);
    }
  });

  it('nunca divide um documento entre dois lotes', () => {
    const docs: Doc[] = [
      { nome: 'a', bytes: 60 },
      { nome: 'b', bytes: 60 },
      { nome: 'c', bytes: 60 },
    ];
    const lotes = dividirEmLotes(docs, tamanho, 100);

    expect(lotes).toHaveLength(3);
    // Cada documento aparece exatamente uma vez, inteiro.
    const todos = lotes.flat().map((d) => d.nome);
    expect(todos).toEqual(['a', 'b', 'c']);
  });

  it('isola em lote próprio um documento maior que o limite, sem perdê-lo', () => {
    const docs: Doc[] = [
      { nome: 'pequeno', bytes: 10 },
      { nome: 'gigante', bytes: 500 },
      { nome: 'outro', bytes: 10 },
    ];
    const lotes = dividirEmLotes(docs, tamanho, 100);

    expect(lotes.map((lote) => lote.map((d) => d.nome))).toEqual([
      ['pequeno'],
      ['gigante'],
      ['outro'],
    ]);
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(dividirEmLotes([], tamanho, 100)).toEqual([]);
  });
});

describe('nomeParteComprovantes', () => {
  it('mantém o prefixo 06_ da convenção do ZIP e numera a parte', () => {
    expect(nomeParteComprovantes(1, 3)).toBe('06_Documentos_Comprobatorios_Unificados_parte-1-de-3.pdf');
    expect(nomeParteComprovantes(3, 3)).toBe('06_Documentos_Comprobatorios_Unificados_parte-3-de-3.pdf');
  });
});

describe('LIMITE_TAMANHO_ARQUIVO_BYTES', () => {
  it('corresponde a 35 MB', () => {
    expect(LIMITE_TAMANHO_ARQUIVO_BYTES).toBe(36700160);
  });
});
