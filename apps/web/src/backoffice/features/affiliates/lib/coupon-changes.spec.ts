import { CouponStatusEnum } from '@porto/contracts';
import { couponChanges } from './coupon-changes';

const saved = { status: CouponStatusEnum.INACTIVE, discountPercent: 10 };

/* O INT-01 trata campo ausente como "não mexe": reafirmar o que não mudou não é neutro. */
describe('couponChanges', () => {
  it('carries only the status when only the status was touched', () => {
    expect(couponChanges(saved, { status: true })).toEqual({ status: CouponStatusEnum.INACTIVE });
  });

  it('carries only the discount when only the discount was touched', () => {
    expect(couponChanges(saved, { discountPercent: true })).toEqual({ discountPercent: 10 });
  });

  it('carries both when both were touched', () => {
    expect(couponChanges(saved, { status: true, discountPercent: true })).toEqual(saved);
  });
});
