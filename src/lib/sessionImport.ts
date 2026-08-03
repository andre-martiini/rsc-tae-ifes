/**
 * Session import: reads a ZIP backup produced by sessionExport.ts,
 * restores IndexedDB blobs for the active session.
 *
 * Returns the restored metadata so the calling context can update React state.
 * Does NOT write to localStorage — the AppContext handles that via restoreSession().
 */

import JSZip from 'jszip';
import { deleteDocumentsByServidorId, persistDocumentBlob } from './documentStorage';
import type { Servidor, Documento, Lancamento, ProcessoRSC } from '../data/mock';
import type { EstadoTriagem } from '../data/triagem';
import type { EstadoAuditoria } from '../data/auditoria';

export interface RestoredSession {
  perfil: Servidor | null;
  documentos: Documento[];
  lancamentos: Lancamento[];
  processo: ProcessoRSC | null;
  triagem: EstadoTriagem | null;
  auditoria: EstadoAuditoria | null;
  documentosNaoRestaurados: string[];
}

export async function importSession(file: File, currentServidorId?: string): Promise<RestoredSession> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // ── Parse metadata ─────────────────────────────────────────────────────────
  const metadataFile = zip.file('metadata.json');
  if (!metadataFile) {
    throw new Error('Arquivo de backup inválido: metadata.json não encontrado.');
  }

  const metadataText = await metadataFile.async('text');
  const metadata = JSON.parse(metadataText) as Record<string, unknown>;

  // ── Restore PDF blobs into IndexedDB ──────────────────────────────────────
  const docs = (metadata['rsc-tae-documentos'] ?? []) as Documento[];
  const filesFolder = zip.folder('files');

  // Clear only the active session's blobs, not all sessions
  if (currentServidorId) {
    await deleteDocumentsByServidorId(currentServidorId);
  }

  const documentosNaoRestaurados: string[] = [];
  const idsNaoRestaurados = new Set<string>();

  if (docs.length > 0) {
    for (const doc of docs) {
      if (!doc.caminho_storage || doc.nome_arquivo.endsWith('.ref') || doc.autodeclaracao) {
        continue;
      }
      const safeName = doc.nome_arquivo.replace(/[^a-zA-Z0-9._-]/g, '_');
      const entry = filesFolder?.file(`${doc.id}_${safeName}`);
      if (!entry) {
        documentosNaoRestaurados.push(doc.nome_arquivo);
        idsNaoRestaurados.add(doc.id);
        continue;
      }

      try {
        const blobData = await entry.async('blob');
        await persistDocumentBlob({
          docId: doc.id,
          servidorId: doc.servidor_id,
          nomeArquivo: doc.nome_arquivo,
          blob: blobData,
        });
      } catch {
        documentosNaoRestaurados.push(doc.nome_arquivo);
        idsNaoRestaurados.add(doc.id);
      }
    }
  }

  // Documentos sem arquivo restaurado não entram no estado — o registro apontaria
  // para um blob inexistente no IndexedDB local, reproduzindo o erro "documento
  // não encontrado no armazenamento local" ao tentar abrir no Dashboard.
  const docsRestaurados = docs.filter((doc) => !idsNaoRestaurados.has(doc.id));

  // ── Return parsed state for React context ─────────────────────────────────
  return {
    perfil: (metadata['rsc-tae-perfil'] as Servidor) ?? null,
    documentos: docsRestaurados,
    lancamentos: (metadata['rsc-tae-lancamentos'] ?? []) as Lancamento[],
    processo: (metadata['rsc-tae-processo'] as ProcessoRSC) ?? null,
    triagem: (metadata['rsc-tae-triagem'] as EstadoTriagem) ?? null,
    auditoria: (metadata['rsc-tae-auditoria'] as EstadoAuditoria) ?? null,
    documentosNaoRestaurados,
  };
}
