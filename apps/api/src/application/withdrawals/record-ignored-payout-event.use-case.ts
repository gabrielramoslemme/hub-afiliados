import { PayoutEventOutcomeEnum, PayoutEventSourceEnum } from '@porto/contracts';
import { Clock } from '@Domain/shared/clock';
import { PayoutEventRepository } from '@Domain/withdrawals/payout-event.repository';
import { UseCase } from '../use-case';

export interface RecordIgnoredPayoutEventInput {
  eventId: string | null;
  /** Já sem chave PIX nem CPF. */
  payload: Record<string, unknown>;
}

/**
 * O webhook do fornecedor que não é sobre transferência — ou que não se lê.
 * Nada muda, mas a chamada fica na trilha: é por ela que o suporte descobre
 * que o fornecedor mandou algo que não esperávamos.
 */
export class RecordIgnoredPayoutEventUseCase
  implements UseCase<RecordIgnoredPayoutEventInput, void>
{
  constructor(
    private readonly payoutEventRepository: PayoutEventRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ eventId, payload }: RecordIgnoredPayoutEventInput): Promise<void> {
    await this.payoutEventRepository.record({
      source: PayoutEventSourceEnum.WEBHOOK,
      eventId,
      withdrawalId: null,
      reference: null,
      providerStatus: null,
      outcome: PayoutEventOutcomeEnum.IGNORED,
      payload,
      receivedAt: this.clock.now(),
    });
  }
}
