import { AffiliateStatusEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { UseCase } from '../use-case';

export interface AffiliateStatusHistoryOutput {
  fromStatus: AffiliateStatusEnum | null;
  toStatus: AffiliateStatusEnum;
  reason: string | null;
  actorName: string | null;
  createdAt: Date;
}

export class ListAffiliateStatusHistoryUseCase
  implements UseCase<string, AffiliateStatusHistoryOutput[]>
{
  constructor(
    private readonly affiliateRepository: AffiliateRepository,
    private readonly affiliateStatusHistoryRepository: AffiliateStatusHistoryRepository,
  ) {}

  async execute(publicId: string): Promise<AffiliateStatusHistoryOutput[]> {
    // O `public_id` é o que entra pela rota; a trilha é indexada pelo id
    // interno, e resolver um no outro é trabalho de quem conhece os dois.
    const affiliate = await this.affiliateRepository.findByPublicId(publicId);

    if (!affiliate) throw new AffiliateNotFoundError();

    const entries = await this.affiliateStatusHistoryRepository.listByAffiliateId(affiliate.id);

    return entries.map((entry) => ({
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      actorName: entry.actor?.name ?? null,
      createdAt: entry.createdAt,
    }));
  }
}
