import type { Documento } from '../data/mock';

export function shouldRenderAsPdf(doc: Documento, blob: Blob) {
  return blob.type.toLowerCase().includes('pdf') || doc.nome_arquivo.toLowerCase().endsWith('.pdf');
}

/** Normaliza o MIME do blob para PDF quando o arquivo é um PDF mas o navegador não reconheceu o tipo. */
export function prepareViewerBlob(doc: Documento, blob: Blob) {
  if (shouldRenderAsPdf(doc, blob) && blob.type !== 'application/pdf') {
    return new Blob([blob], { type: 'application/pdf' });
  }

  return blob;
}
