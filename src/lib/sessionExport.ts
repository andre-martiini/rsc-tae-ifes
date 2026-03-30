/**
 * Session export: serializes all localStorage metadata + IndexedDB PDF blobs
 * into a single ZIP file and triggers a browser download.
 *
 * ZIP structure:
 *   metadata.json          — all localStorage keys
 *   files/<docId>_<name>   — one entry per document with a real blob
 */

import JSZip from 'jszip';
import { getDocumentBlob } from './documentStorage';
import type { Documento } from '../data/mock';

const STORAGE_KEYS = [
  'rsc-tae-perfil',
  'rsc-tae-documentos',
  'rsc-tae-lancamentos',
  'rsc-tae-processo',
  'rsc-tae-wizard-ids',
];

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

export async function exportSession(): Promise<void> {
  const zip = new JSZip();

  // ── metadata.json ─────────────────────────────────────────────────────────
  const metadata: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        metadata[key] = JSON.parse(raw);
      } catch {
        metadata[key] = raw;
      }
    }
  }
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // ── PDF blobs from IndexedDB ───────────────────────────────────────────────
  const documentsRaw = window.localStorage.getItem('rsc-tae-documentos');
  if (documentsRaw) {
    try {
      const docs = JSON.parse(documentsRaw) as Documento[];
      const filesFolder = zip.folder('files');
      if (filesFolder) {
        for (const doc of docs) {
          // Only export docs with a real physical blob (skip GeDoc refs and autodeclarações)
          if (!doc.caminho_storage || doc.nome_arquivo.endsWith('.ref') || doc.autodeclaracao) {
            continue;
          }
          const blob = await getDocumentBlob(doc.id);
          if (!blob) continue;
          const safeName = doc.nome_arquivo.replace(/[^a-zA-Z0-9._-]/g, '_');
          filesFolder.file(`${doc.id}_${safeName}`, blob);
        }
      }
    } catch {
      // Non-critical: metadata will still be exported even if file blobs fail
    }
  }

  // ── Generate & download ────────────────────────────────────────────────────
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(zipBlob, `RSC-TAE_backup_${date}.zip`);
}
