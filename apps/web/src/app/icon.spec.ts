import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O ícone da aba é o símbolo do kit oficial recortado — não um desenho novo,
 * nem a trava inteira encolhida (a 16px o wordmark vira borrão).
 *
 * O teste trava a única coisa que silenciosamente sai de sincronia: o traçado.
 * Quando a Porto revisar a marca, alguém troca o `.svg` de `public/brand` e o
 * ícone fica para trás, com a diferença aparecendo só na aba do navegador —
 * lugar em que ninguém olha duas vezes. Aqui a divergência vira teste vermelho.
 */
const web = join(__dirname, '..', '..');
const kit = join(web, 'public/brand/porto-servico-horizontal-primary.svg');
const icon = join(web, 'src/app/icon.svg');

describe('ícones da aplicação', () => {
  it('desenha o símbolo com o traçado do kit oficial, sem redesenho', () => {
    const outlines = [...readFileSync(icon, 'utf8').matchAll(/<path[^>]+\sd="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const official = readFileSync(kit, 'utf8');

    expect(outlines).not.toHaveLength(0);
    for (const outline of outlines) {
      expect(official).toContain(outline);
    }
  });

  it('enquadra o símbolo num viewBox quadrado', () => {
    const viewBox = readFileSync(icon, 'utf8').match(/viewBox="([^"]+)"/)?.[1];
    const [, , width, height] = (viewBox ?? '').split(/[\s,]+/).map(Number);

    expect(width).toBe(height);
  });

  /*
    Os três arquivos que o App Router serve sozinho a partir de `src/app`: o SVG
    para o navegador moderno, o `.ico` para quem não lê SVG e o `apple-icon`
    para a tela de início do iOS — o afiliado entra por web responsivo.
  */
  it.each(['icon.svg', 'favicon.ico', 'apple-icon.png'])('serve %s', (file) => {
    expect(existsSync(join(web, 'src/app', file))).toBe(true);
  });
});
