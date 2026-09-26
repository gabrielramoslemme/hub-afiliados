import {
  IncentiveStatusEnum,
  StatementEntryKindEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { SaleRepository } from '@Domain/sales/sale.repository';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { WithdrawalRepository } from '@Domain/withdrawals/withdrawal.repository';
import { UseCase } from '../use-case';

export interface AffiliateStatementEntryOutput {
  publicId: string;
  kind: StatementEntryKindEnum;
  title: string;
  cents: number;
  occurredAt: Date;
  withdrawalStatus: WithdrawalStatusEnum | null;
  receiptUrl: string | null;
}

export interface AffiliateWalletOutput {
  availableCents: number;
  withdrawnCents: number;
  inFlightCents: number;
  updatedAt: Date;
  entries: AffiliateStatementEntryOutput[];
}

const IN_FLIGHT: readonly WithdrawalStatusEnum[] = [
  WithdrawalStatusEnum.REQUESTED,
  WithdrawalStatusEnum.PROCESSING,
];

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * A carteira do afiliado: o saldo que ele pode sacar, o que já sacou, o que
 * está a caminho, e o extrato com os incentivos e os saques.
 */
export class GetAffiliateWalletUseCase implements UseCase<string, AffiliateWalletOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly saleRepository: SaleRepository,
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userPublicId: string): Promise<AffiliateWalletOutput> {
    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const { affiliate } = user;
    const [sales, withdrawals] = affiliate.coupon
      ? await Promise.all([
          this.saleRepository.listByCoupon(affiliate.coupon.id),
          this.withdrawalRepository.listByAffiliate(affiliate.id),
        ])
      : [[], []];

    // O incentivo entra no extrato quando é liberado, não quando a venda é feita.
    const released = sales.filter(
      (sale) => sale.incentiveStatus === IncentiveStatusEnum.RELEASED && sale.settledAt,
    );

    const incentiveEntries = released.map((sale) => ({
      publicId: sale.publicId,
      kind: StatementEntryKindEnum.INCENTIVE,
      title: sale.item,
      cents: sale.incentiveCents,
      occurredAt: sale.settledAt as Date,
      withdrawalStatus: null,
      receiptUrl: null,
    }));

    const payoutEntries = withdrawals.map((withdrawal) => ({
      publicId: withdrawal.publicId,
      kind: StatementEntryKindEnum.PAYOUT,
      title: 'Saque via PIX',
      cents: withdrawal.amountCents,
      occurredAt: withdrawal.paidAt ?? withdrawal.requestedAt,
      withdrawalStatus: withdrawal.status,
      receiptUrl: withdrawal.receiptUrl,
    }));

    return {
      availableCents: sum(
        released.filter((sale) => sale.withdrawalId === null).map((sale) => sale.incentiveCents),
      ),
      withdrawnCents: sum(
        withdrawals
          .filter((withdrawal) => withdrawal.status === WithdrawalStatusEnum.PAID)
          .map((withdrawal) => withdrawal.amountCents),
      ),
      inFlightCents: sum(
        withdrawals
          .filter((withdrawal) => IN_FLIGHT.includes(withdrawal.status))
          .map((withdrawal) => withdrawal.amountCents),
      ),
      updatedAt: this.clock.now(),
      entries: [...incentiveEntries, ...payoutEntries].sort(
        (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
      ),
    };
  }
}
