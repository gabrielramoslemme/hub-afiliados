import { CouponHistoryRepository } from '@Domain/coupons/coupon-history.repository';

export const couponHistoryRepositoryMock = (): jest.Mocked<CouponHistoryRepository> => ({
  listByCouponId: jest.fn().mockResolvedValue([]),
});
