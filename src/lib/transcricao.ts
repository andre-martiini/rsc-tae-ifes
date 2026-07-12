import type { Documento } from '../data/mock';
import { getDocumentBlob } from './documentStorage';
import { analyzePdfTranscription } from './pdfTranscription';
import { extractTextFromImage } from './ocr';

export type PrepStatus = {
  total: number;
  current: number;
  currentName?: string;
  failures: string[];
};

export function needsTranscription(doc: Documento) {
  if (doc.transcricao?.trim()) return false;
  if (doc.gedoc_links?.length && !doc.caminho_storage) return false;
  return !!doc.caminho_storage;
}

export async function transcribeDocument(doc: Documento) {
  const blob = await getDocumentBlob(doc.id);
  if (!blob) throw new Error('Arquivo local nao encontrado.');

  const fileName = doc.nome_arquivo.toLowerCase();
  const isPdf = blob.type === 'application/pdf' || fileName.endsWith('.pdf');
  const isImage = /^image\//i.test(blob.type) || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
  const isText = blob.type.startsWith('text/') || /\.(txt|md|json)$/i.test(fileName);

  let raw: string;
  if (isPdf) {
    const result = await analyzePdfTranscription(new File([blob], doc.nome_arquivo, { type: 'application/pdf' }));
    raw = result.text;
  } else if (isImage) {
    raw = await extractTextFromImage(blob);
  } else if (isText) {
    raw = await blob.text();
  } else {
    throw new Error('Formato sem transcricao automatica disponivel.');
  }

  // Remove caracteres de controle invisíveis (null bytes, etc.) que podem
  // truncar a cópia para a área de transferência. Preserva \n, \r e \t.
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}
