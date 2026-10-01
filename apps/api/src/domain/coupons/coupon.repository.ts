import { CouponStatusEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';
import { CouponEntity } from './coupon.entity';

export const COUPON_REPOSITORY = createToken<CouponRepository>('COUPON_REPOSITORY');

export interface ChangeCouponRecordInput {
  couponId: number;
  /** Ausente quer dizer "não mexe nesta coluna", não "apaga". */
  discountPercent?: number;
  status?: CouponStatusEnum;
  /** Quem pediu a mudança: vai para a trilha do cupom, gravada na mesma transação. */
  actorUserId: number;
}

export interface CouponRepository {
  /**
   * O código chega já normalizado por `sanitizeCouponCode`. Existir aqui basta
   * para recusar: o cupom é exclusivo do afiliado, e não há dois donos.
   */
  findByCode(code: string): Promise<CouponEntity | null>;
  /**
   * Grava a mudança que a analista pediu, depois de a Porto registrá-la, e o
   * antes e o depois na trilha do cupom. Devolve a linha como ficou, ou nulo se o
   * cupom sumiu entre a leitura e a escrita.
   */
  change(input: ChangeCouponRecordInput): Promise<CouponEntity | null>;
  /**
   * Roda `work` com exclusividade sobre o cupom: outra chamada para o mesmo
   * cupom espera esta terminar, com sucesso ou erro. É o que faz a ordem das
   * mudanças na Porto ser a ordem das escritas aqui. Esperar demais lança
   * `CouponChangeInProgressError`.
   */
  runExclusive<T>(couponId: number, work: () => Promise<T>): Promise<T>;
}
