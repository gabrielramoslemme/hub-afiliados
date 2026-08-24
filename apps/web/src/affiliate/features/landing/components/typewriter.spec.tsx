import { act, render, screen } from '@testing-library/react';
import { Typewriter } from './typewriter';

/**
 * O observer é dublado para o teste controlar quando a seção "entra na tela".
 * Sem isso não há como distinguir "ainda não apareceu" de "apareceu e não
 * digitou", que é justamente o que este arquivo precisa separar.
 */
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

/**
 * O texto acessível é duplicado num `sr-only`; o que interessa aqui é o pintado,
 * que é o primeiro `aria-hidden` da marcação — o segundo é o cursor.
 */
function painted(container: HTMLElement): string {
  return container.querySelector('span[aria-hidden]')?.textContent ?? '';
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeIntersectionObserver.last = null;
  globalThis.IntersectionObserver =
    FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Typewriter', () => {
  it('announces the whole text from the start', () => {
    render(<Typewriter text="MARINA25" />);

    expect(screen.getByText('MARINA25')).toBeInTheDocument();
  });

  it('paints nothing before the section enters the viewport', () => {
    const { container } = render(<Typewriter text="MARINA25" />);

    expect(painted(container)).toBe('');
  });

  it('starts typing once the section enters the viewport', () => {
    const { container } = render(<Typewriter text="MARINA25" speed={50} />);

    act(() => FakeIntersectionObserver.last?.enter());
    act(() => jest.advanceTimersByTime(50));

    expect(painted(container)).toBe('M');
  });

  it('types one character per tick', () => {
    const { container } = render(<Typewriter text="MARINA25" speed={50} />);

    act(() => FakeIntersectionObserver.last?.enter());
    act(() => jest.advanceTimersByTime(150));

    expect(painted(container)).toBe('MAR');
  });

  it('finishes on the last character and stops there', () => {
    const { container } = render(<Typewriter text="MARINA25" speed={50} />);

    act(() => FakeIntersectionObserver.last?.enter());
    act(() => jest.advanceTimersByTime(5000));

    expect(painted(container)).toBe('MARINA25');
  });

  it('shows the whole text at once when the browser has no observer', () => {
    // @ts-expect-error o cenário sob teste é justamente a ausência da API
    globalThis.IntersectionObserver = undefined;

    const { container } = render(<Typewriter text="MARINA25" speed={50} />);
    act(() => jest.advanceTimersByTime(5000));

    expect(painted(container)).toBe('MARINA25');
  });
});
