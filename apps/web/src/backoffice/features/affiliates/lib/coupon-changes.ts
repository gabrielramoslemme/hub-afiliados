import type { ChangeCouponRequest } from '@porto/contracts';

export type TouchedCouponFields = Partial<Record<keyof ChangeCouponRequest, boolean>>;

/**
 * Só o que a analista tocou: reafirmar o percentual numa desativação não é
 * neutro para a Porto, que trata campo presente como pedido de mudança.
 */
export function couponChanges(
  values: ChangeCouponRequest,
  touched: TouchedCouponFields,
): ChangeCouponRequest {
  const changes: ChangeCouponRequest = {};

  if (touched.status) changes.status = values.status;
  if (touched.discountPercent) changes.discountPercent = values.discountPercent;

  return changes;
}
