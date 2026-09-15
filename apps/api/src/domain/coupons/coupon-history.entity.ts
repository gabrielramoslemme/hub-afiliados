import { CouponStatusEnum } from '@porto/contracts';
import { UserEntity } from '@Domain/users/user.entity';

/**
 * Um registro da trilha do cupom: a emissão e cada alteração, com o antes e o
 * depois do que pode mudar. Append-only, como a trilha do cadastro — é o que o
 * RF-33 pede para criação e inativação de cupom.
 */
export interface CouponHistoryEntity {
  id: number;
  couponId: number;
  /** Nulo na emissão, que é o primeiro registro. */
  fromStatus: CouponStatusEnum | null;
  toStatus: CouponStatusEnum;
  fromDiscountPercent: number | null;
  toDiscountPercent: number;
  actorUserId: number | null;
  createdAt: Date;
}

export interface CouponHistoryWithActor extends CouponHistoryEntity {
  actor: UserEntity | null;
}
