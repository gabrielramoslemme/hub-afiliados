import {
  PayoutEventOutcomeEnum,
  PayoutEventSourceEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { Mailer } from '@Domain/notifications/mailer';
import { Clock } from '@Domain/shared/clock';
import { PayoutGateway, PayoutUpdate } from '@Domain/withdrawals/payout-gateway';
import { WithdrawalWithAffiliate } from '@Domain/withdrawals/withdrawal.entity';
import { WithdrawalRepository } from '@Domain/withdrawals/withdrawal.repository';
import {
  PayoutProviderAccessDeniedError,
  PayoutProviderUnavailableError,
  PayoutRefusedError,
} from '@Domain/withdrawals/withdrawals.errors';
import { UseCase } from '../use-case';
import { notifyPayoutOutcome } from './notify-payout-outcome';
import { refusalUpdate } from './payout-refusal';

export interface ReconcileWithdrawalsInput {
  retryAfterMinutes: number;
  staleAfterMinutes: number;
  /** Por status, por rodada: um fornecedor fora do ar não pode prender a rodada inteira. */
  limit: number;
}

export interface ReconcileWithdrawalsOutput {
  retried: number;
  settled: number;
}

const MINUTE_MS = 60_000;

function isOutage(error: unknown): boolean {
  return (
    error instanceof PayoutProviderUnavailableError ||
    error instanceof PayoutProviderAccessDeniedError
  );
}

/**
 * O que o webhook não resolveu. A Transfeera só reenvia uma notificação duas
 * vezes; sem esta rodada, um saque sem resposta ficaria em processamento para
 * sempre.
 *
 * - `REQUESTED` antigo: o pedido não teve resposta. Pede de novo com a mesma
 *   referência — o fornecedor não paga duas vezes a mesma.
 * - `PROCESSING` parado: o webhook não veio. Consulta o lote e aplica o que ele
 *   disser, pelo mesmo caminho do webhook.
 */
export class ReconcileWithdrawalsUseCase
  implements UseCase<ReconcileWithdrawalsInput, ReconcileWithdrawalsOutput>
{
  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly payoutGateway: PayoutGateway,
    private readonly mailer: Mailer,
    private readonly linkBuilder: LinkBuilder,
    private readonly clock: Clock,
  ) {}

  async execute(input: ReconcileWithdrawalsInput): Promise<ReconcileWithdrawalsOutput> {
    if (!this.payoutGateway.isEnabled()) return { retried: 0, settled: 0 };

    const now = this.clock.now();

    const requested = await this.withdrawalRepository.listStale({
      status: WithdrawalStatusEnum.REQUESTED,
      updatedBefore: new Date(now.getTime() - input.retryAfterMinutes * MINUTE_MS),
      limit: input.limit,
    });
    let retried = 0;
    for (const withdrawal of requested) {
      if (await this.retry(withdrawal, now)) retried += 1;
    }

    const processing = await this.withdrawalRepository.listStale({
      status: WithdrawalStatusEnum.PROCESSING,
      updatedBefore: new Date(now.getTime() - input.staleAfterMinutes * MINUTE_MS),
      limit: input.limit,
    });
    let settled = 0;
    for (const withdrawal of processing) {
      if (await this.settle(withdrawal, now)) settled += 1;
    }

    return { retried, settled };
  }

  private async retry(withdrawal: WithdrawalWithAffiliate, now: Date): Promise<boolean> {
    try {
      const { batchId } = await this.payoutGateway.requestPayout({
        reference: withdrawal.publicId,
        amountCents: withdrawal.amountCents,
        pixKeyType: withdrawal.pixKeyType,
        pixKey: withdrawal.pixKey,
        holderCpf: withdrawal.affiliate.cpf,
      });
      await this.withdrawalRepository.markProcessing(withdrawal.publicId, batchId);
      return true;
    } catch (error) {
      if (error instanceof PayoutRefusedError) {
        await this.withdrawalRepository.applyPayoutUpdate({
          update: refusalUpdate(withdrawal.publicId, error.reason),
          at: now,
          event: null,
        });
        return false;
      }
      if (isOutage(error)) return false;
      throw error;
    }
  }

  private async settle(withdrawal: WithdrawalWithAffiliate, now: Date): Promise<boolean> {
    let update: PayoutUpdate | null;
    try {
      // `listStale` só devolve `PROCESSING` com lote conhecido.
      update = await this.payoutGateway.findPayout(withdrawal.providerBatchId as string);
    } catch (error) {
      if (isOutage(error)) return false;
      throw error;
    }

    // Ainda a caminho: gravar a consulta a cada rodada só encheria a trilha.
    if (!update?.status) return false;

    const result = await this.withdrawalRepository.applyPayoutUpdate({
      // O saque é este; a referência que o fornecedor ecoa não decide nada aqui.
      update: { ...update, reference: withdrawal.publicId },
      at: now,
      event: { source: PayoutEventSourceEnum.RECONCILIATION, eventId: null, receivedAt: now },
    });

    if (result.outcome !== PayoutEventOutcomeEnum.APPLIED || !result.withdrawal) return false;

    await notifyPayoutOutcome(this.mailer, this.linkBuilder, result.withdrawal);
    return true;
  }
}
