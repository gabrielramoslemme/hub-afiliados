import { Logger } from '@nestjs/common';
import {
  CouponProviderAccessDeniedError,
  CouponProviderUnavailableError,
} from '@Domain/coupons/coupons.errors';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { SensediaTokenProvider } from './sensedia-token.provider';

const OAUTH_URL = 'https://hml.api.portoseguro.com.br/oauth/v2/access-token';

function tokenResponse(accessToken: string, expiresIn = 3600): Response {
  return new Response(
    JSON.stringify({ access_token: accessToken, token_type: 'Bearer', expires_in: expiresIn }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('SensediaTokenProvider', () => {
  let fetchMock: jest.Mock;
  let clock: ReturnType<typeof clockMock>;

  function buildProvider(): SensediaTokenProvider {
    return new SensediaTokenProvider(
      {
        oauthUrl: OAUTH_URL,
        clientId: 'the-client-id',
        clientSecret: 'the-client-secret',
        timeoutMs: 10_000,
      },
      clock,
    );
  }

  beforeEach(() => {
    clock = clockMock(new Date('2026-08-25T12:00:00.000Z'));
    fetchMock = jest.fn().mockResolvedValue(tokenResponse('first-token'));
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
    // O provider loga a recusa de propósito; aqui a saída do teste é que fica limpa.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the access token of the response', async () => {
    await expect(buildProvider().getAccessToken()).resolves.toBe('first-token');
  });

  it('authenticates with client id and secret in base64, as the gateway requires', async () => {
    await buildProvider().getAccessToken();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(OAUTH_URL);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('the-client-id:the-client-secret').toString('base64')}`,
    );
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toBe('grant_type=client_credentials');
  });

  it('reuses the token instead of asking for a new one on every call', async () => {
    const provider = buildProvider();

    await provider.getAccessToken();
    await provider.getAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /* Pedir o token de novo perto do vencimento evita o 401 no meio da aprovação. */
  it('asks for a new token within the safety margin of the expiry', async () => {
    const provider = buildProvider();
    await provider.getAccessToken();

    fetchMock.mockResolvedValue(tokenResponse('second-token'));
    clock.now.mockReturnValue(new Date('2026-08-25T12:59:10.000Z'));

    await expect(provider.getAccessToken()).resolves.toBe('second-token');
  });

  it('keeps the token while the safety margin has not been reached', async () => {
    const provider = buildProvider();
    await provider.getAccessToken();

    clock.now.mockReturnValue(new Date('2026-08-25T12:58:00.000Z'));

    await expect(provider.getAccessToken()).resolves.toBe('first-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /* Dez aprovações ao mesmo tempo pedem um token, não dez. */
  it('asks for a single token when several calls arrive at once', async () => {
    const provider = buildProvider();

    await Promise.all([
      provider.getAccessToken(),
      provider.getAccessToken(),
      provider.getAccessToken(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for a new token after the cached one is discarded', async () => {
    const provider = buildProvider();
    await provider.getAccessToken();

    provider.invalidate();
    fetchMock.mockResolvedValue(tokenResponse('second-token'));

    await expect(provider.getAccessToken()).resolves.toBe('second-token');
  });

  /*
    Credencial errada ou sem permissão é configuração do ambiente: "tente de
    novo" mandaria a analista repetir o que não vai mudar.
  */
  it.each([400, 401, 403])('reports denied access when the OAuth answers %i', async (status) => {
    fetchMock.mockResolvedValue(new Response('{"error":"invalid_client"}', { status }));

    await expect(buildProvider().getAccessToken()).rejects.toThrow(CouponProviderAccessDeniedError);
  });

  it('reports the provider as unavailable when the OAuth server fails', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));

    await expect(buildProvider().getAccessToken()).rejects.toThrow(CouponProviderUnavailableError);
  });

  /* Uma página de erro de proxy com 200 não é token, e não pode virar 500 nem ficar guardada. */
  it('reports the provider as unavailable when the token answer is not json', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 200 }));

    await expect(buildProvider().getAccessToken()).rejects.toThrow(CouponProviderUnavailableError);
  });

  it.each([
    ['no access token', { token_type: 'Bearer', expires_in: 3600 }],
    ['no expiry', { access_token: 'first-token', token_type: 'Bearer' }],
  ])('reports the provider as unavailable when the token answer has %s', async (_case, body) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

    await expect(buildProvider().getAccessToken()).rejects.toThrow(CouponProviderUnavailableError);
  });

  it('reports the provider as unavailable when the network fails', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(buildProvider().getAccessToken()).rejects.toThrow(CouponProviderUnavailableError);
  });

  /* Falha não fica em cache: a tentativa seguinte tem que poder dar certo. */
  it('lets the next call try again after a failure', async () => {
    const provider = buildProvider();
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(provider.getAccessToken()).rejects.toThrow(CouponProviderUnavailableError);
    await expect(provider.getAccessToken()).resolves.toBe('first-token');
  });
});
