import { useEffect } from 'react';
import { X } from 'lucide-react';
import YoutubeEmbed from './YoutubeEmbed';

interface Props {
  open: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
  subtitle?: string;
}

export default function VideoModal({ open, onClose, videoId, title, subtitle }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fechar vídeo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <YoutubeEmbed videoId={videoId} title={title} className="aspect-video w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
