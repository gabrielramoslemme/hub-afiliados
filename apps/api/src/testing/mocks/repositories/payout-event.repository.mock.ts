import { PayoutEventRepository } from '@Domain/withdrawals/payout-event.repository';

export const payoutEventRepositoryMock = (): jest.Mocked<PayoutEventRepository> => ({
  record: jest.fn().mockResolvedValue(undefined),
  listByWithdrawal: jest.fn().mockResolvedValue([]),
});
