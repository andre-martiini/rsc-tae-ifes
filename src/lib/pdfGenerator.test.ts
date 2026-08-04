import { describe, it, expect } from 'vitest';
import { inflateSync } from 'zlib';
import { generateMemorialDescritivo, parseInlineMarkdown } from './pdfGenerator';
import type { Servidor, Lancamento, ItemRSC, Documento } from '../data/mock';

function decompressPdfStreams(pdfBytes: Uint8Array): string[] {
  const decompressedTexts: string[] = [];
  const buffer = Buffer.from(pdfBytes);
  
  let offset = 0;
  while (true) {
    const streamStart = buffer.indexOf('stream\r\n', offset);
    const altStreamStart = buffer.indexOf('stream\n', offset);
    let start = -1;
    let streamHeaderLength = 0;

    if (streamStart !== -1 && (altStreamStart === -1 || streamStart <= altStreamStart)) {
      start = streamStart + 8;
      streamHeaderLength = 8;
    } else if (altStreamStart !== -1) {
      start = altStreamStart + 7;
      streamHeaderLength = 7;
    }

    if (start === -1) break;
    
    const end = buffer.indexOf('endstream', start);
    if (end === -1) break;
    
    let streamData = buffer.subarray(start, end);
    // Trim trailing newlines/CRs
    if (streamData[streamData.length - 1] === 10) {
      streamData = streamData.subarray(0, streamData.length - 1);
    }
    if (streamData[streamData.length - 1] === 13) {
      streamData = streamData.subarray(0, streamData.length - 1);
    }
    
    try {
      const decompressed = inflateSync(streamData);
      const decompressedStr = decompressed.toString('utf-8');
      // Decode hex strings like <5253432D544145>
      const decodedStr = decompressedStr.replace(/<([0-9a-fA-F]+)>/g, (_, hex) => {
        try {
          return Buffer.from(hex, 'hex').toString('utf-8');
        } catch {
          return _;
        }
      });
      decompressedTexts.push(decodedStr);
    } catch (e) {
      // Skip streams that aren't compressed or fail to decompress
    }
    
    offset = end + 9;
  }
  
  return decompressedTexts;
}

