import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Os ícones da aba são o símbolo do kit oficial recortado — não um desenho
 * novo, nem a trava inteira encolhida (a 16px o wordmark vira borrão).
 *
 * O teste trava as duas coisas que saem de sincronia em silêncio. A primeira é
 * o traçado: quando a Porto revisar a marca, alguém troca o `.svg` de
 * `public/brand` e os ícones ficam para trás, com a diferença aparecendo só na
 * aba do navegador — lugar em que ninguém olha duas vezes. A segunda é a cor do
 * azulejo, que é o que separa a aba do painel da aba do portal.
 */
const web = join(__dirname, '..', '..');
const kit = join(web, 'public/brand/porto-servico-horizontal-primary.svg');

const icons = {
  portal: 'src/app/icon.svg',
  painel: 'src/app/(backoffice)/admin/icon.svg',
};

function read(file: string): string {
  return readFileSync(join(web, file), 'utf8');
}

/** Os traçados do arquivo, na ordem: o azulejo por baixo e o símbolo por cima. */
function outlinesOf(svg: string): string[] {
  return [...svg.matchAll(/<path[^>]+\sd="([^"]+)"/g)].map((match) => match[1]);
}

/** A cor do azulejo é a do símbolo — as velas são vazado dele. */
function tileColorOf(svg: string): string | undefined {
  return [...svg.matchAll(/<path[^>]+fill="([^"]+)"/g)].at(-1)?.[1];
}

describe('ícones da aplicação', () => {
  describe.each(Object.entries(icons))('%s', (_owner, file) => {
    it('desenha o símbolo com o traçado do kit oficial, sem redesenho', () => {
      const official = readFileSync(kit, 'utf8');
      const outlines = outlinesOf(read(file));

      expect(outlines).not.toHaveLength(0);
      for (const outline of outlines) {
        expect(official).toContain(outline);
      }
    });

    it('enquadra o símbolo num viewBox quadrado', () => {
      const viewBox = read(file).match(/viewBox="([^"]+)"/)?.[1];
      const [, , width, height] = (viewBox ?? '').split(/[\s,]+/).map(Number);

      expect(width).toBe(height);
    });
  });

  it('separa a aba do painel da aba do portal pela cor do azulejo', () => {
    expect(tileColorOf(read(icons.painel))).not.toBe(tileColorOf(read(icons.portal)));
  });

  /*
    O que o App Router serve sozinho a partir de cada segmento. Na raiz de
    `src/app`: o SVG para o navegador moderno, o `.ico` para quem não lê SVG e o
    `apple-icon` para a tela de início do iOS — o afiliado entra por web
    responsivo.

    Em `(backoffice)/admin`, **só o SVG**, e não por economia: com `icon.ico` e
    `icon.svg` na mesma pasta o Next linka o `.ico` e descarta o SVG em
    silêncio, porque a precedência de extensão do `icon.*` escolhe um só. Quem
    não lê SVG cai no `/favicon.ico` da raiz, que o painel continua linkando —
    ícone do portal na aba do painel, que é degradação, não defeito. E sem
    `apple-icon`: o painel é ferramenta de mesa, ninguém o fixa no telefone.
  */
  it.each([
    'src/app/icon.svg',
    'src/app/favicon.ico',
    'src/app/apple-icon.png',
    'src/app/(backoffice)/admin/icon.svg',
  ])('serve %s', (file) => {
    expect(existsSync(join(web, file))).toBe(true);
  });
});
