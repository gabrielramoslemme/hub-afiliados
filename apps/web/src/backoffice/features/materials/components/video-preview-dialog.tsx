'use client';

import type { AdminTrainingModule } from '@porto/contracts';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { VideoCover } from '@/shared/components/video-cover';
import { VideoPlayer } from '@/shared/components/video-player';
import type { ResolvedVideoThumbnail } from '@/shared/lib/video';

interface VideoPreviewProps {
  module: AdminTrainingModule;
  thumbnail: ResolvedVideoThumbnail;
}

/**
 * A miniatura do módulo, que abre o vídeo num diálogo: é como o operador
 * confere que o endereço cadastrado toca o que deveria, do jeito que o
 * afiliado vai ver.
 */
export function VideoPreview({ module, thumbnail }: VideoPreviewProps) {
  return (
    <Dialog>
      <DialogTriggerCover module={module} thumbnail={thumbnail} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{module.title}</DialogTitle>
          <DialogDescription>
            Prévia do vídeo como o afiliado o assiste na aba Materiais.
          </DialogDescription>
        </DialogHeader>

        <VideoPlayer title={module.title} url={module.videoUrl} />

        <DialogFooter>
          <DialogCloseButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogTriggerCover({ module, thumbnail }: VideoPreviewProps) {
  return (
    <DialogTrigger asChild>
      <button
        type="button"
        aria-label={`Assistir à prévia de ${module.title}`}
        className="hidden shrink-0 rounded-md transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:block"
      >
        <VideoCover thumbnail={thumbnail} className="w-28" />
      </button>
    </DialogTrigger>
  );
}

function DialogCloseButton() {
  return (
    <DialogClose asChild>
      <Button type="button" variant="outline">
        Fechar
      </Button>
    </DialogClose>
  );
}
