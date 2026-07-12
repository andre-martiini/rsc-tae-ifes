import { describe, it, expect } from 'vitest';
import { parseResultadoTriagem, type ContextoParse } from './triagemParser';
import type { Documento, ItemRSC } from '../data/mock';

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

const docs: Documento[] = [
  { id: 'doc-001', servidor_id: 's1', nome_arquivo: 'a.pdf', data_upload: '2024-01-01', transcricao: 'texto' },
  { id: 'doc-002', servidor_id: 's1', nome_arquivo: 'b.pdf', data_upload: '2024-01-01', transcricao: 'texto' },
  { id: 'doc-003', servidor_id: 's1', nome_arquivo: 'c.pdf', data_upload: '2024-01-01', transcricao: 'texto' },
];

function makeCtx(): ContextoParse {
  return { documentos: docs, itensRSC: itens };
}

describe('parseResultadoTriagem — importação de resposta válida', () => {
  it('importa resposta JSON simples', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      sugestoes: [
        {
          documentos_ids: ['doc-001'],
          item_rsc_id: 'item-2',
          confianca: 'alta',
          periodos: [],
          justificativa: 'Portaria de designação.',
          quantidade_sugerida: 1,
        },
      ],
      nao_analisaveis: [],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.sugestoes).toHaveLength(1);
    expect(resultado.sugestoes[0].item_rsc_id).toBe('item-2');
    expect(resultado.sugestoes[0].documentos_ids).toEqual(['doc-001']);
  });
});

describe('parseResultadoTriagem — JSON dentro de cerca Markdown', () => {
  it('extrai JSON de cerca ```json', () => {
    const resposta = '```json\n' + JSON.stringify({
      schema_version: 1,
      sugestoes: [
        {
          documentos_ids: ['doc-001'],
          item_rsc_id: 'item-2',
          confianca: 'alta',
          periodos: [],
          justificativa: 'teste',
        },
      ],
    }) + '\n```';
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(1);
  });
});

describe('parseResultadoTriagem — texto antes e depois do JSON', () => {
  it('encontra JSON no meio de texto', () => {
    const json = JSON.stringify({
      schema_version: 1,
      sugestoes: [
        {
          documentos_ids: ['doc-001'],
          item_rsc_id: 'item-2',
          confianca: 'alta',
          periodos: [],
          justificativa: 'teste',
        },
      ],
    });
    const resposta = `Aqui está a análise:\n${json}\nEspero que ajude.`;
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(1);
  });
});

describe('parseResultadoTriagem — agrupamento de sugestões do mesmo item', () => {
  it('mescla duas sugestões do mesmo item em uma', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      sugestoes: [
        {
          documentos_ids: ['doc-001'],
          item_rsc_id: 'item-2',
          confianca: 'alta',
          periodos: [{ inicio: '2020-01-01', fim: '2020-06-30' }],
          justificativa: 'doc 1',
          quantidade_sugerida: 1,
        },
        {
          documentos_ids: ['doc-002'],
          item_rsc_id: 'item-2',
          confianca: 'alta',
          periodos: [{ inicio: '2020-07-01', fim: '2020-12-31' }],
          justificativa: 'doc 2',
          quantidade_sugerida: 1,
        },
      ],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(1);
    expect(resultado.sugestoes[0].documentos_ids).toEqual(['doc-001', 'doc-002']);
    expect(resultado.sugestoes[0].periodos).toHaveLength(2);
    expect(resultado.sugestoes[0].quantidade_sugerida).toBe(2);
  });
});

describe('parseResultadoTriagem — rejeição de identificadores desconhecidos', () => {
  it('ignora sugestão com item_rsc_id inexistente', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      sugestoes: [
        {
          documentos_ids: ['doc-001'],
          item_rsc_id: 'item-inexistente',
          confianca: 'alta',
          periodos: [],
          justificativa: 'teste',
        },
      ],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
    expect(resultado.erros.length).toBeGreaterThan(0);
  });

  it('ignora sugestão com documento_id inexistente', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      sugestoes: [
        {
          documentos_ids: ['doc-fantasma'],
          item_rsc_id: 'item-2',
          confianca: 'alta',
          periodos: [],
          justificativa: 'teste',
        },
      ],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
  });
});

describe('parseResultadoTriagem — casos especiais', () => {
  it('retorna erro quando não há JSON no texto', () => {
    const resultado = parseResultadoTriagem('isto não é JSON', makeCtx());
    expect(resultado.sugestoes).toHaveLength(0);
    expect(resultado.erros.length).toBeGreaterThan(0);
  });

  it('processa nao_analisaveis', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      sugestoes: [],
      nao_analisaveis: [
        { documento_id: 'doc-003', motivo: 'transcrição ilegível' },
      ],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(1);
    expect(resultado.sugestoes[0].item_rsc_id).toBeNull();
    expect(resultado.sugestoes[0].documentos_ids).toEqual(['doc-003']);
  });
});

// ======================== FASE 4.4 — VALIDAÇÃO DE VERSÃO ========================

describe('parseResultadoTriagem — validação de schema_version', () => {
  it('bloqueia resposta sem schema_version', () => {
    const resposta = JSON.stringify({
      sugestoes: [
        { documentos_ids: ['doc-001'], item_rsc_id: 'item-2', confianca: 'alta', periodos: [], justificativa: 'teste' },
      ],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(0);
    expect(resultado.erros.length).toBeGreaterThan(0);
    expect(resultado.erros[0]).toContain('schema_version');
  });

  it('bloqueia resposta com schema_version desconhecida', () => {
    const resposta = JSON.stringify({
      schema_version: 99,
      sugestoes: [
        { documentos_ids: ['doc-001'], item_rsc_id: 'item-2', confianca: 'alta', periodos: [], justificativa: 'teste' },
      ],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(0);
    expect(resultado.erros.length).toBeGreaterThan(0);
    expect(resultado.erros[0]).toContain('não suportada');
  });
});

// ======================== FASE 6.1 — VALIDAÇÃO DE DATAS REAIS ========================

describe('parseResultadoTriagem — validação de datas reais', () => {
  it('rejeita data inexistente no calendário (2020-02-30)', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      sugestoes: [
        {
          documentos_ids: ['doc-001'],
          item_rsc_id: 'item-2',
          confianca: 'alta',
          periodos: [{ inicio: '2020-02-30', fim: '2020-12-31' }],
          justificativa: 'teste',
        },
      ],
    });
    const resultado = parseResultadoTriagem(resposta, makeCtx());
    expect(resultado.sugestoes).toHaveLength(1);
    // O período inválido deve ter sido removido
    expect(resultado.sugestoes[0].periodos).toHaveLength(0);
    expect(resultado.sugestoes[0].observacoes).toContain('inválidas');
  });
});
