import { render, screen } from '@testing-library/react';
import { PortoLogo } from './porto-logo';

/** O arquivo servido é lido do DOM: é o desenho que a pessoa enxerga. */
function wordmarkFor(tone?: 'light' | 'dark'): string | null {
  const view = render(<PortoLogo tone={tone} />);
  const src = screen.getByRole('img').getAttribute('src');

  view.unmount();

  return src;
}

describe('PortoLogo', () => {
  it('serves the coloured wordmark on light surfaces', () => {
    expect(wordmarkFor()).toBe('/brand/porto-servico-wordmark-primary.svg');
    expect(wordmarkFor('light')).toBe('/brand/porto-servico-wordmark-primary.svg');
  });

  /*
    Sobre o azul da marca o "Serviço" preto da trava primária some — a faixa
    escura pede a variante negativa, com o desenho inteiro em branco.
  */
  it('serves the negative wordmark on the brand surface', () => {
    expect(wordmarkFor('dark')).toBe('/brand/porto-servico-wordmark-negative.svg');
  });

  /*
    O kit compõe o descritor em Porto Roobert, fonte que o projeto não serve, e
    SVG dentro de `<img>` não enxerga a fonte da página. Ele é texto do
    documento para não cair na serifada padrão do navegador.
  */
  it('renders the programme name as document text', () => {
    render(<PortoLogo />);

    expect(screen.getByText('Influenciadores')).toBeInTheDocument();
  });
});
