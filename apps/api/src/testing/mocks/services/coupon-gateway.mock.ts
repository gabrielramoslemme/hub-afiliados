import { CouponGateway } from '@Domain/coupons/coupon-gateway';

export const couponGatewayMock = (): jest.Mocked<CouponGateway> => ({
  checkAvailability: jest.fn().mockResolvedValue({ available: true, reason: null }),
  issue: jest.fn().mockResolvedValue(undefined),
  change: jest.fn().mockResolvedValue(undefined),
});
