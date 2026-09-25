import { PayoutGateway } from '@Domain/withdrawals/payout-gateway';

export const payoutGatewayMock = (): jest.Mocked<PayoutGateway> => ({
  isEnabled: jest.fn().mockReturnValue(true),
  requestPayout: jest.fn().mockResolvedValue({ batchId: 'batch-1' }),
  findPayout: jest.fn().mockResolvedValue(null),
});
