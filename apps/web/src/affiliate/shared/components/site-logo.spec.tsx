import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { SiteLogo } from './site-logo';

jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

const pathname = usePathname as jest.MockedFunction<typeof usePathname>;

/** O destino é lido do DOM, e não da função: é o `href` que a pessoa clica. */
function hrefAt(current: string): string | null {
  pathname.mockReturnValue(current);

  const view = render(<SiteLogo />);
  const href = screen.getByRole('link').getAttribute('href');

  view.unmount();

  return href;
}

describe('SiteLogo destination', () => {
  it('scrolls to the top of the document on the landing', () => {
    expect(hrefAt('/')).toBe('#topo');
  });

  it('goes back to the landing from any public page', () => {
    expect(hrefAt('/cadastro')).toBe('/');
    expect(hrefAt('/cadastro/sucesso')).toBe('/');
    expect(hrefAt('/entrar')).toBe('/');
    expect(hrefAt('/definir-senha')).toBe('/');
  });

  it('goes to the account home from inside the account', () => {
    expect(hrefAt('/minha-conta')).toBe('/minha-conta');
    expect(hrefAt('/minha-conta/cupom')).toBe('/minha-conta');
    expect(hrefAt('/minha-conta/perfil')).toBe('/minha-conta');
  });
});
