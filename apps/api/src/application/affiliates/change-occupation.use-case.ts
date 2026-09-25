import { OccupationEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface ChangeOccupationInput {
  /** O `sub` do token: a ocupação trocada é sempre a de quem assinou a sessão. */
  userPublicId: string;
  occupation: OccupationEnum;
}

/**
 * Sem senha e sem aviso por e-mail, ao contrário do PIX e do e-mail: a ocupação
 * não desvia pagamento nem toma a conta. A trilha de auditoria registra a troca
 * do mesmo jeito.
 */
export class ChangeOccupationUseCase implements UseCase<ChangeOccupationInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly affiliateRepository: AffiliateRepository,
  ) {}

  async execute(input: ChangeOccupationInput): Promise<void> {
    const user = await this.userRepository.findByPublicId(input.userPublicId);

    if (!user?.affiliate) throw new UnknownAffiliateError();

    await this.affiliateRepository.updateWithAudit({
      affiliateId: user.affiliate.id,
      changes: { occupation: input.occupation },
      actorUserId: user.id,
    });
  }
}
