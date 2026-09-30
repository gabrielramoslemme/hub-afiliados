import { Play } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { ResolvedVideoThumbnail } from '@/shared/lib/video';

/**
 * A prévia do vídeo, como no protótipo: a capa com o botão de play por cima.
 * Sem capa, o fundo neutro da marca — o play continua dizendo o que é. A
 * largura vem de quem usa; a proporção é sempre a do vídeo.
 */
export function VideoCover({
  thumbnail,
  className,
}: {
  thumbnail: ResolvedVideoThumbnail;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-200 bg-blue-50',
        className,
      )}
    >
      {thumbnail.kind === 'image' && (
        // biome-ignore lint/performance/noImgElement: capa de outro domínio, sem o otimizador do Next no meio.
        <img
          src={thumbnail.src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {thumbnail.kind === 'frame' && (
        <video
          src={thumbnail.src}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full object-cover"
        />
      )}
      <span className="relative flex size-9 items-center justify-center rounded-pill bg-white text-blue-600 shadow-card">
        <Play className="ml-0.5 size-4 fill-current" aria-hidden />
      </span>
    </span>
  );
}
