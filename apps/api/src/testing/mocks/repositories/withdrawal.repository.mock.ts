import { PayoutEventOutcomeEnum } from '@porto/contracts';
import { WithdrawalRepository } from '@Domain/withdrawals/withdrawal.repository';

export const withdrawalRepositoryMock = (): jest.Mocked<WithdrawalRepository> => ({
  reserve: jest.fn().mockResolvedValue(null),
  markProcessing: jest.fn().mockResolvedValue(undefined),
  applyPayoutUpdate: jest
    .fn()
    .mockResolvedValue({ outcome: PayoutEventOutcomeEnum.UNKNOWN_WITHDRAWAL, withdrawal: null }),
  listByAffiliate: jest.fn().mockResolvedValue([]),
  listStale: jest.fn().mockResolvedValue([]),
  search: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 }),
  findByPublicId: jest.fn().mockResolvedValue(null),
});
