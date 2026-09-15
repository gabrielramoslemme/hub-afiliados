import {
  AffiliateStatusEnum,
  CouponStatusEnum,
  MailTemplateEnum,
  TokenPurposeEnum,
} from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import {
  AffiliateAlreadyDecidedError,
  AffiliateNotFoundError,
} from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { TokenGenerator } from '@Domain/auth/token-generator';
import { CouponRepository } from '@Domain/coupons/coupon.repository';
import { sanitizeCouponCode } from '@Domain/coupons/coupon-code.util';
import { CouponGateway } from '@Domain/coupons/coupon-gateway';
import { CouponCodeUnavailableError } from '@Domain/coupons/coupons.errors';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { Mailer } from '@Domain/notifications/mailer';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface ApproveAffiliateInput {
  publicId: string;
  /** Quem decidiu, pelo `public_id` que veio no token. */
  actorPublicId: string;
  /** O cupom que a analista escolheu no diálogo de aprovação. */
  couponCode: string;
  couponDiscountPercent: number;
}

const SET_PASSWORD_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export class ApproveAffiliateUseCase implements UseCase<ApproveAffiliateInput, void> {
  constructor(
    private readonly affiliateRepository: AffiliateRepository,
    private readonly userRepository: UserRepository,
    private readonly couponRepository: CouponRepository,
    private readonly couponGateway: CouponGateway,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly linkBuilder: LinkBuilder,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
  ) {}

  async execute(input: ApproveAffiliateInput): Promise<void> {
    const affiliate = await this.affiliateRepository.findByPublicId(input.publicId);

    if (!affiliate) throw new AffiliateNotFoundError();
    if (affiliate.status !== AffiliateStatusEnum.PENDING_APPROVAL) {
      throw new AffiliateAlreadyDecidedError();
    }

    const actor = await this.userRepository.findByPublicId(input.actorPublicId);
    if (!actor) throw new UnknownOperatorError();

    const code = sanitizeCouponCode(input.couponCode);

    if (await this.couponRepository.findByCode(code)) throw new CouponCodeUnavailableError();

    /*
      O registro na Porto vem antes de qualquer escrita nossa. O cupom é nosso,
      mas gravado aqui e não registrado lá ele não valeria no checkout: se a
      Porto recusar o código ou não responder, o erro sobe daqui e o cadastro
      fica exatamente como estava — em análise, sem e-mail enviado e sem trilha
      registrando uma decisão que não aconteceu.
    */
    await this.couponGateway.issue({ code, discountPercent: input.couponDiscountPercent });

    const now = this.clock.now();

    /*
      Daqui em diante o cupom já vale no checkout. Se a aprovação não for
      gravada — outra decisão chegou antes ao lock, outra aprovação gravou o
      mesmo código, ou o banco falhou —, o cupom que ficou sem dono é desativado
      lá antes de o erro subir: cupom ativo sem dono do lado de cá é desconto
      dado em nome de ninguém.
    */
    const approved = await this.affiliateRepository
      .changeStatus({
        affiliateId: affiliate.id,
        expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: actor.id,
        changes: { approvedAt: now, approvedByUserId: actor.id, rejectionReason: null },
        coupon: {
          code,
          discountPercent: input.couponDiscountPercent,
          status: CouponStatusEnum.ACTIVE,
        },
      })
      .catch(async (error: unknown) => {
        await this.withdrawOrphanedCoupon(code);
        throw error;
      });

    if (!approved) {
      await this.withdrawOrphanedCoupon(code);
      throw new AffiliateAlreadyDecidedError();
    }

    // O link é o único caminho do afiliado para definir a senha, então um
    // pedido novo invalida os anteriores: dois links válidos ao mesmo tempo são
    // superfície de ataque.
    const { token, hash } = this.tokenGenerator.generate();
    await this.passwordResetTokenRepository.invalidateAllFor(
      affiliate.userId,
      TokenPurposeEnum.SET_PASSWORD,
    );
    await this.passwordResetTokenRepository.create({
      userId: affiliate.userId,
      tokenHash: hash,
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: new Date(now.getTime() + SET_PASSWORD_TOKEN_TTL_MS),
    });

    // O port nunca lança: e-mail não enviado é incidente operacional, e não
    // pode reverter uma aprovação que já está gravada.
    await this.mailer.send({
      template: MailTemplateEnum.REGISTRATION_APPROVED,
      to: affiliate.user.email,
      toName: affiliate.user.name,
      variables: {
        name: affiliate.user.name.split(' ')[0],
        link: this.linkBuilder.setPasswordLink(token),
        coupon: code,
        discountPercent: String(input.couponDiscountPercent),
      },
    });
  }

  /**
   * Só desativa o cupom que ficou sem dono. Um código existe uma vez só na
   * Porto: se outra aprovação já o gravou aqui, o cupom registrado lá é dela, e
   * desativá-lo tiraria do checkout o desconto de quem ganhou a corrida.
   *
   * Sem conseguir perguntar ao banco — o caso comum quando a gravação acabou de
   * falhar —, desativa: não saber de quem é o cupom não é motivo para deixá-lo
   * valendo em nome de ninguém.
   *
   * Melhor esforço: se a desativação também falhar, o erro que importa à
   * analista continua sendo o da aprovação, e o adapter já deixou a falha dele
   * no log.
   */
  private async withdrawOrphanedCoupon(code: string): Promise<void> {
    const owner = await this.couponRepository.findByCode(code).catch(() => null);

    if (owner) return;

    await this.couponGateway
      .change({ code, status: CouponStatusEnum.INACTIVE })
      .catch(() => undefined);
  }
}
