import { act, render } from '@testing-library/react';
import { useReducedMotion } from '@/core/use-reduced-motion';
import { CountUp } from './count-up';

jest.mock('@/core/use-reduced-motion', () => ({ useReducedMotion: jest.fn(() => false) }));

const mockedUseReducedMotion = jest.mocked(useReducedMotion);

/** Mesmo dublê do `Typewriter`: o teste precisa mandar a seção entrar na tela. */
class FakeIntersectionObserver {
  static last: FakeIntersectionObserver | null = null;

  private readonly targets: Element[] = [];

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.last = this;
  }

  observe(target: Element): void {
    this.targets.push(target);
  }

  disconnect(): void {}

  enter(): void {
    const entries = this.targets.map(
      (target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry,
    );

    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

/** O valor final é duplicado num `sr-only`; o pintado é o `aria-hidden`. */
function painted(container: HTMLElement): string {
  return container.querySelector('span[aria-hidden]')?.textContent ?? '';
}

/*
  Lido do nó, e não por `getByText`: a normalização de espaço do
  testing-library trocaria o espaço inseparável por um comum, que é exatamente
  a diferença que este arquivo precisa enxergar.
*/
function announced(container: HTMLElement): string {
  return container.querySelector('.sr-only')?.textContent ?? '';
}

beforeEach(() => {
  jest.useFakeTimers();
  mockedUseReducedMotion.mockReturnValue(false);
  FakeIntersectionObserver.last = null;
  globalThis.IntersectionObserver =
    FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CountUp', () => {
  it('announces the final value from the start', () => {
    const { container } = render(<CountUp cents={72000} />);

    expect(announced(container)).toBe('R$\u00a0720,00');
  });

  it('paints zero before the section enters the viewport', () => {
    const { container } = render(<CountUp cents={72000} />);

    expect(painted(container)).toBe('R$\u00a00,00');
  });

  it('is still short of the final value halfway through', () => {
    const { container } = render(<CountUp cents={72000} duration={1000} />);

    act(() => FakeIntersectionObserver.last?.enter());
    act(() => jest.advanceTimersByTime(200));

    const halfway = painted(container);

    expect(halfway).not.toBe('R$\u00a00,00');
    expect(halfway).not.toBe('R$\u00a0720,00');
  });

  it('lands exactly on the final value', () => {
    const { container } = render(<CountUp cents={72000} duration={1000} />);

    act(() => FakeIntersectionObserver.last?.enter());
    act(() => jest.advanceTimersByTime(2000));

    expect(painted(container)).toBe('R$\u00a0720,00');
  });

  it('shows the final value at once when the browser has no observer', () => {
    // @ts-expect-error o cenário sob teste é justamente a ausência da API
    globalThis.IntersectionObserver = undefined;

    const { container } = render(<CountUp cents={72000} />);

    expect(painted(container)).toBe('R$\u00a0720,00');
  });

  it('shows the final value at once when the reader asked for less motion', () => {
    mockedUseReducedMotion.mockReturnValue(true);

    const { container } = render(<CountUp cents={72000} />);

    expect(painted(container)).toBe('R$\u00a0720,00');
  });
});
