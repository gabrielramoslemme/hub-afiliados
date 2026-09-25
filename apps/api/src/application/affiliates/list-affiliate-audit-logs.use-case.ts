import { AuditChangeTypeEnum, AuditEntityEnum, UserTypeEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { AuditDiff } from '@Domain/audit/audit-log.entity';
import { AuditLogRepository } from '@Domain/audit/audit-log.repository';
import { UseCase } from '../use-case';

export interface AffiliateAuditLogOutput {
  entity: AuditEntityEnum;
  changeType: AuditChangeTypeEnum;
  diff: AuditDiff;
  justification: string | null;
  actorName: string | null;
  actorType: UserTypeEnum | null;
  createdAt: Date;
}

/**
 * A trilha de auditoria do detalhe do afiliado. Sai inteira, chave PIX
 * inclusive: é a rota do detalhe, que já mostra o CPF e a chave completos.
 */
export class ListAffiliateAuditLogsUseCase implements UseCase<string, AffiliateAuditLogOutput[]> {
  constructor(
    private readonly affiliateRepository: AffiliateRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(publicId: string): Promise<AffiliateAuditLogOutput[]> {
    // O `public_id` é o que entra pela rota; a trilha é indexada pelo id
    // interno, e resolver um no outro é trabalho de quem conhece os dois.
    const affiliate = await this.affiliateRepository.findByPublicId(publicId);

    if (!affiliate) throw new AffiliateNotFoundError();

    const entries = await this.auditLogRepository.listByAffiliateId(affiliate.id);

    return entries.map((entry) => ({
      entity: entry.entity,
      changeType: entry.changeType,
      diff: entry.diff,
      justification: entry.justification,
      actorName: entry.actor?.name ?? null,
      actorType: entry.actor?.type ?? null,
      createdAt: entry.createdAt,
    }));
  }
}
