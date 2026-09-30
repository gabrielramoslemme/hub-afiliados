/**
 * Como a tela lida com o vídeo de um módulo. O operador cola o endereço que tem
 * — o link de compartilhar do YouTube, a página do Vimeo, o arquivo num CDN —,
 * e a tela precisa de duas coisas diferentes dele: o player do diálogo e a capa
 * do card. As duas saem da mesma leitura do endereço.
 *
 * Cada domínio usado aqui está liberado no CSP de `next.config.mjs`: os players
 * em `frame-src`, as capas em `img-src`, o arquivo em `media-src`.
 */
type VideoSource =
  | { provider: 'youtube'; id: string }
  | { provider: 'vimeo'; id: string }
  | { provider: 'file'; src: string }
  | { provider: 'link'; href: string };

export type VideoEmbed =
  | { kind: 'iframe'; src: string }
  | { kind: 'file'; src: string }
  | { kind: 'link'; href: string };

/**
 * A capa do card. `vimeo` ainda não é a capa: o Vimeo só a entrega pela
 * consulta oEmbed, que o servidor faz e traduz com `vimeoThumbnailFrom`.
 */
export type VideoThumbnail =
  | { kind: 'image'; src: string }
  | { kind: 'frame'; src: string }
  | { kind: 'vimeo'; oembedUrl: string }
  | { kind: 'none' };

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const YOUTUBE_ID = /^[\w-]{6,}$/;
const VIMEO_ID = /^\d+$/;
const VIDEO_FILE = /\.(mp4|webm|ogg|mov)$/i;
const VIMEO_THUMBNAIL_HOST = 'i.vimeocdn.com';

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

function videoSource(address: string): VideoSource {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return { provider: 'link', href: address };
  }

  const youtube = youtubeId(url);
  if (youtube && YOUTUBE_ID.test(youtube)) return { provider: 'youtube', id: youtube };

  const vimeo = vimeoId(url);
  if (vimeo && VIMEO_ID.test(vimeo)) return { provider: 'vimeo', id: vimeo };

  if (VIDEO_FILE.test(url.pathname)) return { provider: 'file', src: address };

  return { provider: 'link', href: address };
}

export function videoEmbed(address: string): VideoEmbed {
  const source = videoSource(address);

  switch (source.provider) {
    case 'youtube':
      return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${source.id}` };
    case 'vimeo':
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${source.id}` };
    case 'file':
      return { kind: 'file', src: source.src };
    case 'link':
      return { kind: 'link', href: source.href };
  }
}

export function videoThumbnail(address: string): VideoThumbnail {
  const source = videoSource(address);

  switch (source.provider) {
    case 'youtube':
      return { kind: 'image', src: `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg` };
    case 'vimeo': {
      const query = new URLSearchParams({ url: `https://vimeo.com/${source.id}`, width: '640' });
      return { kind: 'vimeo', oembedUrl: `https://vimeo.com/api/oembed.json?${query}` };
    }
    // O fragmento de mídia faz o `<video>` parar meio segundo adentro: o
    // primeiro quadro costuma ser preto.
    case 'file':
      return { kind: 'frame', src: `${source.src}#t=0.5` };
    case 'link':
      return { kind: 'none' };
  }
}

/** A capa na resposta do oEmbed — só se ela vier do CDN do Vimeo, o único liberado no CSP. */
export function vimeoThumbnailFrom(answer: unknown): VideoThumbnail {
  const thumbnail = (answer as { thumbnail_url?: unknown } | null)?.thumbnail_url;
  if (typeof thumbnail !== 'string') return { kind: 'none' };

  try {
    const url = new URL(thumbnail);
    return url.protocol === 'https:' && url.hostname === VIMEO_THUMBNAIL_HOST
      ? { kind: 'image', src: thumbnail }
      : { kind: 'none' };
  } catch {
    return { kind: 'none' };
  }
}
