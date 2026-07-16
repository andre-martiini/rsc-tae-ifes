import { useState } from 'react';
import { Play } from 'lucide-react';

interface Props {
  videoId: string;
  title: string;
  className?: string;
}

/**
 * Player-facade: mostra a miniatura do YouTube e só carrega o iframe (e os
 * scripts pesados do player) depois do clique, evitando custo de rede/CPU
 * em telas onde o vídeo é apenas uma opção entre outras.
 */
export default function YoutubeEmbed({ videoId, title, className }: Props) {
  const [ativado, setAtivado] = useState(false);

  if (ativado) {
    return (
      <iframe
        className={className ?? 'aspect-video w-full rounded-lg'}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAtivado(true)}
      className={`group relative block aspect-video w-full overflow-hidden rounded-lg bg-gray-950 ${className ?? ''}`}
      aria-label={`Assistir: ${title}`}
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-60"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
          <Play className="ml-1 h-7 w-7 fill-primary text-primary" />
        </span>
      </span>
    </button>
  );
}
