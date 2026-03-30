/**
 * Session import: reads a ZIP backup produced by sessionExport.ts,
 * restores localStorage metadata and re-imports PDF blobs into IndexedDB.
 *
 * Returns the restored metadata so the calling context can update React state.
 */

import JSZip from 'jszip';
import { clearDocumentStorage, persistDocumentBlob } from './documentStorage';
import type { Servidor, Documento, Lancamento, ProcessoRSC } from '../data/mock';

const STORAGE_KEYS = [
  'rsc-tae-perfil',
  'rsc-tae-documentos',
  'rsc-tae-lancamentos',
  'rsc-tae-processo',
  'rsc-tae-wizard-ids',
];

export interface RestoredSession {
  perfil: Servidor | null;
  documentos: Documento[];
  lancamentos: Lancamento[];
  processo: ProcessoRSC | null;
  wizardIds: string[];
}

export async function importSession(file: File): Promise<RestoredSession> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // ── Restore metadata ───────────────────────────────────────────────────────
  const metadataFile = zip.file('metadata.json');
  if (!metadataFile) {
    throw new Error('Arquivo de backup inválido: metadata.json não encontrado.');
  }

  const metadataText = await metadataFile.async('text');
  const metadata = JSON.parse(metadataText) as Record<string, unknown>;

  // Write each key back to localStorage
  for (const key of STORAGE_KEYS) {
    if (key in metadata) {
      window.localStorage.setItem(key, JSON.stringify(metadata[key]));
    } else {
      window.localStorage.removeItem(key);
    }
  }

  // ── Restore PDF blobs into IndexedDB ──────────────────────────────────────
  const docs = (metadata['rsc-tae-documentos'] ?? []) as Documento[];
  const filesFolder = zip.folder('files');

  await clearDocumentStorage();

  if (filesFolder && docs.length > 0) {
    for (const doc of docs) {
      if (!doc.caminho_storage || doc.nome_arquivo.endsWith('.ref') || doc.autodeclaracao) {
        continue;
      }
      const safeName = doc.nome_arquivo.replace(/[^a-zA-Z0-9._-]/g, '_');
      const entry = filesFolder.file(`${doc.id}_${safeName}`);
      if (!entry) continue;

      try {
        const blobData = await entry.async('blob');
        await persistDocumentBlob({
          docId: doc.id,
          servidorId: doc.servidor_id,
          nomeArquivo: doc.nome_arquivo,
          blob: blobData,
        });
      } catch {
        // Non-critical: skip blobs that fail to restore
      }
    }
  }

  // ── Return parsed state for React context ─────────────────────────────────
  return {
    perfil: (metadata['rsc-tae-perfil'] as Servidor) ?? null,
    documentos: docs,
    lancamentos: (metadata['rsc-tae-lancamentos'] ?? []) as Lancamento[],
    processo: (metadata['rsc-tae-processo'] as ProcessoRSC) ?? null,
    wizardIds: (metadata['rsc-tae-wizard-ids'] ?? []) as string[],
  };
}
