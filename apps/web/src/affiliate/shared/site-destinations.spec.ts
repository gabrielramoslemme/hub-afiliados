import { destinationsFor } from './site-destinations';

describe('destinationsFor', () => {
  it('scrolls within the landing when the sections are on the page', () => {
    const destinations = destinationsFor('/');

    expect(destinations.section('#como-funciona')).toBe('#como-funciona');
    expect(destinations.registration).toBe('#cadastro');
  });

  /*
    Na tela de senha o `#como-funciona` sozinho procurava a seção na própria
    página, onde ela não existe: o clique não levava a lugar nenhum.
  */
  it('takes the menu back to the landing sections from another public page', () => {
    expect(destinationsFor('/esqueci-senha').section('#como-funciona')).toBe('/#como-funciona');
  });

  it('sends the registration call to its own page from another public page', () => {
    expect(destinationsFor('/entrar').registration).toBe('/cadastro');
  });
});
