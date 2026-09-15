import { CouponStatusEnum } from '@porto/contracts';
import { CouponHistoryWithActor } from '@Domain/coupons/coupon-history.entity';

let sequence = 0;

export function buildCouponHistory(
  overrides: Partial<CouponHistoryWithActor> = {},
): CouponHistoryWithActor {
  sequence += 1;
  return {
    id: sequence,
    couponId: sequence,
    fromStatus: CouponStatusEnum.ACTIVE,
    toStatus: CouponStatusEnum.INACTIVE,
    fromDiscountPercent: 10,
    toDiscountPercent: 10,
    actorUserId: null,
    actor: null,
    createdAt: new Date('2026-09-01T12:00:00Z'),
    ...overrides,
  };
}
