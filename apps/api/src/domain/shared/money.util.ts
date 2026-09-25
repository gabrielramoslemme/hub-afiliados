const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** O valor como o afiliado lê no e-mail. Centavos inteiros entram; reais só saem daqui. */
export function formatCentsAsBRL(cents: number): string {
  return BRL.format(cents / 100);
}
