import 'server-only';

import {
  type ResolvedVideoThumbnail,
  videoThumbnail,
  vimeoThumbnailFrom,
} from '@/shared/lib/video';

/*
  Um dia: a capa de um vídeo praticamente não muda, e consultar o Vimeo a cada
  abertura de tela seria pagar a volta de rede à toa.
*/
const VIMEO_OEMBED: RequestInit = { next: { revalidate: 86_400 } };
const VIMEO_TIMEOUT_MS = 2_500;

/**
 * A capa de cada módulo da trilha, por id — a mesma no painel e na área do
 * afiliado. YouTube e arquivo saem direto do endereço; o Vimeo só entrega a
 * capa pela consulta oEmbed, que é pública e sai daqui, do servidor. Falhou ou
 * demorou, o card fica com a capa neutra: a tela não pode deixar de abrir
 * porque o Vimeo não respondeu.
 */
export async function fetchVideoThumbnails(
  modules: ReadonlyArray<{ id: string; videoUrl: string }>,
): Promise<Record<string, ResolvedVideoThumbnail>> {
  const entries = await Promise.all(
    modules.map(async ({ id, videoUrl }): Promise<[string, ResolvedVideoThumbnail]> => {
      const thumbnail = videoThumbnail(videoUrl);
      if (thumbnail.kind !== 'vimeo') return [id, thumbnail];

      try {
        const response = await fetch(thumbnail.oembedUrl, {
          ...VIMEO_OEMBED,
          signal: AbortSignal.timeout(VIMEO_TIMEOUT_MS),
        });
        if (!response.ok) return [id, { kind: 'none' }];

        const resolved = vimeoThumbnailFrom(await response.json());
        return [id, resolved.kind === 'vimeo' ? { kind: 'none' } : resolved];
      } catch {
        return [id, { kind: 'none' }];
      }
    }),
  );

  return Object.fromEntries(entries);
}
