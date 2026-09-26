import {
  IncentiveStatusEnum,
  StatementEntryKindEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildSale } from '@Testing/factories/sale.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { buildWithdrawal } from '@Testing/factories/withdrawal.factory';
import { saleRepositoryMock } from '@Testing/mocks/repositories/sale.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { withdrawalRepositoryMock } from '@Testing/mocks/repositories/withdrawal.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { GetAffiliateWalletUseCase } from './get-affiliate-wallet.use-case';

describe('GetAffiliateWalletUseCase', () => {
  const NOW = new Date('2026-09-25T15:00:00.000Z');

  let userRepository: ReturnType<typeof userRepositoryMock>;
  let saleRepository: ReturnType<typeof saleRepositoryMock>;
  let withdrawalRepository: ReturnType<typeof withdrawalRepositoryMock>;
  let useCase: GetAffiliateWalletUseCase;

  const user = buildUser();
  const affiliate = buildAffiliate({ user, coupon: buildCoupon({ id: 7 }) });

  function released(incentiveCents: number, withdrawalId: number | null, day: string) {
    return buildSale({
      incentiveStatus: IncentiveStatusEnum.RELEASED,
      incentiveCents,
      withdrawalId,
      settledAt: new Date(`2026-09-${day}T12:00:00Z`),
    });
  }

  beforeEach(() => {
    userRepository = userRepositoryMock();
    saleRepository = saleRepositoryMock();
    withdrawalRepository = withdrawalRepositoryMock();
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
    useCase = new GetAffiliateWalletUseCase(
      userRepository,
      saleRepository,
      withdrawalRepository,
      clockMock(NOW),
    );
  });

  // O saldo é o que o botão de saque leva: liberado e livre. O que um saque
  // reservou já saiu, mesmo antes de cair.
  it('counts as available only the released incentives no withdrawal holds', async () => {
    saleRepository.listByCoupon.mockResolvedValue([
      released(2700, null, '10'),
      released(1300, null, '11'),
      released(900, 50, '05'),
      buildSale({ incentiveStatus: IncentiveStatusEnum.PENDING, incentiveCents: 500 }),
      buildSale({
        incentiveStatus: IncentiveStatusEnum.CANCELED,
        incentiveCents: 400,
        settledAt: new Date('2026-09-12T12:00:00Z'),
      }),
    ]);

    expect((await useCase.execute(user.publicId)).availableCents).toBe(4000);
  });

  it('sums paid withdrawals as withdrawn and open ones as in flight, never the failed or returned', async () => {
    withdrawalRepository.listByAffiliate.mockResolvedValue([
      buildWithdrawal({ status: WithdrawalStatusEnum.PAID, amountCents: 900 }),
      buildWithdrawal({ status: WithdrawalStatusEnum.PROCESSING, amountCents: 300 }),
      buildWithdrawal({ status: WithdrawalStatusEnum.REQUESTED, amountCents: 200 }),
      buildWithdrawal({ status: WithdrawalStatusEnum.FAILED, amountCents: 7000 }),
      buildWithdrawal({ status: WithdrawalStatusEnum.RETURNED, amountCents: 8000 }),
    ]);

    const wallet = await useCase.execute(user.publicId);

    expect(wallet.withdrawnCents).toBe(900);
    expect(wallet.inFlightCents).toBe(500);
  });

  it('lists incentives and withdrawals together, newest first', async () => {
    saleRepository.listByCoupon.mockResolvedValue([
      buildSale({
        item: 'Conserto de fogão',
        incentiveStatus: IncentiveStatusEnum.RELEASED,
        incentiveCents: 2700,
        settledAt: new Date('2026-09-10T12:00:00Z'),
      }),
    ]);
    withdrawalRepository.listByAffiliate.mockResolvedValue([
      buildWithdrawal({
        status: WithdrawalStatusEnum.PAID,
        amountCents: 2700,
        requestedAt: new Date('2026-09-12T12:00:00Z'),
        paidAt: new Date('2026-09-12T12:05:00Z'),
        receiptUrl: 'https://r',
      }),
    ]);

    const wallet = await useCase.execute(user.publicId);

    expect(wallet.entries).toEqual([
      expect.objectContaining({
        kind: StatementEntryKindEnum.PAYOUT,
        title: 'Saque via PIX',
        cents: 2700,
        occurredAt: new Date('2026-09-12T12:05:00Z'),
        withdrawalStatus: WithdrawalStatusEnum.PAID,
        receiptUrl: 'https://r',
      }),
      expect.objectContaining({
        kind: StatementEntryKindEnum.INCENTIVE,
        title: 'Conserto de fogão',
        withdrawalStatus: null,
        receiptUrl: null,
      }),
    ]);
  });

  it('answers an empty wallet for an affiliate still without a coupon', async () => {
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      affiliate: { ...affiliate, coupon: null },
    });

    const wallet = await useCase.execute(user.publicId);

    expect(wallet).toEqual({
      availableCents: 0,
      withdrawnCents: 0,
      inFlightCents: 0,
      updatedAt: NOW,
      entries: [],
    });
  });

  it('refuses a token whose user has no affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(user.publicId)).rejects.toThrow(UnknownAffiliateError);
  });
});
