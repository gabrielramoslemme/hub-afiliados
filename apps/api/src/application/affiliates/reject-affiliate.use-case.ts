import { AffiliateStatusEnum, MailTemplateEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import {
  AffiliateAlreadyDecidedError,
  AffiliateNotFoundError,
} from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { Mailer } from '@Domain/notifications/mailer';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface RejectAffiliateInput {
  publicId: string;
  actorPublicId: string;
  /** Obrigatório: o `CHECK` da tabela recusa reprovação sem motivo. */
  reason: string;
}

/**
 * Irmão do `ApproveAffiliateUseCase`, e não um parâmetro dele: os dois
 * compartilham só a guarda de transição, e divergem no que gravam e no e-mail
 * que mandam. Um use case com `toStatus` na entrada esconderia a divergência
 * atrás de dois `if`.
 */
export class RejectAffiliateUseCase implements UseCase<RejectAffiliateInput, void> {
  constructor(
    private readonly affiliateRepository: AffiliateRepository,
    private readonly userRepository: UserRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(input: RejectAffiliateInput): Promise<void> {
    const affiliate = await this.affiliateRepository.findByPublicId(input.publicId);

    if (!affiliate) throw new AffiliateNotFoundError();
    if (affiliate.status !== AffiliateStatusEnum.PENDING_APPROVAL) {
      throw new AffiliateAlreadyDecidedError();
    }

    const actor = await this.userRepository.findByPublicId(input.actorPublicId);
    if (!actor) throw new UnknownOperatorError();

    const rejected = await this.affiliateRepository.changeStatus({
      affiliateId: affiliate.id,
      toStatus: AffiliateStatusEnum.REJECTED,
      reason: input.reason,
      actorUserId: actor.id,
      changes: { rejectionReason: input.reason },
    });

    if (!rejected) throw new AffiliateNotFoundError();

    await this.mailer.send({
      template: MailTemplateEnum.REGISTRATION_REJECTED,
      to: affiliate.user.email,
      toName: affiliate.user.name,
      variables: { name: affiliate.user.name.split(' ')[0], reason: input.reason },
    });
  }
}
