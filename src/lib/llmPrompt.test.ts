import { describe, it, expect } from 'vitest';
import { generateLLMPrompt } from './llmPrompt';
import type { ItemRSC, Lancamento, Documento } from '../data/mock';

const item: ItemRSC = {
  id: 'item-3',
  numero: 3,
  inciso: 'I',
  descricao: 'Participação como membro de núcleos, representações, grupos de trabalho.',
  unidade_medida: 'Por designação',
  pontos_por_unidade: 3,
  quantidade_automatica: false,
  modo_calculo: 'manual',
};

const lancamento: Lancamento = {
  id: 'lanc-1',
  servidor_id: 'srv-1',
  item_rsc_id: 'item-3',
  comprovantes_ids: ['doc-a', 'doc-b', 'doc-c'],
  data_inicio: '2023-01-01',
  data_fim: '2023-12-31',
  quantidade_informada: 3,
  pontos_calculados: 9,
  status_auditoria: 'Pendente',
};

function doc(id: string, nome: string, transcricao: string): Documento {
  return { id, servidor_id: 'srv-1', nome_arquivo: nome, data_upload: '2024-01-01', transcricao };
}

describe('generateLLMPrompt', () => {
  it('inclui a transcrição de TODOS os documentos do lançamento', () => {
    const documentos = [
      doc('doc-a', 'portaria-original.pdf', 'CONTEUDO ORIGINAL AAA'),
      doc('doc-b', 'portaria-retificacao.pdf', 'CONTEUDO RETIFICACAO BBB'),
      doc('doc-c', 'portaria-alteracao.pdf', 'CONTEUDO ALTERACAO CCC'),
    ];
    const prompt = generateLLMPrompt({ item, lancamento, documentos });

    // Todos os nomes e transcrições devem aparecer
    expect(prompt).toContain('portaria-original.pdf');
    expect(prompt).toContain('portaria-retificacao.pdf');
    expect(prompt).toContain('portaria-alteracao.pdf');
    expect(prompt).toContain('CONTEUDO ORIGINAL AAA');
    expect(prompt).toContain('CONTEUDO RETIFICACAO BBB');
    expect(prompt).toContain('CONTEUDO ALTERACAO CCC');
    expect(prompt).toContain('DOCUMENTO 1 DE 3');
    expect(prompt).toContain('DOCUMENTO 3 DE 3');
  });

  it('mantém o formato de documento único quando há apenas um', () => {
    const prompt = generateLLMPrompt({
      item,
      lancamento,
      documentos: [doc('doc-a', 'unico.pdf', 'TEXTO UNICO')],
    });
    expect(prompt).toContain('unico.pdf');
    expect(prompt).toContain('TEXTO UNICO');
  });

  it('aceita o parâmetro singular `documento` por compatibilidade', () => {
    const prompt = generateLLMPrompt({
      item,
      lancamento,
      documento: doc('doc-a', 'legado.pdf', 'TEXTO LEGADO'),
    });
    expect(prompt).toContain('legado.pdf');
    expect(prompt).toContain('TEXTO LEGADO');
  });

  it('funciona sem documentos (fallback para arquivo anexo)', () => {
    const prompt = generateLLMPrompt({ item, lancamento, documentos: [] });
    expect(prompt).toContain('Nenhum documento anexado');
  });
});
