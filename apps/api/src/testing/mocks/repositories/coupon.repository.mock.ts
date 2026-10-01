import { CouponRepository } from '@Domain/coupons/coupon.repository';

export const couponRepositoryMock = (): jest.Mocked<CouponRepository> => ({
  findByCode: jest.fn().mockResolvedValue(null),
  change: jest.fn().mockResolvedValue(null),
  // Sem concorrência no unitário: a seção exclusiva só roda o trabalho.
  runExclusive: jest
    .fn()
    .mockImplementation((_couponId: number, work: () => Promise<unknown>) => work()),
});
