import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb, degrees, PDFPage } from 'pdf-lib';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { getDocumentBlob } from './documentStorage';
import {
  buildDossierDocumentOrder,
  compareItemsByDossierOrder,
  getLancamentoDocumentIds,
  sortDocumentsByDossierOrder,
  sortLancamentosByDossierOrder,
} from './documentOrdering';
import { sumPointValues } from './points';
import { getDistinctRscCriterionCount } from './rsc';
import { getInstructionDocument } from './instructionDocuments';
import { sanitizeForTag } from './utils';
import { dividirEmLotes, nomeParteComprovantes, LIMITE_TAMANHO_ARQUIVO_BYTES } from './loteArquivos';
import {
  generateMemorialDescritivo,
  generateRequerimentoFormal,
  type ComprovacaoItemResumo,
  type NivelRsc,
} from './pdfGenerator';

export type { NivelRsc };

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildComprovacaoGroups(
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
  documentos: Documento[],
): ComprovacaoItemResumo[] {
  const docsById = new Map(documentos.map((doc) => [doc.id, doc]));
  const documentOrder = buildDossierDocumentOrder({ lancamentos, itensRSC });
  const sortedLancamentos = sortLancamentosByDossierOrder(lancamentos, itensRSC);
  const grouped = new Map<string, Lancamento[]>();

  sortedLancamentos.forEach((entry) => {
    const current = grouped.get(entry.item_rsc_id) ?? [];
    current.push(entry);
    grouped.set(entry.item_rsc_id, current);
  });

  return Array.from(grouped.entries())
    .map(([itemId, itemLancamentos]) => {
      const item = itensRSC.find((candidate) => candidate.id === itemId);
      if (!item) return null;

      const documentosDoItem = sortDocumentsByDossierOrder(Array.from(
        new Map(
          itemLancamentos
            .flatMap((entry) => {
              const ids = entry.comprovantes_ids ?? (entry.documento_id ? [entry.documento_id] : []);
              return ids.map((id) => docsById.get(id));
            })
            .filter((doc): doc is Documento => !!doc)
            .map((doc) => [doc.id, doc]),
        ).values(),
      ), documentOrder);

      return {
        item,
        lancamentos: itemLancamentos,
        documentos: documentosDoItem,
      };
    })
    .filter((group): group is ComprovacaoItemResumo => !!group)
    .sort((a, b) => compareItemsByDossierOrder(a.item, b.item));
}

function drawTagOnPage(
  page: PDFPage,
  text: string,
  font: any,
  size: number,
  color: any,
  yOffsetVisual: number,
) {
  const { width, height } = page.getSize();
  const rotation = page.getRotation().angle || 0;
  const xOffsetVisual = 30;

  let x = xOffsetVisual;
  let y = yOffsetVisual;

  if (rotation === 90) {
    x = width - yOffsetVisual;
    y = xOffsetVisual;
  } else if (rotation === 180) {
    x = width - xOffsetVisual;
    y = height - yOffsetVisual;
  } else if (rotation === 270) {
    x = yOffsetVisual;
    y = height - xOffsetVisual;
  }

  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
    rotate: degrees(rotation),
  });
}

/**
 * Desenha uma página de capa para um registro SEM arquivo físico (link
 * institucional que não pôde ser baixado/anexado automaticamente, ou
 * autodeclaração). Sem esta página, o PDF unificado simplesmente pulava
 * esses registros — a Memorial ficava com PAGINA_INICIO/FIM = 0 e o
 * avaliador não tinha nenhuma evidência visível no dossiê, mesmo quando o
 * servidor havia informado links reais na hora de lançar o item.
 */
