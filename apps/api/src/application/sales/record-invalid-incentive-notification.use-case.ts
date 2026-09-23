import { IncentiveErrorCodeEnum } from '@porto/contracts';
import { UseCase } from '@Application/use-case';
import { IncentiveEventOutcomeEnum } from '@Domain/sales/incentive-event.entity';
import { IncentiveEventRepository } from '@Domain/sales/incentive-event.repository';
import { Clock } from '@Domain/shared/clock';

export interface RecordInvalidIncentiveNotificationInput {
  /** O `idEvento`, quando o corpo trazia um legível. */
  eventId: string | null;
  /** O `venda.id`, quando o corpo trazia um legível. */
  externalSaleId: string | null;
  /** A chamada como chegou. */
  payload: Record<string, unknown>;
}

/**
 * Grava na trilha a chamada assinada cujo corpo não passou pelo contrato. A
 * Porto não reenvia sozinha: essa venda só volta por reprocessamento manual, e
 * é pela trilha que o suporte a encontra — o `ApplyIncentiveEventUseCase` nem
 * chega a ser chamado, porque não há evento que ele consiga ler.
 *
 * A resposta 400 é da borda HTTP, que já tem as mensagens por campo.
 */
export class RecordInvalidIncentiveNotificationUseCase
  implements UseCase<RecordInvalidIncentiveNotificationInput, void>
{
  constructor(
    private readonly incentiveEventRepository: IncentiveEventRepository,
    private readonly clock: Clock,
  ) {}

  execute(input: RecordInvalidIncentiveNotificationInput): Promise<void> {
    return this.incentiveEventRepository.record({
      eventId: input.eventId,
      saleId: null,
      externalSaleId: input.externalSaleId,
      eventType: null,
      outcome: IncentiveEventOutcomeEnum.REJECTED,
      rejectionCode: IncentiveErrorCodeEnum.INVALID_PAYLOAD,
      payload: input.payload,
      sentAt: null,
      receivedAt: this.clock.now(),
    });
  }
}
