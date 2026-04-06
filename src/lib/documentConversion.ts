import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
];

export const SUPPORTED_UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt,.md,.json';

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isImage(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

function isText(file: File): boolean {
  return SUPPORTED_TEXT_TYPES.includes(file.type)
    || /\.(txt|md|json)$/i.test(file.name);
}

function sanitizeBaseName(value: string): string {
  return value.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'documento';
}

async function convertImageToPdf(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.create();

  const embeddedImage = file.type === 'image/png'
    ? await pdf.embedPng(bytes)
    : await pdf.embedJpg(bytes);

  const page = pdf.addPage([embeddedImage.width, embeddedImage.height]);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: embeddedImage.width,
    height: embeddedImage.height,
  });

  const pdfBytes = await pdf.save();
  const baseName = sanitizeBaseName(file.name);
  return new File([pdfBytes as any], `${baseName}.pdf`, { type: 'application/pdf' });
}

function splitTextInLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n');
}

function drawWrappedLine(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): { nextY: number } {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { nextY: y - lineHeight };
  }

  let buffer = '';
  let cursorY = y;

  for (const word of words) {
    const tentative = buffer ? `${buffer} ${word}` : word;
    const width = font.widthOfTextAtSize(tentative, fontSize);
    if (width <= maxWidth || !buffer) {
      buffer = tentative;
      continue;
    }

    page.drawText(buffer, {
      x,
      y: cursorY,
      size: fontSize,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    buffer = word;
    cursorY -= lineHeight;
  }

  page.drawText(buffer, {
    x,
    y: cursorY,
    size: fontSize,
    font,
    color: rgb(0.15, 0.15, 0.15),
  });

  return { nextY: cursorY - lineHeight };
}

async function convertTextToPdf(file: File): Promise<File> {
  const text = await file.text();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 52;
  const fontSize = 11;
  const lineHeight = 15;
  const maxWidth = pageWidth - marginX * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - marginTop;

  const ensureSpace = () => {
    if (cursorY <= marginBottom) {
      page = pdf.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - marginTop;
    }
  };

  for (const rawLine of splitTextInLines(text)) {
    ensureSpace();
    if (!rawLine.trim()) {
      cursorY -= lineHeight;
      continue;
    }

    const { nextY } = drawWrappedLine(
      page,
      font,
      rawLine,
      marginX,
      cursorY,
      maxWidth,
      fontSize,
      lineHeight,
    );
    cursorY = nextY;
  }

  const pdfBytes = await pdf.save();
  const baseName = sanitizeBaseName(file.name);
  return new File([pdfBytes as any], `${baseName}.pdf`, { type: 'application/pdf' });
}

import { extractTextFromPdf } from './pdfTranscription';

import { extractTextFromImage } from './ocr';

export async function normalizeUploadToPdf(file: File): Promise<{
  file: File;
  converted: boolean;
  originalName: string;
  originalMimeType: string;
  transcription?: string;
}> {
  if (isPdf(file)) {
    const transcription = await extractTextFromPdf(file).catch(() => undefined);
    return {
      file,
      converted: false,
      originalName: file.name,
      originalMimeType: file.type || 'application/pdf',
      transcription,
    };
  }

  if (isImage(file)) {
    const transcription = await extractTextFromImage(file).catch(() => undefined);
    return {
      file: await convertImageToPdf(file),
      converted: true,
      originalName: file.name,
      originalMimeType: file.type,
      transcription,
    };
  }

  if (isText(file)) {
    const transcription = await file.text();
    return {
      file: await convertTextToPdf(file),
      converted: true,
      originalName: file.name,
      originalMimeType: file.type || 'text/plain',
      transcription,
    };
  }

  throw new Error('Formato inválido. Envie PDF, imagem JPG/PNG ou arquivo de texto.');
}
