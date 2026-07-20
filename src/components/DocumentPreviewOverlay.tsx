import { X } from 'lucide-react';
import type { Documento } from '../data/mock';

interface Props {
  doc: Documento | null;
  url: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

/**
 * Overlay que exibe a pré-visualização (iframe PDF) de um documento.
 * Renderiza acima de qualquer outro modal (z-index alto). Alimentado pelo
 * hook useDocumentPreview.
 */
export default function DocumentPreviewOverlay({ doc, url, loading, error, onClose }: Props) {
  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={(event) => { event.stopPropagation(); onClose(); }}
    >
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <p className="truncate text-sm font-bold text-gray-800">{doc.nome_arquivo}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar visualização"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 bg-gray-50">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-500">
              Carregando visualização...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm font-semibold text-amber-800">
              {error}
            </div>
          ) : url ? (
            <iframe src={url} title={doc.nome_arquivo} className="h-full w-full bg-white" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
