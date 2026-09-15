import { CouponAvailabilityResponse } from '@porto/contracts';
import { CouponRepository } from '@Domain/coupons/coupon.repository';
import { isValidCouponCode, sanitizeCouponCode } from '@Domain/coupons/coupon-code.util';
import { CouponGateway } from '@Domain/coupons/coupon-gateway';
import { InvalidCouponCodeError } from '@Domain/coupons/coupons.errors';
import { UseCase } from '../use-case';

const TAKEN_HERE = 'Este código já está em uso por outro afiliado.';

/**
 * O que o diálogo de aprovação pergunta enquanto a analista digita, para o
 * conflito aparecer no campo e não no meio da aprovação. Não reserva nada: o
 * código só fica de fato tomado quando a aprovação o cria e a Porto o registra.
 */
export class CheckCouponAvailabilityUseCase implements UseCase<string, CouponAvailabilityResponse> {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly couponGateway: CouponGateway,
  ) {}

  async execute(rawCode: string): Promise<CouponAvailabilityResponse> {
    const code = sanitizeCouponCode(rawCode);

    if (!isValidCouponCode(code)) throw new InvalidCouponCodeError();

    // O que já é nosso não precisa ser perguntado a eles.
    if (await this.couponRepository.findByCode(code)) {
      return { code, available: false, reason: TAKEN_HERE };
    }

    const availability = await this.couponGateway.checkAvailability(code);

    return { code, available: availability.available, reason: availability.reason };
  }
}