function drawReferenceCoverPage(
  pdfDoc: PDFDocument,
  fonts: { body: any; bold: any; mono: any },
  params: {
    itemNumero: number;
    inciso: string;
    doc: Documento;
    observacoes: string[];
  },
): PDFPage {
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 56;
  let y = height - margin;

  const isAutodeclaracao = !!params.doc.autodeclaracao;
  const titulo = isAutodeclaracao
    ? 'REGISTRO POR AUTODECLARAÇÃO (SEM ARQUIVO FÍSICO ANEXADO)'
    : 'REFERÊNCIA INSTITUCIONAL (SEM ARQUIVO FÍSICO ANEXADO)';

  page.drawText(titulo, { x: margin, y, size: 12, font: fonts.bold, color: rgb(0.7, 0.35, 0) });
  y -= 22;
  page.drawText(`Inciso ${params.inciso} — Item ${params.itemNumero}`, {
    x: margin,
    y,
    size: 10,
    font: fonts.bold,
  });
  y -= 20;

  page.drawText(`Registro: ${params.doc.nome_arquivo}`, { x: margin, y, size: 9, font: fonts.body });
  y -= 20;

  if (params.doc.gedoc_links && params.doc.gedoc_links.length > 0) {
    page.drawText('Links informados pelo servidor (não baixados/anexados automaticamente):', {
      x: margin,
      y,
      size: 9,
      font: fonts.bold,
    });
    y -= 16;
    for (const link of params.doc.gedoc_links) {
      page.drawText(`• ${link}`, { x: margin + 10, y, size: 8.5, font: fonts.mono, color: rgb(0.15, 0.15, 0.6) });
      y -= 14;
    }
  } else if (isAutodeclaracao) {
    page.drawText('Fato declarado pelo servidor sem documento comprobatório anexado.', {
      x: margin,
      y,
      size: 9,
      font: fonts.body,
    });
    y -= 16;
  }

  if (params.observacoes.length > 0) {
    y -= 8;
    page.drawText('Observações do servidor sobre este registro:', { x: margin, y, size: 9, font: fonts.bold });
    y -= 16;
    for (const obs of params.observacoes) {
      const linhas = wrapText(obs, 90);
      for (const linha of linhas) {
        page.drawText(linha, { x: margin + 10, y, size: 8.5, font: fonts.body, color: rgb(0.25, 0.25, 0.25) });
        y -= 13;
      }
      y -= 4;
    }
  }

  y -= 12;
  const avisoLinhas = wrapText(
    'Este registro não possui arquivo digital verificável anexado ao dossiê. A comprovação do fato declarado ' +
      'depende da verificação do(s) link(s) acima pela Comissão (CRSC), ou de diligência para complementação ' +
      'documental junto ao servidor.',
    88,
  );
  for (const linha of avisoLinhas) {
    page.drawText(linha, { x: margin, y, size: 8.5, font: fonts.body, color: rgb(0.5, 0.2, 0.2) });
    y -= 13;
  }

  return page;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function mergePdfDocumentSet(
  documents: Documento[],
  docTypeTag?: string,
): Promise<Uint8Array | null> {
  const merged = await PDFDocument.create();
  const tagFont = docTypeTag ? await merged.embedFont(StandardFonts.Courier) : undefined;

  for (const document of documents) {
    if (!document.caminho_storage) continue;
    const blob = await getDocumentBlob(document.id);
    if (!blob) continue;

    try {
      const source = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => {
        merged.addPage(page);
        if (docTypeTag && tagFont) {
          drawTagOnPage(
            page,
            `[RSC:DOC_TIPO:${docTypeTag}]`,
            tagFont,
            8,
            rgb(0.6, 0.6, 0.6),
            30,
          );
        }
      });
    } catch (error) {
      console.error(`Erro ao incluir o documento de instrução ${document.nome_arquivo}:`, error);
    }
  }

  if (merged.getPageCount() === 0) return null;
  return merged.save();
}

/** Uma parte (arquivo) do caderno de comprovantes exportado. */
export interface ParteComprovantes {
  arquivo: string;
  /** Primeira página GLOBAL do caderno contida neste arquivo (base 1). */
  paginaGlobalInicio: number;
  /** Última página GLOBAL do caderno contida neste arquivo (base 1). */
  paginaGlobalFim: number;
  bytes: number;
}

/** Resultado da exportação do caderno de comprovantes, para aviso na UI. */
export interface ComprovantesExportados {
  partes: ParteComprovantes[];
  /** `true` quando o caderno precisou ser dividido por causa do limite de tamanho. */
  dividido: boolean;
  /** `true` quando alguma parte segue acima do limite (documento único grande demais). */
  excedeLimiteMesmoDividido: boolean;
}

