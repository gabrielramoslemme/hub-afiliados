import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PayoutSignedRequest,
  PayoutWebhookSignatureVerifier,
} from '@Domain/auth/payout-webhook-signature-verifier';
import { CLOCK, Clock } from '@Domain/shared/clock';
import { EnvironmentVariables } from '@Infra/config/environment-variables';

const WHOLE_NUMBER = /^\d+$/;

interface ParsedHeader {
  timestamp: string | null;
  signatures: string[];
}

/** `t=<ms>,v1=<hex>[,v1=<hex>]`. Só `v1` conta: aceitar outro esquema abre um downgrade. */
function parseHeader(header: string): ParsedHeader {
  const parsed: ParsedHeader = { timestamp: null, signatures: [] };

  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=', 2);
    if (!value) continue;
    if (key === 't') parsed.timestamp = value;
    if (key === 'v1') parsed.signatures.push(value);
  }

  return parsed;
}

/**
 * O `Transfeera-Signature`: HMAC-SHA256 de `"<t>.<corpo cru>"` com o segredo
 * devolvido no cadastro do webhook. O corpo tem de ser o cru — reserializar o
 * JSON muda os bytes e a assinatura deixa de bater.
 */
@Injectable()
export class TransfeeraWebhookSignatureVerifier implements PayoutWebhookSignatureVerifier {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  verify({ signatureHeader, body }: PayoutSignedRequest): boolean {
    const secret = this.configService.get('TRANSFEERA_WEBHOOK_SECRET', { infer: true });
    if (!secret || !signatureHeader || !body) return false;

    const { timestamp, signatures } = parseHeader(signatureHeader);
    if (!timestamp || !WHOLE_NUMBER.test(timestamp) || !this.isFresh(Number(timestamp))) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest();

    return signatures.some((signature) => {
      const received = Buffer.from(signature, 'hex');
      return received.length === expected.length && timingSafeEqual(received, expected);
    });
  }

  private isFresh(timestampMs: number): boolean {
    const tolerance = this.configService.get('TRANSFEERA_WEBHOOK_TOLERANCE_SECONDS', {
      infer: true,
    });

    return Math.abs(this.clock.now().getTime() - timestampMs) <= tolerance * 1000;
  }
}
