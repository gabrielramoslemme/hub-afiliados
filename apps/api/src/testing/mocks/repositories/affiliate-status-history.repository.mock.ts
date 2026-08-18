import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';

export const affiliateStatusHistoryRepositoryMock =
  (): jest.Mocked<AffiliateStatusHistoryRepository> => ({
    listByAffiliateId: jest.fn().mockResolvedValue([]),
  });
