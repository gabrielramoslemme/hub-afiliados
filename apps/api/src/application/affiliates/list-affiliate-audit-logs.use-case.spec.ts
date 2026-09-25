import { AffiliateStatusEnum, AuditChangeTypeEnum, AuditEntityEnum } from '@porto/contracts';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { auditLogRepositoryMock } from '@Testing/mocks/repositories/audit-log.repository.mock';
import { ListAffiliateAuditLogsUseCase } from './list-affiliate-audit-logs.use-case';

describe('ListAffiliateAuditLogsUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let auditLogRepository: ReturnType<typeof auditLogRepositoryMock>;
  let useCase: ListAffiliateAuditLogsUseCase;

  const affiliate = buildAffiliate();

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    auditLogRepository = auditLogRepositoryMock();
    useCase = new ListAffiliateAuditLogsUseCase(affiliateRepository, auditLogRepository);
  });

  it('reads the trail of the resolved affiliate, naming who acted and which kind of user', async () => {
    const analyst = buildAdminUser({ name: 'Analista Porto' });
    affiliateRepository.findByPublicId.mockResolvedValue({ ...affiliate, approvedBy: null });
    auditLogRepository.listByAffiliateId.mockResolvedValue([
      {
        id: 7,
        entity: AuditEntityEnum.AFFILIATE,
        entityId: affiliate.id,
        actorUserId: analyst.id,
        actor: analyst,
        changeType: AuditChangeTypeEnum.UPDATE,
        diff: { status: { from: AffiliateStatusEnum.PENDING_APPROVAL, to: 'REJECTED' } },
        justification: 'Documento ilegível',
        createdAt: new Date('2026-08-20T09:00:00Z'),
      },
    ]);

    await expect(useCase.execute(affiliate.publicId)).resolves.toEqual([
      {
        entity: AuditEntityEnum.AFFILIATE,
        changeType: AuditChangeTypeEnum.UPDATE,
        diff: { status: { from: AffiliateStatusEnum.PENDING_APPROVAL, to: 'REJECTED' } },
        justification: 'Documento ilegível',
        actorName: 'Analista Porto',
        actorType: analyst.type,
        createdAt: new Date('2026-08-20T09:00:00Z'),
      },
    ]);
    expect(auditLogRepository.listByAffiliateId).toHaveBeenCalledWith(affiliate.id);
  });

  it('reports an affiliate that does not exist', async () => {
    await expect(useCase.execute('missing')).rejects.toThrow(AffiliateNotFoundError);
    expect(auditLogRepository.listByAffiliateId).not.toHaveBeenCalled();
  });
});
