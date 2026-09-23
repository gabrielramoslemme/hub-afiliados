import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IncentiveErrorCodeEnum } from '@porto/contracts';
import { ApplyIncentiveEventUseCase } from '@Application/sales/apply-incentive-event.use-case';
import { RecordInvalidIncentiveNotificationUseCase } from '@Application/sales/record-invalid-incentive-notification.use-case';
import { Public } from '@Http/shared/decorators/public.decorator';
import { InvalidWebhookBody, WebhookBody } from '@Http/shared/decorators/webhook-body.decorator';
import {
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  WebhookSignatureGuard,
} from '@Http/shared/guards/webhook-signature.guard';
import { IncentiveNotificationRequestDto } from './dtos/incentive-notification.request.dto';
import { IncentiveNotificationResponseDto } from './dtos/incentive-notification.response.dto';

@ApiTags('webhooks/porto')
@ApiHeader({ name: TIMESTAMP_HEADER, description: 'Instante do envio, em segundos UTC' })
@ApiHeader({
  name: SIGNATURE_HEADER,
  description: 'sha256=<hex do HMAC-SHA256 de "<timestamp>.<corpo cru>">',
})
@ApiUnauthorizedResponse({ description: 'Assinatura ausente, inválida ou fora da janela' })
@Public()
@UseGuards(WebhookSignatureGuard)
@Controller('webhooks/porto/incentives')
export class PortoIncentivesController {
  constructor(
    private readonly applyIncentiveEventUseCase: ApplyIncentiveEventUseCase,
    private readonly recordInvalidIncentiveNotificationUseCase: RecordInvalidIncentiveNotificationUseCase,
  ) {}

  /**
   * Notificação de incentivo da Porto Serviços (INT-03): venda registrada,
   * concluída ou não concluída. Repetir a mesma ação responde 200 sem efeito.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: IncentiveNotificationResponseDto })
  @ApiBadRequestResponse({
    description:
      'Corpo fora do contrato (INC-006), ou tipo do evento e status que não formam par (INC-004)',
  })
  @ApiNotFoundResponse({ description: 'Cupom de nenhum afiliado (INC-001)' })
  @ApiConflictResponse({
    description:
      'Venda não registrada (INC-002), já encerrada com outro desfecho (INC-003) ou com outro cupom (INC-005)',
  })
  async notify(
    @WebhookBody(IncentiveNotificationRequestDto)
    notification: IncentiveNotificationRequestDto | InvalidWebhookBody,
    @Body() payload: Record<string, unknown>,
  ): Promise<IncentiveNotificationResponseDto> {
    if (notification instanceof InvalidWebhookBody) {
      await this.recordInvalidIncentiveNotificationUseCase.execute({
        ...IncentiveNotificationRequestDto.traceOf(payload),
        payload,
      });
      throw new BadRequestException({
        code: IncentiveErrorCodeEnum.INVALID_PAYLOAD,
        message: notification.problems,
      });
    }

    return IncentiveNotificationResponseDto.from(
      await this.applyIncentiveEventUseCase.execute(
        IncentiveNotificationRequestDto.toInput(notification, payload),
      ),
    );
  }
}
