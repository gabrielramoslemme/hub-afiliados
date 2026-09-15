import { CouponStatusEnum } from '@porto/contracts';
import { CouponEntity } from '@Domain/coupons/coupon.entity';

let sequence = 0;

export function buildCoupon(overrides: Partial<CouponEntity> = {}): CouponEntity {
  sequence += 1;
  return {
    id: sequence,
    publicId: `20000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    affiliateId: sequence,
    code: `CUPOM${String(sequence).padStart(3, '0')}`,
    discountPercent: 10,
    status: CouponStatusEnum.ACTIVE,
    createdAt: new Date('2026-08-25T12:00:00Z'),
    updatedAt: new Date('2026-08-25T12:00:00Z'),
    ...overrides,
  };
}
