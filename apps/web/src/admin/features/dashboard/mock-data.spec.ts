import {
  affiliateBase,
  attention,
  COMMISSION_RATE,
  categoryMix,
  headline,
  monthlyTrend,
  topAffiliates,
} from './mock-data';

/**
 * O dado é ilustrativo, e é exatamente por isso que ele precisa fechar a conta:
 * um painel de exemplo cujos números não batem entre si ensina a analista a não
 * conferir o painel de verdade. Cada teste aqui trava uma soma que a tela mostra
 * lado a lado — trocar um valor solto no mock quebra o teste, não a confiança.
 */
describe('dashboard mock data', () => {
  it('splits the base into segments that add up to the headline total', () => {
    const sum = affiliateBase.segments.reduce((total, segment) => total + segment.count, 0);

    expect(sum).toBe(affiliateBase.total);
  });

  it('counts the same pending registrations in the base and in the review card', () => {
    const pending = affiliateBase.segments.find((segment) => segment.tone === 'pending');

    expect(attention.pendingReviews).toBe(pending?.count);
  });

  it('keeps the category mix at a hundred percent', () => {
    const sum = categoryMix.reduce((total, slice) => total + slice.sharePercent, 0);

    expect(sum).toBe(100);
  });

  it('splits the commission bill into paid and pending', () => {
    const owed = Math.round(headline.grossRevenueCents * COMMISSION_RATE);

    expect(headline.paidCommissionsCents + headline.pendingCommissionsCents).toBe(owed);
  });

  it('pays each month the rate on the revenue of that same month', () => {
    for (const point of monthlyTrend) {
      expect(point.commissionsCents).toBe(Math.round(point.salesCents * COMMISSION_RATE));
    }
  });

  it('never lets the months add up to more than the gross revenue', () => {
    const sum = monthlyTrend.reduce((total, point) => total + point.salesCents, 0);

    expect(sum).toBeLessThanOrEqual(headline.grossRevenueCents);
  });

  it('lists the ranking from the best seller down', () => {
    const sales = topAffiliates.map((affiliate) => affiliate.sales);

    expect(sales).toEqual([...sales].sort((a, b) => b - a));
  });

  it('derives every ranking commission from the revenue that generated it', () => {
    for (const affiliate of topAffiliates) {
      expect(affiliate.commissionCents).toBe(Math.round(affiliate.revenueCents * COMMISSION_RATE));
    }
  });

  it('ranks only categories that the segmentation chart knows', () => {
    const known = categoryMix.map((slice) => slice.category);

    for (const affiliate of topAffiliates) {
      expect(known).toContain(affiliate.category);
    }
  });
});
