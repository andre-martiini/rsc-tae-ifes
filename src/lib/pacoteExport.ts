import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb, degrees, PDFPage } from 'pdf-lib';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { getDocumentBlob } from './documentStorage';
import {
  buildDossierDocumentOrder,
  compareItemsByDossierOrder,
  sortDocumentsByDossierOrder,
  sortLancamentosByDossierOrder,
} from './documentOrdering';
import { sumPointValues } from './points';
import { getDistinctRscCriterionCount } from './rsc';
import { sanitizeForTag } from './utils';
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

export async function exportPacoteRSC(params: {
  servidor: Servidor;
  nivelElegivel: NivelRsc | null;
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
  processo: ProcessoRSC;
}): Promise<void> {
  const { servidor, nivelElegivel, lancamentos, itensRSC, documentos, processo } = params;

  const zip = new JSZip();
  const groups = buildComprovacaoGroups(lancamentos, itensRSC, documentos);
  const totalPontos = sumPointValues(lancamentos.map((lancamento) => lancamento.pontos_calculados));
  const itensDistintos = getDistinctRscCriterionCount(lancamentos, itensRSC);

  // 1. Criar o PDF unificado e rastrear intervalos de páginas para cada documento em cada item
  const unifiedPdf = await PDFDocument.create();
  const courierFont = await unifiedPdf.embedFont(StandardFonts.Courier);
  let currentPageIndex = 0;
  const documentPageRanges: Record<string, { startPage: number; endPage: number }> = {};

  for (const group of groups) {
    const itemNumero = group.item.numero;
    // Seleciona os documentos físicos que serão mesclados
    const physicalDocs = group.documentos.filter(
      (doc) => doc.caminho_storage && !doc.nome_arquivo.endsWith('.ref') && !doc.autodeclaracao,
    );

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
  zip.file('03_Documentos_Comprobatorios_Unificados.pdf', unifiedPdfBytes);

  // 2. Gerar o Requerimento
  const requerimentoBytes = await generateRequerimentoFormal(
    servidor,
    nivelElegivel,
    processo,
    totalPontos,
    itensDistintos,
  );
  zip.file('01_Requerimento_RSC.pdf', requerimentoBytes);

  // 3. Gerar o Memorial Descritivo com as referências de página
  const memorialBytes = await generateMemorialDescritivo(
    servidor,
    nivelElegivel,
    lancamentos,
    itensRSC,
    documentos,
    processo,
    documentPageRanges,
  );
  zip.file('02_Memorial_Descritivo_RSC.pdf', memorialBytes);

  // 4. Compactar e iniciar download do ZIP com estritamente esses 3 arquivos
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const siape = servidor.siape.replace(/\D/g, '');
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(zipBlob, `RSC-TAE_Dossie_${siape}_${date}.zip`);
}
