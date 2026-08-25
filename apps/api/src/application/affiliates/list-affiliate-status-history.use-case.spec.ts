import { AffiliateStatusEnum } from '@porto/contracts';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { affiliateStatusHistoryRepositoryMock } from '@Testing/mocks/repositories/affiliate-status-history.repository.mock';
import { ListAffiliateStatusHistoryUseCase } from './list-affiliate-status-history.use-case';

describe('ListAffiliateStatusHistoryUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let affiliateStatusHistoryRepository: ReturnType<typeof affiliateStatusHistoryRepositoryMock>;
  let useCase: ListAffiliateStatusHistoryUseCase;

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    affiliateStatusHistoryRepository = affiliateStatusHistoryRepositoryMock();
    useCase = new ListAffiliateStatusHistoryUseCase(
      affiliateRepository,
      affiliateStatusHistoryRepository,
    );
  });

  it('resolves the public id before reading the trail', async () => {
    const affiliate = buildAffiliate();
    affiliateRepository.findByPublicId.mockResolvedValue({ ...affiliate, approvedBy: null });

    await useCase.execute(affiliate.publicId);

    expect(affiliateStatusHistoryRepository.listByAffiliateId).toHaveBeenCalledWith(affiliate.id);
  });

  it('names the actor of each transition', async () => {
    const affiliate = buildAffiliate();
    affiliateRepository.findByPublicId.mockResolvedValue({ ...affiliate, approvedBy: null });
    affiliateStatusHistoryRepository.listByAffiliateId.mockResolvedValue([
      {
        id: 2,
        affiliateId: affiliate.id,
        fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        reason: null,
        actorUserId: 10,
        actor: buildAdminUser({ name: 'Analista Porto' }),
        createdAt: new Date('2026-08-20T09:00:00Z'),
      },
      {
        id: 1,
        affiliateId: affiliate.id,
        fromStatus: null,
        toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        reason: null,
        actorUserId: null,
        actor: null,
        createdAt: new Date('2026-08-17T12:00:00Z'),
      },
    ]);

    await expect(useCase.execute(affiliate.publicId)).resolves.toEqual([
      {
        fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        reason: null,
        actorName: 'Analista Porto',
        createdAt: new Date('2026-08-20T09:00:00Z'),
      },
      {
        fromStatus: null,
        toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        reason: null,
        actorName: null,
        createdAt: new Date('2026-08-17T12:00:00Z'),
      },
    ]);
  });

  it('reports an affiliate that does not exist', async () => {
    await expect(useCase.execute('missing')).rejects.toThrow(AffiliateNotFoundError);
    expect(affiliateStatusHistoryRepository.listByAffiliateId).not.toHaveBeenCalled();
  });
});
