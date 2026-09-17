import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { SiteHeader } from './site-header';

// A barra e o logotipo leem a rota atual — fora do App Router não há nenhuma
// para ler. O destino do logotipo tem teste próprio em `site-logo.spec`.
jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

const pathname = usePathname as jest.MockedFunction<typeof usePathname>;

/**
 * O observer é dublado para o teste controlar a intersecção de cada seção
 * individualmente — inclusive quando NENHUMA está na faixa, que é o cenário
 * que o próprio bug mora.
 */
class FakeIntersectionObserver {
  static last: FakeIntersectionObserver | null = null;

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.last = this;
  }

  observe(): void {}
  disconnect(): void {}

  /** Dispara um lote de entradas, uma por seção informada. */
  fire(states: Record<string, boolean>): void {
    const entries = Object.entries(states).map(
      ([id, isIntersecting]) =>
        ({
          target: document.getElementById(id),
          isIntersecting,
        }) as unknown as IntersectionObserverEntry,
    );

    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

/** Os alvos que `useActiveSection` observa, fora da própria SiteHeader. */
function renderWithSections() {
  return render(
    <>
      <SiteHeader />
      <div id="quem-somos" />
      <div id="como-funciona" />
      <div id="beneficios" />
      <div id="requisitos" />
      <div id="duvidas" />
    </>,
  );
}

function activeLabel(): string | null {
  const link = screen
    .getAllByRole('link')
    .find((element) => element.getAttribute('aria-current') === 'true');

  return link?.textContent ?? null;
}

beforeEach(() => {
  pathname.mockReturnValue('/');
  FakeIntersectionObserver.last = null;
  globalThis.IntersectionObserver =
    FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe('SiteHeader active section', () => {
  it('highlights nothing before any section reaches the band', () => {
    renderWithSections();

    expect(activeLabel()).toBeNull();
  });

  /*
    A Porto pediu a área de "Quem somos" no cabeçalho na validação de
    04/09/2026. O item é o primeiro do menu e acompanha a seção como os outros
    quatro — ele só existe enquanto `about` tiver texto.
  */
  it('offers the quem somos entry the header has to carry', () => {
    renderWithSections();

    expect(screen.getAllByRole('link', { name: 'Quem somos' })[0]).toHaveAttribute(
      'href',
      '#quem-somos',
    );
  });

  it('highlights quem somos when it reaches the band', () => {
    renderWithSections();

    act(() => FakeIntersectionObserver.last?.fire({ 'quem-somos': true }));

    expect(activeLabel()).toBe('Quem somos');
  });

  it('highlights the section that enters the band', () => {
    renderWithSections();

    act(() => FakeIntersectionObserver.last?.fire({ 'como-funciona': true }));

    expect(activeLabel()).toBe('Como funciona');
  });

  it('moves the highlight when a later section enters as the earlier one exits', () => {
    renderWithSections();

    act(() => FakeIntersectionObserver.last?.fire({ 'como-funciona': true }));
    act(() => FakeIntersectionObserver.last?.fire({ 'como-funciona': false, beneficios: true }));

    expect(activeLabel()).toBe('O que você recebe');
  });

  it('clears the highlight once the section exits with nothing else in the band', () => {
    renderWithSections();

    // Rolar de volta ao topo: "como-funciona" sai da faixa e nenhuma outra
    // seção rastreada entra no lugar — não há mais seção ativa.
    act(() => FakeIntersectionObserver.last?.fire({ 'como-funciona': true }));
    act(() => FakeIntersectionObserver.last?.fire({ 'como-funciona': false }));

    expect(activeLabel()).toBeNull();
  });
});

/** O `href` de cada link, lido do DOM e na ordem em que a barra os monta. */
function hrefOf(name: string): (string | null)[] {
  return screen.getAllByRole('link', { name }).map((link) => link.getAttribute('href'));
}

describe('SiteHeader destinations', () => {
  it('scrolls within the landing when the sections are on the page', () => {
    render(<SiteHeader />);

    expect(hrefOf('Quem somos')).toEqual(['#quem-somos']);
    expect(hrefOf('Dúvidas')).toEqual(['#duvidas']);
    expect(hrefOf('Quero me cadastrar')).toEqual(['#cadastro']);
  });

  /*
    Na tela de senha o `#como-funciona` sozinho procurava a seção na própria
    página, onde ela não existe: o clique não levava a lugar nenhum.
  */
  it('takes the menu back to the landing sections from another public page', () => {
    pathname.mockReturnValue('/esqueci-senha');
    render(<SiteHeader />);

    expect(hrefOf('Quem somos')).toEqual(['/#quem-somos']);
    expect(hrefOf('Como funciona')).toEqual(['/#como-funciona']);
    expect(hrefOf('O que você recebe')).toEqual(['/#beneficios']);
    expect(hrefOf('Requisitos')).toEqual(['/#requisitos']);
    expect(hrefOf('Dúvidas')).toEqual(['/#duvidas']);
  });

  it('sends the registration call to its own page from another public page', () => {
    pathname.mockReturnValue('/entrar');
    render(<SiteHeader />);

    expect(hrefOf('Quero me cadastrar')).toEqual(['/cadastro']);
  });

  it('applies the same destinations to the mobile menu', () => {
    pathname.mockReturnValue('/esqueci-senha');
    render(<SiteHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    expect(hrefOf('Como funciona')).toEqual(['/#como-funciona', '/#como-funciona']);
    expect(hrefOf('Quero me cadastrar')).toEqual(['/cadastro', '/cadastro']);
  });
});
