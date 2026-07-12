import { describe, it, expect } from 'vitest';
import { parseResultadoAuditoria, type ContextoParseAuditoria } from './auditoriaParser';
import type { ItemRSC, Lancamento } from '../data/mock';

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

const lancamentos: Lancamento[] = [
  {
    id: 'lanc-001',
    servidor_id: 'srv-1',
    item_rsc_id: 'item-2',
    comprovantes_ids: ['doc-001'],
    data_inicio: '2020-01-01',
    data_fim: '2020-12-31',
    quantidade_informada: 1,
    pontos_calculados: 4.5,
    status_auditoria: 'Pendente',
  },
  {
    id: 'lanc-002',
    servidor_id: 'srv-1',
    item_rsc_id: 'item-32',
    comprovantes_ids: ['doc-002'],
    data_inicio: '2019-03-01',
    data_fim: '2021-06-30',
    quantidade_informada: 1,
    pontos_calculados: 9,
    status_auditoria: 'Pendente',
  },
];

function makeCtx(): ContextoParseAuditoria {
  return { lancamentos, itensRSC: itens };
}

describe('parseResultadoAuditoria — importação de resposta válida', () => {
  it('importa operações válidas', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'sinalizar',
          severidade: 'baixa',
          justificativa: 'Documento sem assinatura.',
          descricao: 'Verificar manualmente.',
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.operacoes).toHaveLength(1);
    expect(resultado.operacoes[0].tipo).toBe('sinalizar');
  });
});

describe('parseResultadoAuditoria — JSON dentro de cerca Markdown', () => {
  it('extrai JSON de cerca ```json', () => {
    const json = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'sinalizar',
          severidade: 'baixa',
          justificativa: 'teste',
          descricao: 'desc',
        },
      ],
    });
    const resposta = '```json\n' + json + '\n```';
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(1);
  });
});

describe('parseResultadoAuditoria — texto antes e depois do JSON', () => {
  it('encontra JSON no meio de texto', () => {
    const json = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'sinalizar',
          severidade: 'baixa',
          justificativa: 'teste',
          descricao: 'desc',
        },
      ],
    });
    const resposta = `Análise de auditoria:\n${json}\nFim.`;
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(1);
  });
});

describe('parseResultadoAuditoria — tipos de operação', () => {
  it('processa ajustar_quantidade', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'ajustar_quantidade',
          severidade: 'media',
          justificativa: 'Quantidade incorreta.',
          nova_quantidade: 3,
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(1);
    expect(resultado.operacoes[0].nova_quantidade).toBe(3);
  });

  it('processa ajustar_periodos', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-002',
          tipo: 'ajustar_periodos',
          severidade: 'alta',
          justificativa: 'Período incorreto.',
          novos_periodos: [{ inicio: '2019-03-01', fim: '2021-06-30' }],
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(1);
    expect(resultado.operacoes[0].novos_periodos).toEqual([
      { inicio: '2019-03-01', fim: '2021-06-30' },
    ]);
  });

  it('processa reclassificar', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'reclassificar',
          severidade: 'media',
          justificativa: 'Item errado.',
          novo_item_rsc_id: 'item-32',
          novos_periodos: [{ inicio: '2020-01-01', fim: '2020-12-31' }],
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(1);
    expect(resultado.operacoes[0].novo_item_rsc_id).toBe('item-32');
  });

  it('processa remover_lancamento', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'remover_lancamento',
          severidade: 'alta',
          justificativa: 'Duplicado.',
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(1);
  });
});

describe('parseResultadoAuditoria — rejeição de identificadores desconhecidos', () => {
  it('ignora operação com lancamento_id inexistente', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-fantasma',
          tipo: 'sinalizar',
          severidade: 'baixa',
          justificativa: 'teste',
          descricao: 'desc',
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
  });

  it('ignora operação com tipo inválido', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'tipo_inexistente',
          severidade: 'baixa',
          justificativa: 'teste',
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
  });
});

describe('parseResultadoAuditoria — casos especiais', () => {
  it('retorna erro quando não há JSON', () => {
    const resultado = parseResultadoAuditoria('não é JSON', makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.erros.length).toBeGreaterThan(0);
  });

  it('rejeita ajustar_periodos para item manual', () => {
    // lanc-001 é item-2 (manual)
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'ajustar_periodos',
          severidade: 'alta',
          justificativa: 'teste',
          novos_periodos: [{ inicio: '2020-01-01', fim: '2020-12-31' }],
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
  });
});

// ======================== FASE 4.4 — VALIDAÇÃO DE VERSÃO ========================

describe('parseResultadoAuditoria — validação de schema_version', () => {
  it('bloqueia resposta sem schema_version', () => {
    const resposta = JSON.stringify({
      operacoes: [
        { lancamento_id: 'lanc-001', tipo: 'sinalizar', severidade: 'baixa', justificativa: 'teste', descricao: 'desc' },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.erros.length).toBeGreaterThan(0);
    expect(resultado.erros[0]).toContain('schema_version');
  });

  it('bloqueia resposta com schema_version desconhecida', () => {
    const resposta = JSON.stringify({
      schema_version: 99,
      operacoes: [
        { lancamento_id: 'lanc-001', tipo: 'sinalizar', severidade: 'baixa', justificativa: 'teste', descricao: 'desc' },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.erros.length).toBeGreaterThan(0);
    expect(resultado.erros[0]).toContain('não suportada');
  });
});

// ======================== FASE 6.1 — VALIDAÇÃO DE DATAS REAIS ========================

describe('parseResultadoAuditoria — validação de datas reais', () => {
  it('rejeita data inexistente no calendário (2020-02-30)', () => {
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-002',
          tipo: 'ajustar_periodos',
          severidade: 'alta',
          justificativa: 'teste',
          novos_periodos: [{ inicio: '2020-02-30', fim: '2020-12-31' }],
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
  });
});

// ======================== FASE 11.1 — RECLASSIFICAÇÃO ATÔMICA ========================

describe('parseResultadoAuditoria — reclassificação atômica', () => {
  it('bloqueia reclassificar para item temporal sem novos_periodos', () => {
    // lanc-001 é item-2 (manual) → reclassificar para item-32 (auto_ano_fracao) sem periodos
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-001',
          tipo: 'reclassificar',
          severidade: 'media',
          justificativa: 'Item errado.',
          novo_item_rsc_id: 'item-32',
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
    expect(resultado.erros.some((e) => e.includes('requer novos_periodos'))).toBe(true);
  });

  it('bloqueia reclassificar para item manual sem nova_quantidade', () => {
    // lanc-002 é item-32 (auto_ano_fracao) → reclassificar para item-2 (manual) sem quantidade
    const resposta = JSON.stringify({
      schema_version: 1,
      operacoes: [
        {
          lancamento_id: 'lanc-002',
          tipo: 'reclassificar',
          severidade: 'media',
          justificativa: 'Item errado.',
          novo_item_rsc_id: 'item-2',
        },
      ],
    });
    const resultado = parseResultadoAuditoria(resposta, makeCtx());
    expect(resultado.operacoes).toHaveLength(0);
    expect(resultado.ignoradas).toBe(1);
    expect(resultado.erros.some((e) => e.includes('requer nova_quantidade'))).toBe(true);
  });
});
