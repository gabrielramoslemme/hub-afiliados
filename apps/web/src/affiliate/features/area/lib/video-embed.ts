/**
 * Como o diálogo toca o vídeo de um módulo. O operador cola o endereço que tem
 * — o link de compartilhar do YouTube, a página do Vimeo, o arquivo num CDN —,
 * e a tela precisa do endereço do player, não o da página.
 *
 * - `iframe`: YouTube (pelo domínio sem cookie) e Vimeo — os dois liberados no
 *   `frame-src` do CSP em `next.config.mjs`.
 * - `file`: arquivo de vídeo direto, no `<video>` nativo.
 * - `link`: qualquer outro endereço, aberto em nova aba.
 */
export type VideoEmbed =
  | { kind: 'iframe'; src: string }
  | { kind: 'file'; src: string }
  | { kind: 'link'; href: string };

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const YOUTUBE_ID = /^[\w-]{6,}$/;
const VIMEO_ID = /^\d+$/;
const VIDEO_FILE = /\.(mp4|webm|ogg|mov)$/i;

function youtubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');

  const [, section, id] = url.pathname.split('/');
  return section === 'embed' || section === 'shorts' ? (id ?? null) : null;
}

function vimeoId(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean);

  if (url.hostname === 'vimeo.com' || url.hostname === 'www.vimeo.com') return segments[0] ?? null;
  if (url.hostname === 'player.vimeo.com' && segments[0] === 'video') return segments[1] ?? null;
  return null;
}

export function videoEmbed(address: string): VideoEmbed {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return { kind: 'link', href: address };
  }

  const youtube = youtubeId(url);
  if (youtube && YOUTUBE_ID.test(youtube)) {
    return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtube}` };
  }

  const vimeo = vimeoId(url);
  if (vimeo && VIMEO_ID.test(vimeo)) {
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo}` };
  }

  if (VIDEO_FILE.test(url.pathname)) return { kind: 'file', src: address };

  return { kind: 'link', href: address };
}
