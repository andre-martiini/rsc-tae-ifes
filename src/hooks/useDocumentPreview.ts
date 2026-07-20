import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Documento } from '../data/mock';
import { getDocumentBlob } from '../lib/documentStorage';
import { prepareViewerBlob } from '../lib/documentViewer';

export interface DocumentPreviewState {
  previewDoc: Documento | null;
  previewUrl: string | null;
  previewLoading: boolean;
  previewError: string | null;
  abrirPreviewDocumento: (doc: Documento) => Promise<void>;
  fecharPreviewDocumento: () => void;
}

/**
 * Estado e ações para pré-visualizar um documento num overlay (iframe PDF).
 * Documentos sem arquivo local abrem o link institucional (GEDOC) em nova aba.
 * Revoga as object URLs criadas ao trocar de documento e ao desmontar.
 */
export function useDocumentPreview(): DocumentPreviewState {
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fecharPreviewDocumento = useCallback(() => {
    setPreviewDoc(null);
    setPreviewError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const abrirPreviewDocumento = useCallback(async (doc: Documento) => {
    if (!doc.caminho_storage) {
      if (doc.gedoc_links?.length) {
        window.open(doc.gedoc_links[0], '_blank', 'noopener,noreferrer');
      } else {
        toast.info('Este documento não possui arquivo local nem link institucional para visualização.');
      }
      return;
    }

    setPreviewDoc(doc);
    setPreviewError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPreviewLoading(true);
    try {
      const blob = await getDocumentBlob(doc.id);
      if (!blob) {
        setPreviewError('Arquivo local não encontrado neste navegador.');
        return;
      }
      setPreviewUrl(URL.createObjectURL(prepareViewerBlob(doc, blob)));
    } catch {
      setPreviewError('Não foi possível carregar a visualização do arquivo.');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, []);

  return {
    previewDoc,
    previewUrl,
    previewLoading,
    previewError,
    abrirPreviewDocumento,
    fecharPreviewDocumento,
  };
}
