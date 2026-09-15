import { createToken } from '@Domain/shared/token';
import { CouponHistoryWithActor } from './coupon-history.entity';

export const COUPON_HISTORY_REPOSITORY = createToken<CouponHistoryRepository>(
  'COUPON_HISTORY_REPOSITORY',
);

/**
 * Só leitura: quem grava é quem muda o cupom — `AffiliateRepository.changeStatus`
 * na emissão, `CouponRepository.change` na alteração —, na mesma transação.
 * Trilha que pode ficar de fora não é trilha.
 */
export interface CouponHistoryRepository {
  /** Do mais recente para o mais antigo, como a trilha do cadastro. */
  listByCouponId(couponId: number): Promise<CouponHistoryWithActor[]>;
}
