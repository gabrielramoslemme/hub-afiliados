import { PayoutEventOutcomeEnum, PayoutEventSourceEnum } from '@porto/contracts';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { Mailer } from '@Domain/notifications/mailer';
import { Clock } from '@Domain/shared/clock';
import { PayoutUpdate } from '@Domain/withdrawals/payout-gateway';
import { WithdrawalRepository } from '@Domain/withdrawals/withdrawal.repository';
import { UnknownPayoutReferenceError } from '@Domain/withdrawals/withdrawals.errors';
import { UseCase } from '../use-case';
import { notifyPayoutOutcome } from './notify-payout-outcome';

export interface ApplyPayoutEventInput {
  update: PayoutUpdate;
  source: PayoutEventSourceEnum;
  eventId: string | null;
}

export interface ApplyPayoutEventOutput {
  outcome: PayoutEventOutcomeEnum;
}

/**
 * Uma notificação do fornecedor de pagamento sobre um saque: aplica o desfecho,
 * grava a trilha e, quando o saque mudou de verdade, avisa o afiliado. A
 * decisão de aplicar, repetir ou ignorar é tomada debaixo do lock, no adapter,
 * por `resolvePayoutTransition` — duas notificações simultâneas não aplicam o
 * mesmo desfecho duas vezes.
 */
export class ApplyPayoutEventUseCase
  implements UseCase<ApplyPayoutEventInput, ApplyPayoutEventOutput>
{
  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly mailer: Mailer,
    private readonly linkBuilder: LinkBuilder,
    private readonly clock: Clock,
  ) {}

  async execute({
    update,
    source,
    eventId,
  }: ApplyPayoutEventInput): Promise<ApplyPayoutEventOutput> {
    const now = this.clock.now();
    const { outcome, withdrawal } = await this.withdrawalRepository.applyPayoutUpdate({
      update,
      at: now,
      event: { source, eventId, receivedAt: now },
    });

    if (outcome === PayoutEventOutcomeEnum.UNKNOWN_WITHDRAWAL) {
      throw new UnknownPayoutReferenceError();
    }

    if (outcome === PayoutEventOutcomeEnum.APPLIED && withdrawal) {
      await notifyPayoutOutcome(this.mailer, this.linkBuilder, withdrawal);
    }

    return { outcome };
  }
}
