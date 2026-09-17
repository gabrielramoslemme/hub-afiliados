import { cn } from './cn';

/**
 * Regressão: sem a extensão do `tailwind-merge`, `text-display` era tratado como
 * cor de texto e desaparecia ao lado de `text-ink-900`. O título passava a
 * renderizar no tamanho de corpo, sem erro em lint, type-check ou build.
 *
 * Um teste por escala estendida: cada valor sobrevive ao lado de um utilitário
 * de outro grupo, e o último da mesma escala vence.
 */
describe('cn', () => {
  it('knows every custom font size of the design system', () => {
    for (const size of ['text-display', 'text-title', 'text-lead', 'text-eyebrow']) {
      expect(cn(size, 'text-ink-900')).toBe(`${size} text-ink-900`);
      expect(cn(size, 'text-sm')).toBe('text-sm');
    }
  });

  it('knows every custom shadow of the design system', () => {
    for (const shadow of ['shadow-card', 'shadow-float', 'shadow-pop', 'shadow-overlay']) {
      expect(cn(shadow, 'rounded-panel')).toBe(`${shadow} rounded-panel`);
      expect(cn(shadow, 'shadow-none')).toBe('shadow-none');
    }
  });

  it('knows every custom radius of the design system', () => {
    for (const radius of ['rounded-card', 'rounded-panel', 'rounded-pill']) {
      expect(cn(radius, 'shadow-card')).toBe(`${radius} shadow-card`);
      expect(cn(radius, 'rounded-md')).toBe('rounded-md');
    }
  });
});
