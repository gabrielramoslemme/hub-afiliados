import { createHmac } from 'node:crypto';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { configServiceMock } from '@Testing/mocks/services/config-service.mock';
import { HmacWebhookSignatureVerifier } from './hmac-webhook-signature.verifier';

describe('HmacWebhookSignatureVerifier', () => {
  const SECRET = 'segredo-compartilhado-com-32-caracteres!';
  const NOW = new Date('2026-09-11T12:17:08.000Z');
  const TIMESTAMP = String(NOW.getTime() / 1000);
  const BODY = Buffer.from('{"idEvento":"8d4a9d5f","venda":{"id":"7c4f7b20","valorVenda":310.99}}');

  function sign(timestamp: string, body: Buffer, secret = SECRET): string {
    const digest = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
    return `sha256=${digest}`;
  }

  function verifier(secret = SECRET): HmacWebhookSignatureVerifier {
    return new HmacWebhookSignatureVerifier(
      configServiceMock({ PORTO_WEBHOOK_SECRET: secret, PORTO_WEBHOOK_TOLERANCE_SECONDS: 300 }),
      clockMock(NOW),
    );
  }

  it('accepts the body signed with the shared secret', () => {
    expect(
      verifier().verify({ timestamp: TIMESTAMP, signature: sign(TIMESTAMP, BODY), body: BODY }),
    ).toBe(true);
  });

  it('refuses a body changed after signing', () => {
    const tampered = Buffer.from(BODY.toString().replace('310.99', '3109.90'));

    expect(
      verifier().verify({ timestamp: TIMESTAMP, signature: sign(TIMESTAMP, BODY), body: tampered }),
    ).toBe(false);
  });

  /* A assinatura é sobre bytes: o mesmo JSON reserializado já não confere. */
  it('refuses the same JSON with one byte of whitespace more', () => {
    const reserialized = Buffer.from(BODY.toString().replace(':', ': '));

    expect(
      verifier().verify({
        timestamp: TIMESTAMP,
        signature: sign(TIMESTAMP, BODY),
        body: reserialized,
      }),
    ).toBe(false);
  });

  it('refuses a signature made with another secret', () => {
    const signature = sign(TIMESTAMP, BODY, 'outro-segredo-com-mais-de-32-caracteres');

    expect(verifier().verify({ timestamp: TIMESTAMP, signature, body: BODY })).toBe(false);
  });

  /* O instante está dentro da assinatura: trocá-lo para escapar da janela quebra a conta. */
  it('refuses a signed timestamp swapped for a fresh one', () => {
    const stale = String(Number(TIMESTAMP) - 600);

    expect(
      verifier().verify({ timestamp: TIMESTAMP, signature: sign(stale, BODY), body: BODY }),
    ).toBe(false);
  });

  it.each([
    ['past', -301],
    ['future', 301],
  ])('refuses a timestamp more than the tolerance in the %s', (_, offset) => {
    const timestamp = String(Number(TIMESTAMP) + offset);

    expect(verifier().verify({ timestamp, signature: sign(timestamp, BODY), body: BODY })).toBe(
      false,
    );
  });

  it('accepts a timestamp right at the edge of the tolerance', () => {
    const timestamp = String(Number(TIMESTAMP) - 300);

    expect(verifier().verify({ timestamp, signature: sign(timestamp, BODY), body: BODY })).toBe(
      true,
    );
  });

  it.each([
    ['timestamp', { signature: sign(TIMESTAMP, BODY), body: BODY }],
    ['signature', { timestamp: TIMESTAMP, body: BODY }],
    ['body', { timestamp: TIMESTAMP, signature: sign(TIMESTAMP, BODY) }],
  ])('refuses a call without the %s', (_, request) => {
    expect(verifier().verify(request)).toBe(false);
  });

  it('refuses a timestamp that is not whole seconds', () => {
    const timestamp = `${TIMESTAMP}.5`;

    expect(verifier().verify({ timestamp, signature: sign(timestamp, BODY), body: BODY })).toBe(
      false,
    );
  });

  /* Sem segredo configurado a rota fica fechada — nunca aberta a quem assina com vazio. */
  it('refuses everything while no secret is configured', () => {
    expect(
      verifier('').verify({
        timestamp: TIMESTAMP,
        signature: sign(TIMESTAMP, BODY, ''),
        body: BODY,
      }),
    ).toBe(false);
  });
});
