import { CouponStatusEnum } from '@porto/contracts';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildCouponHistory } from '@Testing/factories/coupon-history.factory';
import { buildAdminUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { couponHistoryRepositoryMock } from '@Testing/mocks/repositories/coupon-history.repository.mock';
import { ListCouponHistoryUseCase } from './list-coupon-history.use-case';

describe('ListCouponHistoryUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let couponHistoryRepository: ReturnType<typeof couponHistoryRepositoryMock>;
  let useCase: ListCouponHistoryUseCase;

  const coupon = buildCoupon({ id: 7, code: 'MARINA25' });
  const affiliate = buildAffiliate({ coupon });
  const analyst = buildAdminUser({ name: 'Analista Porto' });

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    couponHistoryRepository = couponHistoryRepositoryMock();
    useCase = new ListCouponHistoryUseCase(affiliateRepository, couponHistoryRepository);

    affiliateRepository.findByPublicId.mockResolvedValue({ ...affiliate, approvedBy: null });
  });

  it('lists the coupon trail with who did each change', async () => {
    couponHistoryRepository.listByCouponId.mockResolvedValue([
      buildCouponHistory({ couponId: 7, actorUserId: analyst.id, actor: analyst }),
      buildCouponHistory({
        couponId: 7,
        fromStatus: null,
        toStatus: CouponStatusEnum.ACTIVE,
        fromDiscountPercent: null,
        createdAt: new Date('2026-08-25T12:00:00Z'),
      }),
    ]);

    await expect(useCase.execute(affiliate.publicId)).resolves.toEqual([
      {
        fromStatus: CouponStatusEnum.ACTIVE,
        toStatus: CouponStatusEnum.INACTIVE,
        fromDiscountPercent: 10,
        toDiscountPercent: 10,
        actorName: 'Analista Porto',
        createdAt: new Date('2026-09-01T12:00:00Z'),
      },
      {
        fromStatus: null,
        toStatus: CouponStatusEnum.ACTIVE,
        fromDiscountPercent: null,
        toDiscountPercent: 10,
        actorName: null,
        createdAt: new Date('2026-08-25T12:00:00Z'),
      },
    ]);
    expect(couponHistoryRepository.listByCouponId).toHaveBeenCalledWith(7);
  });

  it('answers an empty trail while the registration has no coupon', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue({
      ...affiliate,
      approvedBy: null,
      coupon: null,
    });

    await expect(useCase.execute(affiliate.publicId)).resolves.toEqual([]);
    expect(couponHistoryRepository.listByCouponId).not.toHaveBeenCalled();
  });

  it('reports an affiliate that does not exist', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(affiliate.publicId)).rejects.toThrow(AffiliateNotFoundError);
  });
});
