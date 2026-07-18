import { describe, it, expect } from 'vitest';
import { inflateSync } from 'zlib';
import { generateMemorialDescritivo } from './pdfGenerator';
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
      email_institucional: 'test@example.com',
      telefone: '12345',
      cargo: 'Professor',
      lotacao: 'Campus Test',
      escolaridade: 'Doutorado',
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
  });
});
