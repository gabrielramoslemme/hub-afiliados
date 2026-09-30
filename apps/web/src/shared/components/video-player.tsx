import { ExternalLink } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { videoEmbed } from '@/shared/lib/video';

/**
 * O vídeo de um módulo dentro de um diálogo — o mesmo no painel e na área do
 * afiliado. YouTube e Vimeo tocam no player deles, o arquivo no `<video>`
 * nativo, e qualquer outro endereço vira um link para a nova aba.
 */
export function VideoPlayer({ title, url }: { title: string; url: string }) {
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
