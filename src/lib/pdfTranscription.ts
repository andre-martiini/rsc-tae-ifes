import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { extractTextFromImageDetailed } from './ocr';

if (typeof window !== 'undefined' && 'GlobalWorkerOptions' in pdfjs) {
  (pdfjs as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface PdfPageTranscriptionDiagnostics {
  pageNumber: number;
  nativeChars: number;
  nativeItems: number;
  imageOps: number;
  usedOcr: boolean;
  ocrChars: number;
  ocrConfidence?: number;
  classification: 'native-ok' | 'native-partial' | 'ocr-fallback' | 'ocr-unresolved';
  reason: string;
}

export interface PdfTranscriptionResult {
  text: string;
  diagnostics: {
    totalPages: number;
    pagesWithNativeText: number;
    pagesWithOcrFallback: number;
    pagesFlaggedForReview: number;
    pages: PdfPageTranscriptionDiagnostics[];
    summary: string;
  };
}

const IMAGE_OP_NAMES = [
  'paintImageMaskXObject',
  'paintImageXObject',
  'paintInlineImageXObject',
  'paintInlineImageXObjectGroup',
  'paintImageXObjectRepeat',
  'paintImageMaskXObjectRepeat',
  'paintSolidColorImageMask',
  'paintJpegXObject',
];

function normalizeWhitespace(value: string): string {
  return value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function classifyTextQuality(text: string): { looksNoisy: boolean; alphaRatio: number } {
  const compact = text.replace(/\s+/g, '');
  if (!compact) {
    return { looksNoisy: true, alphaRatio: 0 };
  }

  const letters = (compact.match(/[A-Za-zÀ-ÿ0-9]/g) ?? []).length;
  const alphaRatio = letters / compact.length;
  return {
    looksNoisy: compact.length > 20 && alphaRatio < 0.55,
    alphaRatio,
  };
}

function extractNativeText(textContent: any): { text: string; itemCount: number } {
  let lastY: number | null = null;
  const lines: string[] = [];
  let itemCount = 0;

  for (const item of textContent.items ?? []) {
    const textItem = item as any;
    if (typeof textItem.str !== 'string') continue;

    itemCount += 1;
    const currentY = textItem.transform?.[5];
    if (lastY !== null && currentY !== undefined && Math.abs(currentY - lastY) > 2) {
      lines.push('\n');
    }
    lines.push(textItem.str);
    if (currentY !== undefined) {
      lastY = currentY;
    }
  }

  return {
    text: normalizeWhitespace(lines.join('')),
    itemCount,
  };
}

async function countImageOperators(page: any): Promise<number> {
  try {
    const operatorList = await page.getOperatorList();
    const ops = (pdfjs as any).OPS ?? {};
    const imageOpIds = new Set(
      IMAGE_OP_NAMES.map((name) => ops[name]).filter((value: unknown) => typeof value === 'number'),
    );

    return (operatorList.fnArray ?? []).reduce((count: number, fn: number) => (
      imageOpIds.has(fn) ? count + 1 : count
    ), 0);
  } catch {
    return 0;
  }
}

async function renderPageToCanvas(page: any, scale = 2): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Nao foi possivel criar um canvas para OCR.');
  }

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

function shouldRunOcr(params: {
  nativeText: string;
  nativeItems: number;
  imageOps: number;
}): { value: boolean; reason: string } {
  const { nativeText, nativeItems, imageOps } = params;
  const nativeChars = nativeText.length;
  const { looksNoisy } = classifyTextQuality(nativeText);

  if (nativeChars === 0) {
    return { value: true, reason: 'pagina sem camada de texto detectavel' };
  }

  if (nativeChars < 80 || nativeItems < 12) {
    return { value: true, reason: 'texto nativo muito curto para a pagina' };
  }

  if (imageOps > 0 && nativeChars < 500) {
    return { value: true, reason: 'pagina hibrida com imagem e pouco texto nativo' };
  }

  if (looksNoisy) {
    return { value: true, reason: 'texto nativo parece incompleto ou ruidoso' };
  }

  return { value: false, reason: 'texto nativo suficiente' };
}

function chooseBestText(params: {
  nativeText: string;
  ocrText?: string;
  ocrConfidence?: number;
  shouldOcr: boolean;
  ocrReason: string;
}): { text: string; classification: PdfPageTranscriptionDiagnostics['classification']; reason: string; usedOcr: boolean } {
  const { nativeText, ocrText = '', ocrConfidence = 0, shouldOcr, ocrReason } = params;
  const nativeChars = nativeText.length;
  const ocrChars = ocrText.length;
  const ocrImproved = ocrChars >= Math.max(40, Math.round(nativeChars * 1.2));
  const confidentOcr = ocrConfidence >= 45;

  if (!shouldOcr) {
    return {
      text: nativeText,
      classification: 'native-ok',
      reason: 'texto nativo utilizado sem OCR',
      usedOcr: false,
    };
  }

  if (ocrChars > 0 && (nativeChars === 0 || ocrImproved || confidentOcr)) {
    return {
      text: ocrText,
      classification: 'ocr-fallback',
      reason: `${ocrReason}; OCR aplicado com ganho util`,
      usedOcr: true,
    };
  }

  if (nativeChars > 0) {
    return {
      text: nativeText,
      classification: 'native-partial',
      reason: `${ocrReason}; OCR nao superou o texto nativo`,
      usedOcr: false,
    };
  }

  return {
    text: ocrText,
    classification: 'ocr-unresolved',
    reason: `${ocrReason}; OCR retornou pouco conteudo e exige revisao manual`,
    usedOcr: true,
  };
}

function buildSummary(totalPages: number, pages: PdfPageTranscriptionDiagnostics[]): string {
  const nativePages = pages.filter((page) => page.classification === 'native-ok').length;
  const fallbackPages = pages.filter((page) => page.classification === 'ocr-fallback').length;
  const reviewPages = pages.filter((page) => page.classification === 'native-partial' || page.classification === 'ocr-unresolved').length;

  return [
    '--- DIAGNOSTICO DE TRANSCRICAO ---',
    `Paginas analisadas: ${totalPages}`,
    `Paginas com texto nativo suficiente: ${nativePages}`,
    `Paginas com OCR de fallback aplicado: ${fallbackPages}`,
    `Paginas que ainda merecem revisao manual: ${reviewPages}`,
    reviewPages > 0
      ? 'Aviso: o documento tem pagina(s) com transcricao potencialmente parcial, especialmente em trechos manuscritos ou escaneados.'
      : 'Aviso: nenhuma pagina ficou marcada para revisao manual pelo detector automatico.',
    '--- FIM DO DIAGNOSTICO ---',
  ].join('\n');
}

export async function analyzePdfTranscription(input: File | Blob): Promise<PdfTranscriptionResult> {
  const arrayBuffer = await input.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  try {
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    console.log(`[pdfTranscription] PDF carregado com ${totalPages} pagina(s).`);

    const pageTexts: string[] = [];
    const pages: PdfPageTranscriptionDiagnostics[] = [];

    for (let i = 1; i <= totalPages; i += 1) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const { text: nativeText, itemCount } = extractNativeText(textContent);
      const imageOps = await countImageOperators(page);
      const ocrDecision = shouldRunOcr({
        nativeText,
        nativeItems: itemCount,
        imageOps,
      });

      let ocrText = '';
      let ocrConfidence: number | undefined;

      if (ocrDecision.value && typeof document !== 'undefined') {
        try {
          const canvas = await renderPageToCanvas(page);
          const ocrResult = await extractTextFromImageDetailed(canvas);
          ocrText = normalizeWhitespace(ocrResult.text);
          ocrConfidence = ocrResult.confidence;
        } catch (ocrError) {
          console.warn(`[pdfTranscription] OCR falhou na pagina ${i}:`, ocrError);
        }
      }

      const selected = chooseBestText({
        nativeText,
        ocrText,
        ocrConfidence,
        shouldOcr: ocrDecision.value,
        ocrReason: ocrDecision.reason,
      });

      console.log(
        `[pdfTranscription] Pagina ${i}/${totalPages}: native=${nativeText.length} chars, ocr=${ocrText.length} chars, mode=${selected.classification}.`,
      );

      pages.push({
        pageNumber: i,
        nativeChars: nativeText.length,
        nativeItems: itemCount,
        imageOps,
        usedOcr: selected.usedOcr,
        ocrChars: ocrText.length,
        ocrConfidence,
        classification: selected.classification,
        reason: selected.reason,
      });

      pageTexts.push(`--- PAGINA ${i} de ${totalPages} ---\n${selected.text}`);
    }

    const summary = buildSummary(totalPages, pages);
    const fullText = `${summary}\n\n${pageTexts.join('\n\n')}`.trim();

    return {
      text: fullText,
      diagnostics: {
        totalPages,
        pagesWithNativeText: pages.filter((page) => page.nativeChars > 0).length,
        pagesWithOcrFallback: pages.filter((page) => page.classification === 'ocr-fallback').length,
        pagesFlaggedForReview: pages.filter((page) => page.classification === 'native-partial' || page.classification === 'ocr-unresolved').length,
        pages,
        summary,
      },
    };
  } catch (error) {
    console.error('[pdfTranscription] Erro ao transcrever PDF:', error);
    throw new Error('Nao foi possivel extrair o texto deste PDF.');
  }
}

export async function extractTextFromPdf(input: File | Blob): Promise<string> {
  const result = await analyzePdfTranscription(input);
  return result.text;
}
