import { IncentiveEventRepository } from '@Domain/sales/incentive-event.repository';

export const incentiveEventRepositoryMock = (): jest.Mocked<IncentiveEventRepository> => ({
  record: jest.fn().mockResolvedValue(undefined),
});
