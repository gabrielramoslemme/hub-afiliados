import { activeTabHref } from './account-tabs';

describe('activeTabHref', () => {
  /*
    O Início é a raiz da área: comparado por prefixo, ele ficaria aceso em toda
    subpágina, junto com a aba que a pessoa abriu.
  */
  it('lights the home tab only on the root of the area', () => {
    expect(activeTabHref('/minha-conta')).toBe('/minha-conta');
    expect(activeTabHref('/minha-conta/carteira')).toBe('/minha-conta/carteira');
  });

  it('keeps a tab lit on a page below it', () => {
    expect(activeTabHref('/minha-conta/perfil/chave-pix')).toBe('/minha-conta/perfil');
  });

  it('does not light a tab whose name only starts the same way', () => {
    expect(activeTabHref('/minha-conta/materiais-antigos')).toBe('/minha-conta');
  });
});
