import { videoEmbed } from './video-embed';

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
