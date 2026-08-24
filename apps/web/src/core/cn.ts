import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * O `tailwind-merge` precisa conhecer as escalas que criamos no `@theme`, senão
 * classifica `text-display` como cor de texto e a descarta quando um
 * `text-ink-900` aparece na mesma chamada — o tamanho some sem erro nenhum, e o
 * título renderiza no tamanho de corpo.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'title', 'lead', 'eyebrow'] }],
      shadow: [{ shadow: ['card', 'float', 'pop', 'overlay'] }],
      rounded: [{ rounded: ['card', 'panel', 'pill'] }],
    },
  },
});

/** Junta classes condicionais e resolve conflito de utilitário do Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
