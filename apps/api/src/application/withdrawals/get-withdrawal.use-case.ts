import { PayoutEventOutcomeEnum, PayoutEventSourceEnum, PixKeyTypeEnum } from '@porto/contracts';
import { maskPixKey } from '@Domain/affiliates/pix-key.util';
import { SaleRepository } from '@Domain/sales/sale.repository';
import { PayoutEventRepository } from '@Domain/withdrawals/payout-event.repository';
import { WithdrawalRepository } from '@Domain/withdrawals/withdrawal.repository';
import { WithdrawalNotFoundError } from '@Domain/withdrawals/withdrawals.errors';
import { UseCase } from '../use-case';
import { toWithdrawalListItem, WithdrawalListItemOutput } from './list-withdrawals.use-case';

export interface WithdrawalDetailOutput extends WithdrawalListItemOutput {
  pixKeyType: PixKeyTypeEnum;
  maskedPixKey: string;
  endToEndId: string | null;
  receiptUrl: string | null;
  failureReason: string | null;
  failedAt: Date | null;
  returnedAt: Date | null;
  sales: Array<{ publicId: string; item: string; incentiveCents: number; settledAt: Date }>;
  events: Array<{
    publicId: string;
    source: PayoutEventSourceEnum;
    providerStatus: string | null;
    outcome: PayoutEventOutcomeEnum;
    receivedAt: Date;
  }>;
}

/**
 * O detalhe de um saque no painel: o que foi pago, a quem, por quais vendas, e
 * o que o fornecedor disse no caminho. A chave sai mascarada mesmo aqui.
 */
export class GetWithdrawalUseCase implements UseCase<string, WithdrawalDetailOutput> {
  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly saleRepository: SaleRepository,
    private readonly payoutEventRepository: PayoutEventRepository,
  ) {}

  async execute(publicId: string): Promise<WithdrawalDetailOutput> {
    const withdrawal = await this.withdrawalRepository.findByPublicId(publicId);
    if (!withdrawal) throw new WithdrawalNotFoundError();

    const [sales, events] = await Promise.all([
      this.saleRepository.listByWithdrawal(withdrawal.id),
      this.payoutEventRepository.listByWithdrawal(withdrawal.id),
    ]);

    return {
      ...toWithdrawalListItem(withdrawal),
      pixKeyType: withdrawal.pixKeyType,
      maskedPixKey: maskPixKey(withdrawal.pixKeyType, withdrawal.pixKey),
      endToEndId: withdrawal.endToEndId,
      receiptUrl: withdrawal.receiptUrl,
      failureReason: withdrawal.failureReason,
      failedAt: withdrawal.failedAt,
      returnedAt: withdrawal.returnedAt,
      sales: sales.map((sale) => ({
        publicId: sale.publicId,
        item: sale.item,
        incentiveCents: sale.incentiveCents,
        settledAt: sale.settledAt as Date,
      })),
      events: events.map((event) => ({
        publicId: event.publicId,
        source: event.source,
        providerStatus: event.providerStatus,
        outcome: event.outcome,
        receivedAt: event.receivedAt,
      })),
    };
  }
}
