import { IncentiveStatusEnum, ReferralPeriodEnum, ReferralStatusEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildSale } from '@Testing/factories/sale.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { saleRepositoryMock } from '@Testing/mocks/repositories/sale.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { GetAffiliateReferralsUseCase } from './get-affiliate-referrals.use-case';

describe('GetAffiliateReferralsUseCase', () => {
  const NOW = new Date('2026-09-25T15:00:00.000Z');

  let userRepository: ReturnType<typeof userRepositoryMock>;
  let saleRepository: ReturnType<typeof saleRepositoryMock>;

  const user = buildUser();
  const coupon = buildCoupon({ id: 7 });

  function useCase(now = NOW): GetAffiliateReferralsUseCase {
    return new GetAffiliateReferralsUseCase(userRepository, saleRepository, clockMock(now));
  }

  function sale(soldAt: string, incentiveStatus: IncentiveStatusEnum, cents = 1000) {
    return buildSale({
      couponId: 7,
      soldAt: new Date(soldAt),
      incentiveStatus,
      amountCents: cents * 10,
      incentiveCents: cents,
    });
  }

  beforeEach(() => {
    userRepository = userRepositoryMock();
    saleRepository = saleRepositoryMock();
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      affiliate: buildAffiliate({ user, coupon }),
    });
  });

  it('reads the sales of the coupon of the person behind the token', async () => {
    await useCase().execute({ userPublicId: user.publicId, period: ReferralPeriodEnum.ALL });

    expect(saleRepository.listByCoupon).toHaveBeenCalledWith(7);
  });

  it.each([
    [IncentiveStatusEnum.PENDING, ReferralStatusEnum.PENDING],
    [IncentiveStatusEnum.RELEASED, ReferralStatusEnum.COMPLETED],
    [IncentiveStatusEnum.CANCELED, ReferralStatusEnum.CANCELED],
  ])('shows a %s sale as %s', async (incentiveStatus, status) => {
    saleRepository.listByCoupon.mockResolvedValue([sale('2026-09-20T12:00:00Z', incentiveStatus)]);

    const result = await useCase().execute({
      userPublicId: user.publicId,
      period: ReferralPeriodEnum.ALL,
    });

    expect(result.entries[0].status).toBe(status);
  });

  describe('period', () => {
    it('keeps the last 30 days, counted back from now', async () => {
      saleRepository.listByCoupon.mockResolvedValue([
        sale('2026-08-26T15:00:00Z', IncentiveStatusEnum.RELEASED),
        sale('2026-08-26T14:59:59Z', IncentiveStatusEnum.RELEASED),
      ]);

      const result = await useCase().execute({
        userPublicId: user.publicId,
        period: ReferralPeriodEnum.LAST_30_DAYS,
      });

      expect(result.entries.map((entry) => entry.occurredAt)).toEqual([
        new Date('2026-08-26T15:00:00Z'),
      ]);
    });

    /*
      O ano vira à meia-noite de São Paulo. Às 02h UTC de 1º de janeiro de 2026
      ainda é 2025 lá — e a venda das 23h30 de 31/12/2024, já 2025 em UTC, é do
      ano anterior.
    */
    it('takes the year from São Paulo, not from Greenwich', async () => {
      saleRepository.listByCoupon.mockResolvedValue([
        sale('2025-12-31T23:00:00-03:00', IncentiveStatusEnum.RELEASED),
        sale('2025-01-01T00:00:00-03:00', IncentiveStatusEnum.RELEASED),
        sale('2024-12-31T23:30:00-03:00', IncentiveStatusEnum.RELEASED),
      ]);

      const result = await useCase(new Date('2026-01-01T02:00:00Z')).execute({
        userPublicId: user.publicId,
        period: ReferralPeriodEnum.YEAR,
      });

      expect(result.entries.map((entry) => entry.occurredAt)).toEqual([
        new Date('2025-12-31T23:00:00-03:00'),
        new Date('2025-01-01T00:00:00-03:00'),
      ]);
    });

    /* O resumo é o acumulado: o número do topo não muda de sentido com a aba. */
    it('summarizes every sale, whatever the period asked', async () => {
      saleRepository.listByCoupon.mockResolvedValue([
        sale('2026-09-20T12:00:00Z', IncentiveStatusEnum.PENDING, 500),
        sale('2026-09-10T12:00:00Z', IncentiveStatusEnum.RELEASED, 2700),
        sale('2025-03-10T12:00:00Z', IncentiveStatusEnum.RELEASED, 1300),
        sale('2025-02-10T12:00:00Z', IncentiveStatusEnum.CANCELED, 900),
      ]);

      const result = await useCase().execute({
        userPublicId: user.publicId,
        period: ReferralPeriodEnum.LAST_30_DAYS,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.summary).toEqual({
        salesCents: 40000,
        salesCount: 2,
        confirmedIncentiveCents: 4000,
        pendingIncentiveCents: 500,
        couponUses: 4,
      });
    });
  });

  it('answers an empty list for an affiliate still without a coupon', async () => {
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      affiliate: buildAffiliate({ user, coupon: null }),
    });

    const result = await useCase().execute({
      userPublicId: user.publicId,
      period: ReferralPeriodEnum.ALL,
    });

    expect(result.entries).toEqual([]);
    expect(result.summary.couponUses).toBe(0);
    expect(saleRepository.listByCoupon).not.toHaveBeenCalled();
  });

  it('refuses a token whose user has no affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(
      useCase().execute({ userPublicId: user.publicId, period: ReferralPeriodEnum.ALL }),
    ).rejects.toThrow(UnknownAffiliateError);
  });
});