export async function exportPacoteRSC(params: {
  servidor: Servidor;
  nivelElegivel: NivelRsc | null;
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
  processo: ProcessoRSC;
}): Promise<ComprovantesExportados> {
  const { servidor, nivelElegivel, lancamentos, itensRSC, documentos, processo } = params;

  const zip = new JSZip();
  const groups = buildComprovacaoGroups(lancamentos, itensRSC, documentos);
  const totalPontos = sumPointValues(lancamentos.map((lancamento) => lancamento.pontos_calculados));
  const itensDistintos = getDistinctRscCriterionCount(lancamentos, itensRSC);

  // 1. Criar o PDF unificado e rastrear intervalos de páginas para cada documento em cada item
  const unifiedPdf = await PDFDocument.create();
  const courierFont = await unifiedPdf.embedFont(StandardFonts.Courier);
  const helveticaFont = await unifiedPdf.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await unifiedPdf.embedFont(StandardFonts.HelveticaBold);
  let currentPageIndex = 0;
  const documentPageRanges: Record<string, { startPage: number; endPage: number }> = {};

  // Segmentos indivisíveis do caderno unificado, na ordem em que as páginas
  // entram nele. Alimentam a divisão em partes quando o PDF único estoura o
  // limite de tamanho do protocolo (ver `loteArquivos.ts`). O `bytes` é o
  // tamanho do PDF de origem — pdf-lib copia os fluxos de conteúdo quase na
  // íntegra, então é uma estimativa próxima da contribuição real de cada
  // documento para o arquivo final.
  const segmentosUnificado: {
    nome: string;
    primeiraPagina: number;
    ultimaPagina: number;
    bytes: number;
  }[] = [];

  for (const group of groups) {
    const itemNumero = group.item.numero;
    // Seleciona os documentos físicos que serão mesclados
    const physicalDocs = group.documentos.filter(
      (doc) => doc.caminho_storage && !doc.nome_arquivo.endsWith('.ref') && !doc.autodeclaracao,
    );
    // Registros SEM arquivo físico (link institucional não baixado, ou
    // autodeclaração) — antes eram completamente ignorados pelo PDF
    // unificado, deixando a Memorial com PAGINA_INICIO/FIM = 0 e nenhuma
    // evidência visível para o avaliador. Agora ganham uma página de capa.
    const referenceOnlyDocs = group.documentos.filter(
      (doc) => !doc.caminho_storage || doc.nome_arquivo.endsWith('.ref') || doc.autodeclaracao,
    );

    for (const doc of referenceOnlyDocs) {
      const observacoes = group.lancamentos
        .filter((entry) => getLancamentoDocumentIds(entry).includes(doc.id))
        .map((entry) => entry.observacao)
        .filter((obs): obs is string => !!obs && obs.trim().length > 0);

      const page = drawReferenceCoverPage(
        unifiedPdf,
        { body: helveticaFont, bold: helveticaBoldFont, mono: courierFont },
        { itemNumero, inciso: group.item.inciso, doc, observacoes },
      );
      currentPageIndex++;
      const startPage = currentPageIndex;
      const endPage = currentPageIndex;
      const docHash = sanitizeForTag(doc.hash_arquivo || doc.id);
      drawTagOnPage(
        page,
        `[RSC:EVIDENCIA_ITEM:${itemNumero}] [RSC:DOC_HASH:${docHash}]`,
        courierFont,
        8,
        rgb(0.6, 0.6, 0.6),
        16,
      );
      documentPageRanges[`${itemNumero}_${doc.id}`] = { startPage, endPage };
      // Capa gerada aqui mesmo: só texto, contribuição desprezível.
      segmentosUnificado.push({ nome: doc.nome_arquivo, primeiraPagina: startPage, ultimaPagina: endPage, bytes: 4096 });
    }

    for (const doc of physicalDocs) {
      const blob = await getDocumentBlob(doc.id);
      if (!blob) continue;

      try {
        const bytes = await blob.arrayBuffer();
        const sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await unifiedPdf.copyPages(sourceDoc, sourceDoc.getPageIndices());

        if (pages.length === 0) continue;

        const startPage = currentPageIndex + 1;
        const docHash = sanitizeForTag(doc.hash_arquivo || doc.id);

        for (const page of pages) {
          unifiedPdf.addPage(page);
          currentPageIndex++;

          // Injetar tags discretas no rodapé de cada página copiada (tamanho 8pt, cinza escuro, com espaçamento e tratamento de rotação)
          drawTagOnPage(
            page,
            `[RSC:EVIDENCIA_ITEM:${itemNumero}] [RSC:DOC_HASH:${docHash}]`,
            courierFont,
            8,
            rgb(0.6, 0.6, 0.6),
            30,
          );
        }

        const endPage = currentPageIndex;
        const docRefKey = `${itemNumero}_${doc.id}`;
        documentPageRanges[docRefKey] = { startPage, endPage };
        segmentosUnificado.push({
          nome: doc.nome_arquivo,
          primeiraPagina: startPage,
          ultimaPagina: endPage,
          bytes: bytes.byteLength,
        });

      } catch (err) {
        console.error(`Erro ao mesclar o documento ${doc.nome_arquivo}:`, err);
      }
    }
  }

  // Se o PDF unificado não tiver nenhuma página, cria uma página em branco com a tag de fim
  if (currentPageIndex === 0) {
    const page = unifiedPdf.addPage([595.28, 841.89]);
    drawTagOnPage(page, '[RSC:DOC_TIPO:COMPROVANTES_FIM]', courierFont, 8, rgb(0.6, 0.6, 0.6), 30);
  } else {
    // Inserir tag de fechamento na última página do PDF unificado
    const lastPage = unifiedPdf.getPage(unifiedPdf.getPageCount() - 1);
    drawTagOnPage(lastPage, '[RSC:DOC_TIPO:COMPROVANTES_FIM]', courierFont, 8, rgb(0.6, 0.6, 0.6), 45);
  }

  const unifiedPdfBytes = await unifiedPdf.save();

  // Divisão em partes quando o caderno único ultrapassa o limite aceito no
  // protocolo. A numeração de páginas gravada no Memorial
  // ([RSC:PAGINA_INICIO]/[RSC:PAGINA_FIM]) permanece CONTÍGUA e global, como
  // se o caderno continuasse sendo um PDF só — é o contrato que o avaliador
  // espera. O mapa exportado junto traduz essas páginas globais para
  // (arquivo, página dentro do arquivo).
  const comprovantes: ComprovantesExportados = {
    partes: [],
    dividido: false,
    excedeLimiteMesmoDividido: false,
  };

  if (unifiedPdfBytes.byteLength <= LIMITE_TAMANHO_ARQUIVO_BYTES || segmentosUnificado.length === 0) {
    zip.file('06_Documentos_Comprobatorios_Unificados.pdf', unifiedPdfBytes);
    comprovantes.partes.push({
      arquivo: '06_Documentos_Comprobatorios_Unificados.pdf',
      paginaGlobalInicio: 1,
      paginaGlobalFim: Math.max(1, currentPageIndex),
      bytes: unifiedPdfBytes.byteLength,
    });
  } else {
    const lotes = dividirEmLotes(segmentosUnificado, (segmento) => segmento.bytes, LIMITE_TAMANHO_ARQUIVO_BYTES);
    comprovantes.dividido = true;

    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];
      const parteDoc = await PDFDocument.create();
      const indices: number[] = [];
      for (const segmento of lote) {
        for (let p = segmento.primeiraPagina; p <= segmento.ultimaPagina; p++) indices.push(p - 1);
      }

      const paginasCopiadas = await parteDoc.copyPages(unifiedPdf, indices);
      paginasCopiadas.forEach((page) => parteDoc.addPage(page));

      const parteBytes = await parteDoc.save();
      const nomeArquivo = nomeParteComprovantes(i + 1, lotes.length);
      zip.file(nomeArquivo, parteBytes);

      if (parteBytes.byteLength > LIMITE_TAMANHO_ARQUIVO_BYTES) {
        // Um único documento maior que o limite não tem como ser dividido sem
        // cortar o documento ao meio — o usuário precisa reduzi-lo na origem.
        comprovantes.excedeLimiteMesmoDividido = true;
      }

      comprovantes.partes.push({
        arquivo: nomeArquivo,
        paginaGlobalInicio: lote[0].primeiraPagina,
        paginaGlobalFim: lote[lote.length - 1].ultimaPagina,
        bytes: parteBytes.byteLength,
      });
    }

    // Mapa auxiliar: sem ele, o avaliador (ou a Comissão) não tem como saber
    // em qual arquivo está a página global citada pelo Memorial.
    zip.file(
      '06_Mapa_Paginas_Comprovantes.json',
      JSON.stringify(
        {
          observacao:
            'As páginas citadas no Memorial ([RSC:PAGINA_INICIO]/[RSC:PAGINA_FIM]) são contínuas e globais, ' +
            'como se os comprovantes fossem um único PDF. Este mapa indica em qual arquivo cada faixa de ' +
            'páginas globais foi protocolada. Para achar a página dentro do arquivo: ' +
            'pagina_no_arquivo = pagina_global - paginaGlobalInicio + 1.',
          total_paginas: currentPageIndex,
          limite_bytes_por_arquivo: LIMITE_TAMANHO_ARQUIVO_BYTES,
          partes: comprovantes.partes,
        },
        null,
        2,
      ),
    );
  }

  // 2. Gerar o Requerimento
  const requerimentoBytes = await generateRequerimentoFormal(
    servidor,
    nivelElegivel,
    processo,
    totalPontos,
    itensDistintos,
    lancamentos,
    itensRSC,
    documentos,
  );
  zip.file('01_Requerimento_RSC.pdf', requerimentoBytes);

  // 3. Gerar o Memorial textual com as referências estruturadas de página
  const memorialBytes = await generateMemorialDescritivo(
    servidor,
    nivelElegivel,
    lancamentos,
    itensRSC,
    documentos,
    processo,
    documentPageRanges,
  );
  zip.file('02_Memorial_RSC.pdf', memorialBytes);

  // 4. Reunir os documentos funcionais exigidos para instrução do processo.
  const siapeDocuments = [
    getInstructionDocument(documentos, 'siape_dados_funcionais'),
    getInstructionDocument(documentos, 'siape_posicao_carreira'),
    getInstructionDocument(documentos, 'siape_cargo_confianca'),
  ].filter((doc): doc is Documento => !!doc);
  const siapeBytes = await mergePdfDocumentSet(siapeDocuments);
  if (siapeBytes) zip.file('03_Fichas_Funcionais_SIAPE.pdf', siapeBytes);

  const stabilityDocument = getInstructionDocument(documentos, 'portaria_estabilidade');
  if (stabilityDocument) {
    const stabilityBytes = await mergePdfDocumentSet([stabilityDocument]);
    if (stabilityBytes) zip.file('04_Portaria_Estabilidade.pdf', stabilityBytes);
  }

  const priorGrantDocument = getInstructionDocument(documentos, 'portaria_concessao_anterior');
  if (priorGrantDocument) {
    const priorGrantBytes = await mergePdfDocumentSet([priorGrantDocument]);
    if (priorGrantBytes) zip.file('05_Portaria_Concessao_Anterior_RSC.pdf', priorGrantBytes);
  }

  const qualificationDocument = getInstructionDocument(documentos, 'diploma_certificado_escolaridade');
  if (qualificationDocument) {
    const qualificationBytes = await mergePdfDocumentSet(
      [qualificationDocument],
      'DIPLOMA_CERTIFICADO_ESCOLARIDADE',
    );
    if (qualificationBytes) {
      zip.file('07_Diploma_Certificado_Escolaridade.pdf', qualificationBytes);
    }
  }

  // 5. Compactar e iniciar download do conjunto completo.
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const siape = servidor.siape.replace(/\D/g, '');
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(zipBlob, `RSC-TAE_Dossie_${siape}_${date}.zip`);

  return comprovantes;
}
