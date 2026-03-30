/**
 * Session export: serializes all localStorage metadata + IndexedDB PDF blobs
 * into a single ZIP file and triggers a browser download.
 *
 * ZIP structure:
 *   metadata.json          — session data using portable key names
 *   files/<docId>_<name>   — one entry per document with a real blob
 */

import JSZip from 'jszip';
import { getDocumentBlob } from './documentStorage';
import { sessionKeys } from '../context/AppContext';
import type { Documento } from '../data/mock';

// Portable key names used inside the ZIP (not session-scoped)
const EXPORT_KEY_NAMES = {
  perfil: 'rsc-tae-perfil',
  documentos: 'rsc-tae-documentos',
  lancamentos: 'rsc-tae-lancamentos',
  processo: 'rsc-tae-processo',
  wizardIds: 'rsc-tae-wizard-ids',
};

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

export async function exportSession(activeSessionId: string): Promise<void> {
  const zip = new JSZip();
  const keys = sessionKeys(activeSessionId);

  // ── metadata.json ─────────────────────────────────────────────────────────
  // Map session-scoped storage keys → portable export key names
  const keyMap: Record<string, string> = {
    [keys.perfil]: EXPORT_KEY_NAMES.perfil,
    [keys.documentos]: EXPORT_KEY_NAMES.documentos,
    [keys.lancamentos]: EXPORT_KEY_NAMES.lancamentos,
    [keys.processo]: EXPORT_KEY_NAMES.processo,
    [keys.wizardIds]: EXPORT_KEY_NAMES.wizardIds,
  };

  const metadata: Record<string, unknown> = {};
  for (const [storageKey, exportKey] of Object.entries(keyMap)) {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        metadata[exportKey] = JSON.parse(raw);
      } catch {
        metadata[exportKey] = raw;
      }
    }
  }
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // ── PDF blobs from IndexedDB ───────────────────────────────────────────────
  const documentsRaw = window.localStorage.getItem(keys.documentos);
  if (documentsRaw) {
    try {
      const docs = JSON.parse(documentsRaw) as Documento[];
      const filesFolder = zip.folder('files');
      if (filesFolder) {
        for (const doc of docs) {
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
