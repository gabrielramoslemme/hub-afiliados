import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { ListAffiliatesReportUseCase } from './list-affiliates-report.use-case';

describe('ListAffiliatesReportUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let useCase: ListAffiliatesReportUseCase;

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    useCase = new ListAffiliatesReportUseCase(affiliateRepository);
  });

  it('carries what the completed sales add up to', async () => {
    const affiliate = buildAffiliate();
    affiliateRepository.listForReport.mockResolvedValue([
      {
        ...affiliate,
        coupon: buildCoupon({ affiliateId: affiliate.id }),
        completedSales: { count: 3, amountCents: 45000, incentiveCents: 4500 },
      },
    ]);

    const [row] = await useCase.execute();

    expect(row).toMatchObject({
      completedSalesCount: 3,
      completedSalesCents: 45000,
      releasedIncentiveCents: 4500,
    });
  });

  it('answers zero, not an empty cell, for an affiliate without completed sales', async () => {
    affiliateRepository.listForReport.mockResolvedValue([
      { ...buildAffiliate(), coupon: null, completedSales: null },
    ]);

    const [row] = await useCase.execute();

    expect(row).toMatchObject({
      coupon: null,
      completedSalesCount: 0,
      completedSalesCents: 0,
      releasedIncentiveCents: 0,
    });
  });

  // A Porto não informa o que pagou: qualquer número aqui seria inventado.
  it('leaves the paid commission empty whatever the sales are', async () => {
    const affiliate = buildAffiliate();
    affiliateRepository.listForReport.mockResolvedValue([
      {
        ...affiliate,
        coupon: buildCoupon({ affiliateId: affiliate.id }),
        completedSales: { count: 1, amountCents: 1000, incentiveCents: 100 },
      },
    ]);

    const [row] = await useCase.execute();

    expect(row.paidCommissionCents).toBeNull();
  });
});
