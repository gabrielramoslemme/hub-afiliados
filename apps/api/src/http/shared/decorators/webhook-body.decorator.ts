import {
  type ArgumentMetadata,
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';

const readBody = createParamDecorator(
  (_data: unknown, context: ExecutionContext): unknown =>
    context.switchToHttp().getRequest<Request>().body,
);

/** O corpo que não passou pelo DTO, com uma mensagem por campo. */
export class InvalidWebhookBody {
  constructor(readonly problems: string[]) {}
}

/**
 * Devolve a recusa em vez de lançá-la: o webhook precisa gravar a chamada
 * recusada antes de responder, e um 400 lançado aqui chegaria ao filtro sem
 * passar pelo controller.
 */
class WebhookBodyPipe extends ValidationPipe {
  constructor(private readonly dto: Type<unknown>) {
    super({
      validateCustomDecorators: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      stopAtFirstError: true,
    });
  }

  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    try {
      // O tipo vem do argumento, não do parâmetro: declarado como união com
      // `InvalidWebhookBody`, o parâmetro chega aqui como `Object`, e o pipe
      // deixaria o corpo passar sem validar nada.
      return await super.transform(value, { ...metadata, metatype: this.dto });
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;

      const { message } = error.getResponse() as { message: string | string[] };
      return new InvalidWebhookBody(Array.isArray(message) ? message : [message]);
    }
  }
}

/**
 * O corpo de um webhook, validado pelo DTO — mas campo desconhecido é
 * descartado, não recusado. O `ValidationPipe` global recusa, e ali é o certo:
 * quem erra o nome de um campo do painel precisa saber. Aqui, um 400 porque o
 * sistema de fora acrescentou um campo derrubaria a integração inteira, e a
 * Porto não reenvia sozinha.
 *
 * Corpo fora do contrato chega ao controller como `InvalidWebhookBody`, para
 * ele gravar a chamada antes de responder 400.
 *
 * Funciona porque o pipe global não valida decorator de parâmetro customizado
 * (`validateCustomDecorators` desligado); este pipe local valida.
 */
export function WebhookBody(dto: Type<unknown>): ParameterDecorator {
  return readBody(new WebhookBodyPipe(dto));
}
