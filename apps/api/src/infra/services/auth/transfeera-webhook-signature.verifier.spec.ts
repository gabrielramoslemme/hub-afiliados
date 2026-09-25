import { createHmac } from 'node:crypto';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { configServiceMock } from '@Testing/mocks/services/config-service.mock';
import { TransfeeraWebhookSignatureVerifier } from './transfeera-webhook-signature.verifier';

const SECRET = 'the-transfeera-webhook-secret';
const NOW = new Date('2026-09-25T15:00:00.000Z');
const BODY = Buffer.from('{"object":"Transfer","data":{"status":"FINALIZADO"}}');

function sign(timestampMs: number, body = BODY, secret = SECRET): string {
  const hex = createHmac('sha256', secret).update(`${timestampMs}.`).update(body).digest('hex');

  return `t=${timestampMs},v1=${hex}`;
}

describe('TransfeeraWebhookSignatureVerifier', () => {
  function verifier(secret = SECRET): TransfeeraWebhookSignatureVerifier {
    return new TransfeeraWebhookSignatureVerifier(
      configServiceMock({
        TRANSFEERA_WEBHOOK_SECRET: secret,
        TRANSFEERA_WEBHOOK_TOLERANCE_SECONDS: 300,
      }),
      clockMock(NOW),
    );
  }

  it('accepts the signature the provider computes over "<t>.<raw body>"', () => {
    expect(verifier().verify({ signatureHeader: sign(NOW.getTime()), body: BODY })).toBe(true);
  });

  it('refuses a body changed after signing', () => {
    const tampered = Buffer.from('{"object":"Transfer","data":{"status":"DEVOLVIDO"}}');

    expect(verifier().verify({ signatureHeader: sign(NOW.getTime()), body: tampered })).toBe(false);
  });

  // O `t` da Transfeera vem em milissegundos: lido como segundos, toda
  // assinatura pareceria estar no ano 57 mil e seria recusada.
  it('reads the timestamp in milliseconds and refuses it outside the window', () => {
    const fourMinutesAgo = NOW.getTime() - 4 * 60 * 1000;
    const sixMinutesAgo = NOW.getTime() - 6 * 60 * 1000;

    expect(verifier().verify({ signatureHeader: sign(fourMinutesAgo), body: BODY })).toBe(true);
    expect(verifier().verify({ signatureHeader: sign(sixMinutesAgo), body: BODY })).toBe(false);
  });

  it('ignores schemes other than v1', () => {
    const header = sign(NOW.getTime()).replace('v1=', 'v0=');

    expect(verifier().verify({ signatureHeader: header, body: BODY })).toBe(false);
  });

  it('refuses everything while the secret is empty', () => {
    const header = sign(NOW.getTime(), BODY, '');

    expect(verifier('').verify({ signatureHeader: header, body: BODY })).toBe(false);
  });

  it('refuses a missing header or a malformed one', () => {
    expect(verifier().verify({ signatureHeader: undefined, body: BODY })).toBe(false);
    expect(verifier().verify({ signatureHeader: 'garbage', body: BODY })).toBe(false);
  });
});
