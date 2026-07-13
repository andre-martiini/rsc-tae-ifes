import { describe, it, expect } from 'vitest';
import {
  mapearUsoDocumentos,
  codigosItensDosUsos,
  normalizarTranscricao,
  chaveConteudo,
  encontrarDuplicatasPorConteudo,
  MIN_CHARS_COMPARACAO_CONTEUDO,
} from './duplicateDetection';
import type { Documento, ItemRSC, Lancamento } from '../data/mock';

const itens: ItemRSC[] = [
  {
    id: 'item-2',
    numero: 2,
    inciso: 'I',
    descricao: 'Coordenação de núcleos.',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
  },
  {
    id: 'item-32',
    numero: 8,
    inciso: 'IV',
    descricao: 'Responsável por setor.',
    unidade_medida: 'Por ano ou fração acima de seis meses',
    pontos_por_unidade: 4.5,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
  },
];

function makeLancamento(overrides: Partial<Lancamento>): Lancamento {
  return {
    id: 'lanc-1',
    servidor_id: 's1',
    item_rsc_id: 'item-2',
    data_inicio: '2020-01-01',
    data_fim: '2020-12-31',
    quantidade_informada: 1,
    pontos_calculados: 4.5,
    status_auditoria: 'Pendente',
    ...overrides,
  };
}

function makeDoc(overrides: Partial<Documento>): Documento {
  return {
    id: 'doc-1',
    servidor_id: 's1',
    nome_arquivo: 'a.pdf',
    data_upload: '2024-01-01',
    ...overrides,
  };
}

describe('mapearUsoDocumentos', () => {
  it('mapeia documentos de comprovantes_ids aos lançamentos', () => {
    const lanc = makeLancamento({ comprovantes_ids: ['doc-1', 'doc-2'] });
    const usos = mapearUsoDocumentos([lanc], itens);
    expect(usos.get('doc-1')).toHaveLength(1);
    expect(usos.get('doc-2')).toHaveLength(1);
    expect(usos.get('doc-1')![0].lancamento.id).toBe('lanc-1');
    expect(usos.get('doc-1')![0].item?.id).toBe('item-2');
    expect(usos.get('doc-3')).toBeUndefined();
  });

  it('suporta o formato legado documento_id', () => {
    const lanc = makeLancamento({ documento_id: 'doc-9', comprovantes_ids: undefined });
    const usos = mapearUsoDocumentos([lanc], itens);
    expect(usos.get('doc-9')).toHaveLength(1);
  });

  it('acumula múltiplos lançamentos para o mesmo documento', () => {
    const l1 = makeLancamento({ id: 'lanc-1', comprovantes_ids: ['doc-1'] });
    const l2 = makeLancamento({ id: 'lanc-2', item_rsc_id: 'item-32', comprovantes_ids: ['doc-1'] });
    const usos = mapearUsoDocumentos([l1, l2], itens);
    expect(usos.get('doc-1')).toHaveLength(2);
  });
});

describe('codigosItensDosUsos', () => {
  it('retorna códigos de dossiê sem repetição', () => {
    const l1 = makeLancamento({ id: 'lanc-1', comprovantes_ids: ['doc-1'] });
    const l2 = makeLancamento({ id: 'lanc-2', comprovantes_ids: ['doc-1'] });
    const l3 = makeLancamento({ id: 'lanc-3', item_rsc_id: 'item-32', comprovantes_ids: ['doc-1'] });
    const usos = mapearUsoDocumentos([l1, l2, l3], itens).get('doc-1')!;
    expect(codigosItensDosUsos(usos)).toEqual(['I-2', 'IV-8']);
  });
});

describe('normalizarTranscricao', () => {
  it('ignora caixa, acentos e espaçamento', () => {
    expect(normalizarTranscricao('  Portaria  Número 123\n\tDesignação ')).toBe(
      normalizarTranscricao('portaria numero 123 designacao'),
    );
  });
});

describe('chaveConteudo', () => {
  it('retorna null para transcrições curtas', () => {
    expect(chaveConteudo({ transcricao: 'texto curto' })).toBeNull();
    expect(chaveConteudo({ transcricao: undefined })).toBeNull();
  });

  it('retorna chave para transcrições longas', () => {
    const texto = 'A'.repeat(MIN_CHARS_COMPARACAO_CONTEUDO);
    expect(chaveConteudo({ transcricao: texto })).toBe('a'.repeat(MIN_CHARS_COMPARACAO_CONTEUDO));
  });
});

describe('encontrarDuplicatasPorConteudo', () => {
  const textoLongo = 'Portaria de designação número 123. '.repeat(10);

  it('agrupa documentos com transcrição idêntica após normalização', () => {
    const d1 = makeDoc({ id: 'doc-1', transcricao: textoLongo });
    const d2 = makeDoc({ id: 'doc-2', nome_arquivo: 'b.pdf', transcricao: textoLongo.toUpperCase() });
    const d3 = makeDoc({ id: 'doc-3', nome_arquivo: 'c.pdf', transcricao: 'Outro conteúdo completamente diferente. '.repeat(10) });

    const dups = encontrarDuplicatasPorConteudo([d1, d2, d3]);
    expect(dups.get('doc-1')?.map((d) => d.id)).toEqual(['doc-2']);
    expect(dups.get('doc-2')?.map((d) => d.id)).toEqual(['doc-1']);
    expect(dups.has('doc-3')).toBe(false);
  });

  it('não compara transcrições curtas demais', () => {
    const d1 = makeDoc({ id: 'doc-1', transcricao: 'igual' });
    const d2 = makeDoc({ id: 'doc-2', transcricao: 'igual' });
    expect(encontrarDuplicatasPorConteudo([d1, d2]).size).toBe(0);
  });
});
