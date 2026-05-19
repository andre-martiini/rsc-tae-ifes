import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDocumentBlob } from './documentStorage';
import type { ComprovacaoItemResumo, ItemPageRange } from './pdfGenerator';

function sanitizeTag(value: string): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '_')
    .replace(/[^ -~]/g, '?');
}

/**
 * Merges all physical documents from each ComprovacaoItemResumo group into a
 * single sequential PDF. Each page receives a discrete identification tag at
 * the bottom tying it to its source item and document, enabling Sistema 2 to
 * reconstruct the evidence tree via regex without shared infrastructure.
 *
 * Returns the unified PDF bytes and the page ranges each item occupies within
 * that PDF (used by generateMemorialDescritivo to embed PAGINA_INICIO/FIM tags).
 */
export async function unificarComprovantes(
  grupos: ComprovacaoItemResumo[],
): Promise<{ bytes: Uint8Array; pageRanges: ItemPageRange[] }> {
  const unified = await PDFDocument.create();
  const regular = await unified.embedFont(StandardFonts.Helvetica);
  const tagColor = rgb(0.85, 0.85, 0.85);
  const tagSize = 6;

  const pageRanges: ItemPageRange[] = [];
  let currentPageIndex = 1;

  for (const grupo of grupos) {
    const physicalDocs = grupo.documentos.filter(
      (doc) => doc.caminho_storage && !doc.nome_arquivo.endsWith('.ref'),
    );

    if (physicalDocs.length === 0) continue;

    const itemPageStart = currentPageIndex;
    let firstDocRef: string | null = null;

    for (const doc of physicalDocs) {
      const blob = await getDocumentBlob(doc.id);
      if (!blob) continue;

      let docBytes: ArrayBuffer;
      try {
        docBytes = await blob.arrayBuffer();
      } catch {
        continue;
      }

      let sourcePdf: PDFDocument;
      try {
        sourcePdf = await PDFDocument.load(docBytes, { ignoreEncryption: true });
      } catch {
        continue;
      }

      const pageIndices = sourcePdf.getPageIndices();
      if (pageIndices.length === 0) continue;

      const copiedPages = await unified.copyPages(sourcePdf, pageIndices);
      if (firstDocRef === null) {
        firstDocRef = sanitizeTag(doc.nome_arquivo);
      }

      const docHash = doc.hash_arquivo ?? doc.id;
      const tag = `[RSC:EVIDENCIA_ITEM:${grupo.item.numero}][RSC:DOC_HASH:${sanitizeTag(docHash)}]`;

      for (const page of copiedPages) {
        unified.addPage(page);
        page.drawText(tag, {
          x: 10,
          y: 8,
          size: tagSize,
          font: regular,
          color: tagColor,
        });
      }

      currentPageIndex += copiedPages.length;
    }

    if (currentPageIndex > itemPageStart) {
      pageRanges.push({
        itemId: grupo.item.id,
        itemNumero: grupo.item.numero,
        inciso: grupo.item.inciso,
        docRef: firstDocRef ?? 'sem_comprovante',
        pageStart: itemPageStart,
        pageEnd: currentPageIndex - 1,
      });
    }
  }

  const bytes = await unified.save();
  return { bytes, pageRanges };
}
