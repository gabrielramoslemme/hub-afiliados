import { PixKeyTypeEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { WithdrawalWithAffiliate } from '@Domain/withdrawals/withdrawal.entity';

let sequence = 0;

export function buildWithdrawal(
  overrides: Partial<WithdrawalWithAffiliate> = {},
): WithdrawalWithAffiliate {
  sequence += 1;
  return {
    id: sequence,
    publicId: `40000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    affiliateId: sequence,
    amountCents: 4000,
    status: WithdrawalStatusEnum.REQUESTED,
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'pix.marina@email.com',
    providerBatchId: null,
    providerTransferId: null,
    endToEndId: null,
    receiptUrl: null,
    failureReason: null,
    requestedAt: new Date('2026-09-25T12:00:00Z'),
    paidAt: null,
    failedAt: null,
    returnedAt: null,
    createdAt: new Date('2026-09-25T12:00:00Z'),
    updatedAt: new Date('2026-09-25T12:00:00Z'),
    affiliate: {
      publicId: `10000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
      name: 'Marina Ferraz',
      email: 'marina.ferraz@email.com',
      cpf: '52998224725',
    },
    ...overrides,
  };
}
