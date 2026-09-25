import { formatCentsAsBRL } from './money.util';

describe('formatCentsAsBRL', () => {
  // O Intl separa o símbolo com espaço inquebrável; a comparação normaliza.
  function plain(text: string): string {
    return text.replace(/ /g, ' ');
  }

  it('writes cents as reais with a comma and two decimals', () => {
    expect(plain(formatCentsAsBRL(4000))).toBe('R$ 40,00');
  });

  it('groups thousands with a dot', () => {
    expect(plain(formatCentsAsBRL(123456))).toBe('R$ 1.234,56');
  });
});
