'use client';

import { Check, Clock, ExternalLink, Loader2, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { AffiliateTrainingModule } from '@porto/contracts';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/cn';
import { completeTrainingModule } from '../actions/complete-training-module.action';
import type { ResolvedVideoThumbnail } from '../data';
import { trainingProgress } from '../lib/training-progress';
import { videoEmbed } from '../lib/video-embed';

/**
 * A trilha de formação. Cada módulo abre o vídeo num diálogo, sem sair da
 * página, e é a própria pessoa que marca o que assistiu: o player é de outro
 * domínio, e o Hub não sabe o que ele tocou.
 */
interface TrainingTrackProps {
  modules: AffiliateTrainingModule[];
  /** A capa de cada módulo, por id, resolvida no servidor. */
  thumbnails: Record<string, ResolvedVideoThumbnail>;
}

export function TrainingTrack({ modules, thumbnails }: TrainingTrackProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const progress = trainingProgress(modules);
  const current = modules.find((module) => module.id === openId) ?? null;

  return (
    <section
      aria-labelledby="training-title"
      className="animate-rise rounded-panel border border-ink-200 bg-white p-4 shadow-card [animation-delay:60ms] sm:p-6"
    >
      <h2 id="training-title" className="text-lg font-semibold text-ink-900">
        Trilha de Formação
      </h2>
      <p className="mt-1 text-[0.875rem] text-ink-500">
        Assista aos vídeos e complete sua formação.
      </p>

      {modules.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed border-ink-300 p-6 text-[0.9375rem] text-ink-500">
          Os vídeos da trilha de formação vão aparecer aqui.
        </p>
      ) : (
        <>
          <div className="mt-6">
            <div className="flex items-center justify-between text-[0.75rem] text-ink-500">
              <span data-tabular>
                {progress.completed} de {progress.total} concluídos
              </span>
              <span className="font-semibold text-blue-700" data-tabular>
                {progress.percent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Progresso da trilha"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              className="mt-2 h-2 overflow-hidden rounded-pill bg-ink-100"
            >
              <div
                className="h-full rounded-pill bg-blue-600 transition-[width] duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <ol className="mt-6 flex flex-col gap-3">
            {modules.map((module) => (
              <li key={module.id}>
                <ModuleRow
                  module={module}
                  thumbnail={thumbnails[module.id] ?? { kind: 'none' }}
                  onOpen={() => setOpenId(module.id)}
                />
              </li>
            ))}
          </ol>
        </>
      )}

      <ModuleDialog
        module={current}
        open={current !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
      />
    </section>
  );
}

function ModuleRow({
  module,
  thumbnail,
  onOpen,
}: {
  module: AffiliateTrainingModule;
  thumbnail: ResolvedVideoThumbnail;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-card border border-ink-200 bg-ink-50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <VideoCover thumbnail={thumbnail} />

      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold text-ink-900">{module.title}</span>
        <span className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-500 sm:line-clamp-3">
          {module.description}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] text-ink-500">
          <Clock className="size-3" aria-hidden />
          {module.durationMinutes} min
        </span>
      </span>

      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border',
          module.completed
            ? 'border-transparent bg-[var(--status-approved-surface)] text-[var(--status-approved)]'
            : 'border-ink-300 bg-white',
        )}
      >
        {module.completed && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
        <span className="sr-only">{module.completed ? 'Assistido' : 'Não assistido'}</span>
      </span>
    </button>
  );
}

function ModuleDialog({
  module,
  open,
  onOpenChange,
}: {
  module: AffiliateTrainingModule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markWatched(target: AffiliateTrainingModule) {
    startTransition(async () => {
      const result = await completeTrainingModule(target.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      onOpenChange(false);
      toast.success(`${target.title} concluído.`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {module && (
          <>
            <DialogHeader>
              <DialogTitle>{module.title}</DialogTitle>
              <DialogDescription>
                Assista ao vídeo abaixo sem sair da página atual.
              </DialogDescription>
            </DialogHeader>

            <VideoPlayer title={module.title} url={module.videoUrl} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {module.completed ? (
                <Button type="button" variant="secondary" disabled>
                  <Check aria-hidden />
                  Assistido
                </Button>
              ) : (
                <Button type="button" onClick={() => markWatched(module)} disabled={pending}>
                  {pending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Check aria-hidden />
                  )}
                  Marcar como assistido
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VideoPlayer({ title, url }: { title: string; url: string }) {
  const embed = videoEmbed(url);

  if (embed.kind === 'iframe') {
    return (
      <iframe
        src={embed.src}
        title={title}
        className="aspect-video w-full rounded-card border border-ink-200 bg-ink-900"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  if (embed.kind === 'file') {
    return (
      // biome-ignore lint/a11y/useMediaCaption: o vídeo é da Porto e chega sem legenda; o texto do módulo acompanha.
      <video
        src={embed.src}
        controls
        preload="metadata"
        className="aspect-video w-full rounded-card border border-ink-200 bg-ink-900"
      />
    );
  }

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-card border border-ink-200 bg-ink-50 p-6 text-center">
      <p className="text-[0.9375rem] text-ink-500">Este vídeo abre no site onde está hospedado.</p>
      <Button asChild variant="outline" size="sm">
        <a href={embed.href} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden />
          Assistir em nova aba
        </a>
      </Button>
    </div>
  );
}

/**
 * A prévia do vídeo no card, como no protótipo: a capa com o botão de play por
 * cima. Sem capa, o fundo neutro da marca — o play continua dizendo o que é.
 */
function VideoCover({ thumbnail }: { thumbnail: ResolvedVideoThumbnail }) {
  return (
    <span className="relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-200 bg-blue-50 sm:w-36">
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
