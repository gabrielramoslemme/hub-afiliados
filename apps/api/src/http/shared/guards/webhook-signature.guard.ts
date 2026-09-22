import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  WEBHOOK_SIGNATURE_VERIFIER,
  WebhookSignatureVerifier,
} from '@Domain/auth/webhook-signature-verifier';

export const TIMESTAMP_HEADER = 'x-timestamp';
export const SIGNATURE_HEADER = 'x-signature';

/**
 * A autenticação do canal `webhooks`. A rota é `@Public()` para o guard global
 * não pedir JWT a um sistema externo — e é este guard que a fecha: sem ele, a
 * rota pública seria aberta de verdade. O `route-protection.e2e-spec.ts` cobra
 * os dois juntos em toda rota `webhooks/...`.
 *
 * Roda antes do `ValidationPipe`: chamada sem assinatura válida não chega a ter
 * o corpo lido, nem entra na trilha.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(
    @Inject(WEBHOOK_SIGNATURE_VERIFIER)
    private readonly webhookSignatureVerifier: WebhookSignatureVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    const valid = this.webhookSignatureVerifier.verify({
      timestamp: request.header(TIMESTAMP_HEADER),
      signature: request.header(SIGNATURE_HEADER),
      body: request.rawBody,
    });

    if (!valid) throw new UnauthorizedException('Assinatura ausente, inválida ou expirada.');

    return true;
  }
}
