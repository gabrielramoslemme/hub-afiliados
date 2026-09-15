import { CouponRepository } from '@Domain/coupons/coupon.repository';

export const couponRepositoryMock = (): jest.Mocked<CouponRepository> => ({
  findByCode: jest.fn().mockResolvedValue(null),
  change: jest.fn().mockResolvedValue(null),
});
