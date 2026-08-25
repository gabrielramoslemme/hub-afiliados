import { AffiliateStatusEnum, MailTemplateEnum, TokenPurposeEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import {
  AffiliateAlreadyDecidedError,
  AffiliateNotFoundError,
} from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { TokenGenerator } from '@Domain/auth/token-generator';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { Mailer } from '@Domain/notifications/mailer';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface ApproveAffiliateInput {
  publicId: string;
  /** Quem decidiu, pelo `public_id` que veio no token. */
  actorPublicId: string;
}

const SET_PASSWORD_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export class ApproveAffiliateUseCase implements UseCase<ApproveAffiliateInput, void> {
  constructor(
    private readonly affiliateRepository: AffiliateRepository,
    private readonly userRepository: UserRepository,
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

    const now = this.clock.now();

    const approved = await this.affiliateRepository.changeStatus({
      affiliateId: affiliate.id,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: actor.id,
      changes: { approvedAt: now, approvedByUserId: actor.id, rejectionReason: null },
    });

    if (!approved) throw new AffiliateNotFoundError();

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
      },
    });
  }
}
