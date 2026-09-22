import { createParamDecorator, ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';

const readBody = createParamDecorator(
  (_data: unknown, context: ExecutionContext): unknown =>
    context.switchToHttp().getRequest<Request>().body,
);

/**
 * O corpo de um webhook, validado pelo DTO — mas campo desconhecido é
 * descartado, não recusado. O `ValidationPipe` global recusa, e ali é o certo:
 * quem erra o nome de um campo do painel precisa saber. Aqui, um 400 porque o
 * sistema de fora acrescentou um campo derrubaria a integração inteira, e a
 * Porto não reenvia sozinha.
 *
 * Funciona porque o pipe global não valida decorator de parâmetro customizado
 * (`validateCustomDecorators` desligado); este pipe local valida.
 */
export function WebhookBody(): ParameterDecorator {
  return readBody(
    new ValidationPipe({
      validateCustomDecorators: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      stopAtFirstError: true,
    }),
  );
}
