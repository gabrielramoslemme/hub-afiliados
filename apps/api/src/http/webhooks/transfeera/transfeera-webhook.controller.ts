import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PayoutEventOutcomeEnum, PayoutEventSourceEnum } from '@porto/contracts';
import { ApplyPayoutEventUseCase } from '@Application/withdrawals/apply-payout-event.use-case';
import { RecordIgnoredPayoutEventUseCase } from '@Application/withdrawals/record-ignored-payout-event.use-case';
import { Public } from '@Http/shared/decorators/public.decorator';
import { InvalidWebhookBody, WebhookBody } from '@Http/shared/decorators/webhook-body.decorator';
import {
  PAYOUT_SIGNATURE_HEADER,
  PayoutWebhookSignatureGuard,
} from '@Http/shared/guards/payout-webhook-signature.guard';
import {
  redactTransfeeraPayload,
  toPayoutUpdate,
} from '@Infra/services/payouts/transfeera-transfer';
import { TransfeeraEventRequestDto } from './dtos/transfeera-event.request.dto';
import { TransfeeraEventResponseDto } from './dtos/transfeera-event.response.dto';

@ApiTags('webhooks/transfeera')
@ApiHeader({
  name: PAYOUT_SIGNATURE_HEADER,
  description: 't=<instante em ms>,v1=<hex do HMAC-SHA256 de "<t>.<corpo cru>">',
})
@ApiUnauthorizedResponse({ description: 'Assinatura ausente, inválida ou fora da janela' })
@Public()
@UseGuards(PayoutWebhookSignatureGuard)
@Controller('webhooks/transfeera')
export class TransfeeraWebhookController {
  private readonly logger = new Logger(TransfeeraWebhookController.name);

  constructor(
    private readonly applyPayoutEventUseCase: ApplyPayoutEventUseCase,
    private readonly recordIgnoredPayoutEventUseCase: RecordIgnoredPayoutEventUseCase,
  ) {}

  /**
   * Mudança de status de uma transferência. Repetir o mesmo desfecho responde
   * 200 sem efeito; referência que não é saque nosso responde 404, para a
   * Transfeera tentar de novo.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: TransfeeraEventRequestDto })
  @ApiOkResponse({ type: TransfeeraEventResponseDto })
  @ApiNotFoundResponse({ description: '`integration_id` de saque nenhum' })
  async notify(
    @WebhookBody(TransfeeraEventRequestDto) event: TransfeeraEventRequestDto | InvalidWebhookBody,
    @Body() payload: Record<string, unknown> | undefined,
  ): Promise<TransfeeraEventResponseDto> {
    // Corpo vazio é o teste de URL que a Transfeera faz ao cadastrar o webhook.
    if (!payload || Object.keys(payload).length === 0) return { outcome: null };

    if (event instanceof InvalidWebhookBody || event.object !== 'Transfer' || !event.data) {
      await this.recordIgnoredPayoutEventUseCase.execute({
        eventId: typeof payload.id === 'string' ? payload.id : null,
        payload: redactTransfeeraPayload(payload),
      });
      return { outcome: PayoutEventOutcomeEnum.IGNORED };
    }

    const update = toPayoutUpdate(event.data, payload);
    const result = await this.applyPayoutEventUseCase.execute({
      update,
      source: PayoutEventSourceEnum.WEBHOOK,
      eventId: event.id ?? null,
    });

    // 200 mesmo assim: a trilha já guardou o evento, e a Transfeera reenviar
    // não mudaria nada. Quem resolve é gente — ver o runbook do webhook.
    if (result.outcome === PayoutEventOutcomeEnum.DIVERGENT) {
      this.logger.error(
        `Desfecho ${update.providerStatus} num saque já falho: ${update.reference} — conferir à mão`,
      );
    }

    return result;
  }
}
