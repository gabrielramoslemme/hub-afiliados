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
  PAYOUT_WEBHOOK_SIGNATURE_VERIFIER,
  PayoutWebhookSignatureVerifier,
} from '@Domain/auth/payout-webhook-signature-verifier';

export const PAYOUT_SIGNATURE_HEADER = 'transfeera-signature';

/**
 * A autenticação do webhook do fornecedor de pagamento — o par do
 * `WebhookSignatureGuard` da Porto, com outro header e outro segredo. A rota é
 * `@Public()` para o JWT, e é este guard que a fecha.
 */
@Injectable()
export class PayoutWebhookSignatureGuard implements CanActivate {
  constructor(
    @Inject(PAYOUT_WEBHOOK_SIGNATURE_VERIFIER)
    private readonly payoutWebhookSignatureVerifier: PayoutWebhookSignatureVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    const valid = this.payoutWebhookSignatureVerifier.verify({
      signatureHeader: request.header(PAYOUT_SIGNATURE_HEADER),
      body: request.rawBody,
    });

    if (!valid) throw new UnauthorizedException('Assinatura ausente, inválida ou expirada.');

    return true;
  }
}
