import { videoEmbed, videoThumbnail, vimeoThumbnailFrom } from './video';

describe('videoEmbed', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ])('plays %s from the no-cookie youtube player', (url) => {
    expect(videoEmbed(url)).toEqual({
      kind: 'iframe',
      src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it.each(['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871'])(
    'plays %s from the vimeo player',
    (url) => {
      expect(videoEmbed(url)).toEqual({
        kind: 'iframe',
        src: 'https://player.vimeo.com/video/76979871',
      });
    },
  );

  it.each([
    'https://cdn.example.com/trilha/modulo-1.mp4',
    'https://cdn.example.com/trilha/MODULO-1.WEBM?token=abc',
  ])('plays the file %s in the native player', (url) => {
    expect(videoEmbed(url)).toEqual({ kind: 'file', src: url });
  });

  /*
    Qualquer outro endereço sai como link: embutir uma página que não é player
    abriria um site inteiro dentro do diálogo, e o CSP barraria de todo jeito.
  */
  it.each([
    'https://drive.google.com/file/d/abc/view',
    'https://www.youtube.com/watch?list=PL123',
    'não é url',
  ])('opens %s in a new tab instead of embedding it', (url) => {
    expect(videoEmbed(url)).toEqual({ kind: 'link', href: url });
  });
});

describe('videoThumbnail', () => {
  it('takes the youtube cover straight from the video id', () => {
    expect(videoThumbnail('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      kind: 'image',
      src: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  });

  /* O Vimeo não expõe a capa pelo id: ela sai da consulta oEmbed, feita no servidor. */
  it('asks the vimeo oembed for the cover', () => {
    expect(videoThumbnail('https://player.vimeo.com/video/76979871')).toEqual({
      kind: 'vimeo',
      oembedUrl:
        'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F76979871&width=640',
    });
  });

  it('shows the first frame of a video file', () => {
    expect(videoThumbnail('https://cdn.example.com/trilha/modulo-1.mp4')).toEqual({
      kind: 'frame',
      src: 'https://cdn.example.com/trilha/modulo-1.mp4#t=0.5',
    });
  });

  it('has no cover for an address that is not a player', () => {
    expect(videoThumbnail('https://drive.google.com/file/d/abc/view')).toEqual({ kind: 'none' });
  });
});

describe('vimeoThumbnailFrom', () => {
  it('reads the cover from the oembed answer', () => {
    expect(
      vimeoThumbnailFrom({ thumbnail_url: 'https://i.vimeocdn.com/video/452001751-640.jpg' }),
    ).toEqual({ kind: 'image', src: 'https://i.vimeocdn.com/video/452001751-640.jpg' });
  });

  /* A capa vai para um `<img>`: fora do CDN do Vimeo o CSP a barraria, e o card ficaria quebrado. */
  it.each([
    [{ thumbnail_url: 'https://evil.example.com/x.jpg' }],
    [{ thumbnail_url: 'http://i.vimeocdn.com/video/1.jpg' }],
    [{}],
    [null],
  ])('falls back to no cover for %j', (answer) => {
    expect(vimeoThumbnailFrom(answer)).toEqual({ kind: 'none' });
  });
});
