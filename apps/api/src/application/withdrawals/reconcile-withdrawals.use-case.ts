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
} from '@Domain/withdrawals/withdrawals.errors';
import { UseCase } from '../use-case';
import { notifyPayoutOutcome } from './notify-payout-outcome';

export interface ReconcileWithdrawalsInput {
  retryAfterMinutes: number;
  staleAfterMinutes: number;
  /** Por status, por rodada: um fornecedor fora do ar não pode prender a rodada inteira. */
  limit: number;
}

export interface ReconcileWithdrawalsOutput {
  retried: number;
  settled: number;
  /**
   * `publicId` de quem precisa de gente olhando: quebrou de um jeito imprevisto,
   * teve a repetição recusada ou recebeu um desfecho que diverge do saque.
   */
  failed: string[];
}

const MINUTE_MS = 60_000;
const { REQUESTED, PROCESSING } = WithdrawalStatusEnum;

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
 *   referência — o fornecedor não paga duas vezes a mesma. Recusa na
 *   repetição não fecha o saque: vai para `failed`.
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
    if (!this.payoutGateway.isEnabled()) return { retried: 0, settled: 0, failed: [] };

    const now = this.clock.now();
    /*
      Cada saque é reivindicado antes da tentativa. `listStale` devolve os mais
      antigos por `updatedAt`: sem tocar o campo, a linha que a tentativa não
      fecha voltaria à frente na próxima rodada, e cinquenta assim travariam os
      mais novos para sempre. E a lista foi lida sem lock — a reivindicação
      confere o status de novo, para não reenviar um saque que um webhook fechou
      no meio da rodada, com as vendas dele talvez já em outro saque.
    */
    const failed: string[] = [];

    const requested = await this.withdrawalRepository.listStale({
      status: REQUESTED,
      updatedBefore: new Date(now.getTime() - input.retryAfterMinutes * MINUTE_MS),
      limit: input.limit,
    });
    let retried = 0;
    for (const withdrawal of requested) {
      try {
        if (!(await this.withdrawalRepository.claimForAttempt(withdrawal.publicId, REQUESTED))) {
          continue;
        }
        if (await this.retry(withdrawal)) retried += 1;
      } catch {
        failed.push(withdrawal.publicId);
      }
    }

    const processing = await this.withdrawalRepository.listStale({
      status: PROCESSING,
      updatedBefore: new Date(now.getTime() - input.staleAfterMinutes * MINUTE_MS),
      limit: input.limit,
    });
    let settled = 0;
    for (const withdrawal of processing) {
      try {
        if (!(await this.withdrawalRepository.claimForAttempt(withdrawal.publicId, PROCESSING))) {
          continue;
        }
        const outcome = await this.settle(withdrawal, now);
        if (outcome === 'settled') settled += 1;
        if (outcome === 'divergent') failed.push(withdrawal.publicId);
      } catch {
        failed.push(withdrawal.publicId);
      }
    }

    return { retried, settled, failed };
  }

  private async retry(withdrawal: WithdrawalWithAffiliate): Promise<boolean> {
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
      /*
        Só o primeiro pedido fecha o saque como falho. Aqui o primeiro pode ter
        sido aceito sem resposta, e a idempotência repetida lida como recusa
        devolveria ao saldo vendas de um PIX que ainda vai cair. O saque fica
        pedido e vai para `failed`, que o job loga como erro.
      */
      if (isOutage(error)) return false;
      throw error;
    }
  }

  private async settle(
    withdrawal: WithdrawalWithAffiliate,
    now: Date,
  ): Promise<'settled' | 'skipped' | 'divergent'> {
    let update: PayoutUpdate | null;
    try {
      // `listStale` só devolve `PROCESSING` com lote conhecido.
      update = await this.payoutGateway.findPayout(withdrawal.providerBatchId as string);
    } catch (error) {
      if (isOutage(error)) return 'skipped';
      throw error;
    }

    // Ainda a caminho: gravar a consulta a cada rodada só encheria a trilha.
    if (!update?.status) return 'skipped';

    const result = await this.withdrawalRepository.applyPayoutUpdate({
      // O saque é este; a referência que o fornecedor ecoa não decide nada aqui.
      update: { ...update, reference: withdrawal.publicId },
      at: now,
      event: { source: PayoutEventSourceEnum.RECONCILIATION, eventId: null, receivedAt: now },
    });

    if (result.outcome === PayoutEventOutcomeEnum.DIVERGENT) return 'divergent';
    if (result.outcome !== PayoutEventOutcomeEnum.APPLIED || !result.withdrawal) return 'skipped';

    await notifyPayoutOutcome(this.mailer, this.linkBuilder, result.withdrawal);
    return 'settled';
  }
}
