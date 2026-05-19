import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
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

function sanitizePdfText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0020-\u007E\u00A0-\u00FF\u2022]/g, '?');
}

function splitToken(token: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!token || font.widthOfTextAtSize(token, fontSize) <= maxWidth) {
    return [token];
  }

  const parts: string[] = [];
  let current = '';
  for (const char of Array.from(token)) {
    const candidate = `${current}${char}`;
    if (!current || font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    parts.push(current);
    current = char;
  }

  if (current) {
    parts.push(current);
  }
  return parts;
}

function wrapTextLine(
  font: PDFFont,
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  let buffer = '';
  const lines: string[] = [];

  for (const word of words) {
    for (const token of splitToken(word, font, fontSize, maxWidth)) {
      const tentative = buffer ? `${buffer} ${token}` : token;
      const width = font.widthOfTextAtSize(tentative, fontSize);
      if (width <= maxWidth) {
        buffer = tentative;
        continue;
      }

      if (buffer) lines.push(buffer);
      buffer = token;
    }
  }

  if (buffer) lines.push(buffer);
  return lines;
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

    for (const line of wrapTextLine(font, rawLine, maxWidth, fontSize)) {
      ensureSpace();
      page.drawText(line, {
        x: marginX,
        y: cursorY,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      cursorY -= lineHeight;
    }
  }

  const pdfBytes = await pdf.save();
  const baseName = sanitizeBaseName(file.name);
  return new File([pdfBytes as any], `${baseName}.pdf`, { type: 'application/pdf' });
}

import { extractTextFromPdf } from './pdfTranscription';

import { extractTextFromImage } from './ocr';

// Converts a file to PDF without running OCR/transcription.
// Use this for multi-file merges where transcription of individual files is not needed.
export async function toPdfFile(file: File): Promise<File> {
  if (isPdf(file)) return file;
  if (isImage(file)) return convertImageToPdf(file);
  if (isText(file)) return convertTextToPdf(file);
  throw new Error('Formato inválido. Envie PDF, imagem JPG/PNG ou arquivo de texto.');
}

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
