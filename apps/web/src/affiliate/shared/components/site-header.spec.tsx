import { act, render, screen } from '@testing-library/react';
import { SiteHeader } from './site-header';

// A barra monta o logotipo, e ele lê a rota atual — fora do App Router não há
// nenhuma para ler. O destino do logotipo tem teste próprio em `site-logo.spec`.
jest.mock('next/navigation', () => ({ usePathname: () => '/' }));

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

/** Os quatro alvos que `useActiveSection` observa, fora da própria SiteHeader. */
function renderWithSections() {
  return render(
    <>
      <SiteHeader />
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
  FakeIntersectionObserver.last = null;
  globalThis.IntersectionObserver =
    FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe('SiteHeader active section', () => {
  it('highlights nothing before any section reaches the band', () => {
    renderWithSections();

    expect(activeLabel()).toBeNull();
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
