import { cn } from './cn';

/**
 * Regressão: sem a extensão do `tailwind-merge`, `text-display` era tratado como
 * cor de texto e desaparecia ao lado de `text-ink-900`. O título passava a
 * renderizar no tamanho de corpo, sem erro em lint, type-check ou build.
 */
describe('cn', () => {
  it('keeps a custom font size next to a text color', () => {
    expect(cn('text-display', 'text-ink-900')).toBe('text-display text-ink-900');
  });

  it('keeps every custom font size of the design system', () => {
    for (const size of ['text-display', 'text-title', 'text-lead', 'text-eyebrow']) {
      expect(cn(size, 'text-blue-600')).toContain(size);
    }
  });

  it('still resolves a genuine font size conflict', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('resolves a conflict between a custom size and a stock one', () => {
    expect(cn('text-title', 'text-sm')).toBe('text-sm');
  });

  it('keeps the card radius next to a custom shadow', () => {
    expect(cn('rounded-card', 'shadow-pop')).toBe('rounded-card shadow-pop');
  });

  it('resolves a conflict between the two custom shadows', () => {
    expect(cn('shadow-pop', 'shadow-overlay')).toBe('shadow-overlay');
  });

  it('keeps every custom shadow of the design system', () => {
    for (const shadow of ['shadow-card', 'shadow-float', 'shadow-pop', 'shadow-overlay']) {
      expect(cn(shadow, 'rounded-panel')).toContain(shadow);
    }
  });

  it('resolves a conflict between an elevation shadow and a stock one', () => {
    expect(cn('shadow-card', 'shadow-none')).toBe('shadow-none');
  });

  it('keeps every custom radius of the design system', () => {
    for (const radius of ['rounded-card', 'rounded-panel', 'rounded-pill']) {
      expect(cn(radius, 'shadow-card')).toContain(radius);
    }
  });

  it('resolves a conflict between the custom radii', () => {
    expect(cn('rounded-card', 'rounded-panel')).toBe('rounded-panel');
  });
});
