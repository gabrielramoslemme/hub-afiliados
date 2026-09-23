import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignedRequest, WebhookSignatureVerifier } from '@Domain/auth/webhook-signature-verifier';
import { CLOCK, Clock } from '@Domain/shared/clock';
import { EnvironmentVariables } from '@Infra/config/environment-variables';

const SIGNATURE_PREFIX = 'sha256=';
const WHOLE_SECONDS = /^\d+$/;

/**
 * HMAC-SHA256 de `"<timestamp>.<corpo cru>"`, em hex, no header como
 * `sha256=<hex>`. O instante entra na conta para a assinatura valer só dentro
 * da janela: uma chamada capturada não pode ser reenviada para sempre, e trocar
 * o instante quebra a assinatura.
 */
@Injectable()
export class HmacWebhookSignatureVerifier implements WebhookSignatureVerifier {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  verify({ timestamp, signature, body }: SignedRequest): boolean {
    const secret = this.configService.get('PORTO_WEBHOOK_SECRET', { infer: true });

    if (!secret || !timestamp || !signature || !body) return false;
    if (!WHOLE_SECONDS.test(timestamp) || !this.isFresh(Number(timestamp))) return false;
    if (!signature.startsWith(SIGNATURE_PREFIX)) return false;

    const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest();
    const received = Buffer.from(signature.slice(SIGNATURE_PREFIX.length), 'hex');

    // O `timingSafeEqual` lança com tamanhos diferentes; e comparar byte a byte
    // com `===` entregaria, pelo tempo de resposta, quantos bytes já acertaram.
    return received.length === expected.length && timingSafeEqual(received, expected);
  }

  private isFresh(timestampSeconds: number): boolean {
    const tolerance = this.configService.get('PORTO_WEBHOOK_TOLERANCE_SECONDS', { infer: true });
    const nowSeconds = this.clock.now().getTime() / 1000;

    return Math.abs(nowSeconds - timestampSeconds) <= tolerance;
  }
}