describe('pdfGenerator - generateMemorialDescritivo', () => {
  it('should generate a PDF containing [RSC:LANCAMENTO_ID:<id>] tags', async () => {
    const servidor: Servidor = {
      id: 's1',
      nome_completo: 'Test Servidor',
      siape: '1234567',
      data_ingresso: '2020-01-01',
      cargo: 'Professor',
      lotacao: 'Campus Test',
      escolaridade_atual: 'Doutorado',
      nivel_classificacao: 'E',
      situacao_funcional: 'Ativo',
    };

    const itensRSC: ItemRSC[] = [
      {
        id: 'item-1',
        numero: 1,
        inciso: 'I',
        descricao: 'Atividade 1',
        unidade_medida: 'Unidade',
        pontos_por_unidade: 10,
        quantidade_automatica: false,
        modo_calculo: 'manual',
      },
    ];

    const lancamentos: Lancamento[] = [
      {
        id: 'lanc-123456',
        servidor_id: 's1',
        item_rsc_id: 'item-1',
        quantidade_informada: 1,
        pontos_calculados: 10,
        status_auditoria: 'Aprovado',
        data_inicio: '2021-01-01',
        data_fim: '2021-12-31',
      },
    ];

    const documentos: Documento[] = [];

    const pdfBytes = await generateMemorialDescritivo(
      servidor,
      null,
      lancamentos,
      itensRSC,
      documentos,
      undefined,
      undefined
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    const streams = decompressPdfStreams(pdfBytes);
    const combinedText = streams.join('\n');
    
    expect(combinedText).toContain('[RSC:LANCAMENTO_ID:lanc-123456]');
    expect(combinedText).not.toContain('Telefone/E-mail');
  });

  it('emits [RSC:QUANTIDADE:...] in both tag branches and the "não remover" warning on the extract page', async () => {
    const servidor: Servidor = {
      id: 's1',
      nome_completo: 'Test Servidor',
      siape: '1234567',
      data_ingresso: '2020-01-01',
      cargo: 'Assistente',
      lotacao: 'Campus Test',
      escolaridade_atual: 'Graduação',
      nivel_classificacao: 'D',
      situacao_funcional: 'Ativo',
    };

    const itensRSC: ItemRSC[] = [
      {
        id: 'item-1',
        numero: 1,
        inciso: 'I',
        descricao: 'Atividade sem comprovante',
        unidade_medida: 'Unidade',
        pontos_por_unidade: 10,
        quantidade_automatica: false,
        modo_calculo: 'manual',
      },
      {
        id: 'item-2',
        numero: 2,
        inciso: 'II',
        descricao: 'Atividade com comprovante',
        unidade_medida: 'Unidade',
        pontos_por_unidade: 10,
        quantidade_automatica: false,
        modo_calculo: 'manual',
      },
    ];

    const documentos: Documento[] = [
      {
        id: 'doc-1',
        servidor_id: 's1',
        nome_arquivo: 'portaria.pdf',
        caminho_storage: 'doc-1',
        hash_arquivo: 'abc123hash',
      } as Documento,
    ];

    const lancamentos: Lancamento[] = [
      // Ramo autodeclaração (sem comprovantes).
      {
        id: 'lanc-auto',
        servidor_id: 's1',
        item_rsc_id: 'item-1',
        quantidade_informada: 3,
        pontos_calculados: 30,
        status_auditoria: 'Aprovado',
        data_inicio: '2021-01-01',
        data_fim: '2021-12-31',
      },
      // Ramo com comprovante físico.
      {
        id: 'lanc-doc',
        servidor_id: 's1',
        item_rsc_id: 'item-2',
        comprovantes_ids: ['doc-1'],
        quantidade_informada: 2.5,
        pontos_calculados: 25,
        status_auditoria: 'Aprovado',
        data_inicio: '2021-01-01',
        data_fim: '2021-12-31',
      },
    ];

    const pdfBytes = await generateMemorialDescritivo(
      servidor,
      null,
      lancamentos,
      itensRSC,
      documentos,
      undefined,
      { '2_doc-1': { startPage: 1, endPage: 4 } },
    );

    const combinedText = decompressPdfStreams(pdfBytes).join('\n');

    // Ambos os ramos declaram a quantidade, em pt-BR (vírgula decimal).
    expect(combinedText).toContain('[RSC:QUANTIDADE:3]');
    expect(combinedText).toContain('[RSC:QUANTIDADE:2,5]');
    // Hash do documento espelhado a partir do caderno unificado.
    expect(combinedText).toContain('[RSC:DOC_HASH:abc123hash]');
    // Redundância mínima no rodapé da última página de conteúdo + extrato.
    expect(combinedText).toContain('[RSC:TOTAL_PONTOS:55]');

    // Advertência visível contra a remoção da página do extrato. O texto é
    // desenhado palavra a palavra, então cada token é verificado isolado.
    expect(combinedText).toContain('INTEGRANTE');
    expect(combinedText).toContain('REMOVER.');
  });

  it('renders the servidor observação in the visible Memorial text, not only in the hidden tag', async () => {
    const servidor: Servidor = {
      id: 's1',
      nome_completo: 'Test Servidor',
      siape: '1234567',
      data_ingresso: '2020-01-01',
      cargo: 'Assistente',
      lotacao: 'Campus Test',
      escolaridade_atual: 'Graduação',
      nivel_classificacao: 'D',
      situacao_funcional: 'Ativo',
    };

    const itensRSC: ItemRSC[] = [
      {
        id: 'item-1',
        numero: 7,
        inciso: 'III',
        descricao: 'Participacao em comissao',
        unidade_medida: 'Unidade',
        pontos_por_unidade: 10,
        quantidade_automatica: false,
        modo_calculo: 'manual',
      },
    ];

    const lancamentos: Lancamento[] = [
      {
        id: 'lanc-obs',
        servidor_id: 's1',
        item_rsc_id: 'item-1',
        quantidade_informada: 1,
        pontos_calculados: 10,
        status_auditoria: 'Aprovado',
        data_inicio: '2021-01-01',
        data_fim: '2021-12-31',
        observacao: 'Designacao publicada no boletim interno numero 42.',
      },
    ];

    const pdfBytes = await generateMemorialDescritivo(
      servidor,
      null,
      lancamentos,
      itensRSC,
      [],
      undefined,
      undefined,
    );

    const combinedText = decompressPdfStreams(pdfBytes).join('\n');

    // Seção legível 2.1: a descrição do item e o texto da observação passam a
    // ser desenhados no corpo do PDF (token a token). Antes desta correção,
    // NENHUM dos dois aparecia fora das tags ocultas do extrato.
    expect(combinedText).toContain('Participacao');
    expect(combinedText).toContain('comissao');
    expect(combinedText).toContain('boletim');
    expect(combinedText).toContain('interno');
    // A tag oculta continua presente para o avaliador.
    expect(combinedText).toContain('[RSC:OBSERVACAO:Designacao publicada no boletim interno numero 42.]');
  });

  it('renders memorial content with basic Markdown (heading, bullets, bold) without crashing and strips literal markers from the PDF stream', async () => {
    const servidor: Servidor = {
      id: 's1',
      nome_completo: 'Test Servidor',
      siape: '1234567',
      data_ingresso: '2020-01-01',
      cargo: 'Professor',
      lotacao: 'Campus Test',
      escolaridade_atual: 'Doutorado',
      nivel_classificacao: 'E',
      situacao_funcional: 'Ativo',
    };
    const itensRSC: ItemRSC[] = [];
    const lancamentos: Lancamento[] = [];
    const documentos: Documento[] = [];

    const memorialMarkdown = [
      '## Formacao Academica',
      '',
      'Concluiu **Mestrado em Educacao** em 2020, com foco em *gestao publica*.',
      '',
      '- Item de lista um',
      '- Item de lista dois',
    ].join('\n');

    const pdfBytes = await generateMemorialDescritivo(
      servidor,
      null,
      lancamentos,
      itensRSC,
      documentos,
      { status: 'Rascunho', memorial_texto: memorialMarkdown },
      undefined,
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const streams = decompressPdfStreams(pdfBytes);
    const combinedText = streams.join('\n');

    // Words are drawn one Tj per token (see Writer.richText), so assert each
    // token individually rather than a joined phrase.
    expect(combinedText).not.toContain('**');
    expect(combinedText).toContain('Formacao');
    expect(combinedText).toContain('Academica');
    expect(combinedText).toContain('Mestrado');
    expect(combinedText).toContain('Educacao');
    expect(combinedText).toContain('Item');
    expect(combinedText).toContain('lista');
  });

  it('renders complex AI output with Unicode symbols and line breaks without generating spurious question marks (?)', async () => {
    const servidor: Servidor = {
      id: 's1',
      nome_completo: 'José da Silva',
      siape: '1234567',
      data_ingresso: '2020-01-01',
      cargo: 'Assistente em Administração',
      lotacao: 'Campus Vitória',
      escolaridade_atual: 'Mestrado',
      nivel_classificacao: 'D',
      situacao_funcional: 'Ativo',
    };

    const memorialTextWithComplexMarkdown = [
      '# Memorial Descritivo - Trajetória',
      'Desempenhei atividades com foco em eficiência… e inovação.',
      'Esta linha é a continuação do mesmo parágrafo,\ncom quebra de linha simples e traço – e aspas “especiais”.\u200B',
      '',
      '• Primeira atividade relevante',
      '◦ Segunda atividade com reticências…',
      '▪ Terceira atividade',
      '',
      '1. Item numerado um',
      '2. Item numerado dois',
    ].join('\n');

    const pdfBytes = await generateMemorialDescritivo(
      servidor,
      null,
      [],
      [],
      [],
      { status: 'Rascunho', memorial_texto: memorialTextWithComplexMarkdown },
      undefined,
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const streams = decompressPdfStreams(pdfBytes);
    const combinedText = streams.join('\n');

    // NENHUM ponto de interrogação deve ter sido gerado na conversão de texto
    // (com exceção de pontuação legítima se existisse no texto, o que não há neste caso)
    expect(combinedText).not.toContain('?');
    expect(combinedText).toContain('Desempenhei');
    expect(combinedText).toContain('especiais');
  });
});

describe('parseInlineMarkdown', () => {
  it('extracts bold spans marked with double asterisks', () => {
    const runs = parseInlineMarkdown('Isto e **negrito** no meio da frase.');
    expect(runs).toContainEqual({ text: 'negrito', bold: true, italic: false });
    expect(runs.some((r) => r.bold)).toBe(true);
  });

  it('extracts italic spans marked with single asterisk or underline', () => {
    const runsAsterisk = parseInlineMarkdown('Um *destaque* aqui.');
    expect(runsAsterisk).toContainEqual({ text: 'destaque', bold: false, italic: true });

    const runsUnderline = parseInlineMarkdown('Um _destaque_ aqui.');
    expect(runsUnderline).toContainEqual({ text: 'destaque', bold: false, italic: true });
  });

  it('leaves unmatched single markers as plain text', () => {
    const runs = parseInlineMarkdown('Preco de R$ 5 * 3 unidades = R$ 15.');
    expect(runs.every((r) => !r.bold && !r.italic)).toBe(true);
  });

  it('returns a single plain run for text without markdown', () => {
    const runs = parseInlineMarkdown('Texto simples sem formatacao.');
    expect(runs).toEqual([{ text: 'Texto simples sem formatacao.', bold: false, italic: false }]);
  });
});
