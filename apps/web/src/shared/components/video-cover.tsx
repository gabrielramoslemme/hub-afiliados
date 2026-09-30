import { Play } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { ResolvedVideoThumbnail } from '@/shared/lib/video';

interface VideoCoverProps {
  thumbnail: ResolvedVideoThumbnail;
  /** Em minutos. Vira o selo no canto da capa, como nos players. */
  durationMinutes?: number;
  className?: string;
}

/**
 * A prévia do vídeo, como no protótipo: a capa com o botão de play por cima.
 * Sem capa, o fundo neutro da marca — o play continua dizendo o que é.
 *
 * O hover vem de fora: quem torna a capa clicável marca o elemento com
 * `group/cover`, e a capa responde a ele — aproxima, escurece de leve e acende o
 * play. Capa que não abre nada não recebe o grupo e fica parada. A escala só
 * acontece com `motion-safe`, para quem não pediu menos movimento.
 */
export function VideoCover({ thumbnail, durationMinutes, className }: VideoCoverProps) {
  return (
    <span
      className={cn(
        'relative flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-md bg-blue-50 ring-1 ring-ink-200 transition-shadow duration-200',
        'group-hover/cover:shadow-card group-hover/cover:ring-blue-300 group-focus-visible/cover:ring-2 group-focus-visible/cover:ring-blue-600',
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
          className="absolute inset-0 size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover/cover:scale-105"
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
          className="pointer-events-none absolute inset-0 size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover/cover:scale-105"
        />
      )}

      {/* O véu que escurece a capa no hover: é ele que faz o play branco saltar da imagem. */}
      <span
        className="absolute inset-0 bg-blue-900/0 transition-colors duration-200 group-hover/cover:bg-blue-900/25"
        aria-hidden
      />

      <span className="relative flex size-9 items-center justify-center rounded-pill bg-white text-blue-600 shadow-card transition-[background-color,color,transform] duration-200 group-hover/cover:bg-blue-600 group-hover/cover:text-white motion-safe:group-hover/cover:scale-110">
        <Play className="ml-0.5 size-4 fill-current" aria-hidden />
      </span>

      {durationMinutes !== undefined && (
        <span
          className="absolute right-1 bottom-1 rounded-sm bg-ink-900/75 px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none text-white"
          data-tabular
        >
          {durationMinutes} min
        </span>
      )}
    </span>
  );
}
