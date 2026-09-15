import { CouponStatusEnum, CouponSummary } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { CouponRepository } from '@Domain/coupons/coupon.repository';
import { CouponGateway } from '@Domain/coupons/coupon-gateway';
import { CouponNotFoundError, EmptyCouponChangeError } from '@Domain/coupons/coupons.errors';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface ChangeAffiliateCouponInput {
  /** O afiliado dono do cupom, pelo `public_id` que veio na rota. */
  publicId: string;
  /** Quem alterou, pelo `public_id` que veio no token: vai para a trilha do cupom. */
  actorPublicId: string;
  /** Ao menos um dos dois; nenhum é `EmptyCouponChangeError`. */
  status?: CouponStatusEnum;
  discountPercent?: number;
}

/**
 * Desativar, reativar ou mudar o percentual do cupom depois que ele já foi
 * emitido. Não mexe no cadastro: um cupom inativo não reprova o afiliado nem
 * lhe tira a conta — ele só deixa de valer no checkout, e é a analista quem
 * escolhe isso.
 */
export class ChangeAffiliateCouponUseCase
  implements UseCase<ChangeAffiliateCouponInput, CouponSummary>
{
  constructor(
    private readonly affiliateRepository: AffiliateRepository,
    private readonly userRepository: UserRepository,
    private readonly couponRepository: CouponRepository,
    private readonly couponGateway: CouponGateway,
  ) {}

  async execute(input: ChangeAffiliateCouponInput): Promise<CouponSummary> {
    if (input.status === undefined && input.discountPercent === undefined) {
      throw new EmptyCouponChangeError();
    }

    const affiliate = await this.affiliateRepository.findByPublicId(input.publicId);

    if (!affiliate) throw new AffiliateNotFoundError();
    if (!affiliate.coupon) throw new CouponNotFoundError();

    const actor = await this.userRepository.findByPublicId(input.actorPublicId);
    if (!actor) throw new UnknownOperatorError();

    /*
      O registro da mudança na Porto vem antes da escrita, como na aprovação: se
      ela recusar ou não responder, o erro sobe daqui e nada muda — gravar antes
      deixaria o painel mostrando um cupom que o checkout não conhece.
    */
    await this.couponGateway.change({
      code: affiliate.coupon.code,
      status: input.status,
      discountPercent: input.discountPercent,
    });

    // O cupom é nosso: grava-se o que a analista pediu, e não o que a Porto
    // devolveu. Campo ausente continua ausente — o repositório não mexe nele.
    const coupon = await this.couponRepository.change({
      couponId: affiliate.coupon.id,
      status: input.status,
      discountPercent: input.discountPercent,
      actorUserId: actor.id,
    });

    if (!coupon) throw new CouponNotFoundError();

    return { code: coupon.code, discountPercent: coupon.discountPercent, status: coupon.status };
  }
}
