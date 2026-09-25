import { Logger } from '@nestjs/common';
import {
  PayoutProviderAccessDeniedError,
  PayoutProviderUnavailableError,
} from '@Domain/withdrawals/withdrawals.errors';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { TransfeeraTokenProvider } from './transfeera-token.provider';

const AUTH_URL = 'https://login-api-sandbox.transfeera.com/authorization';

function tokenResponse(accessToken: string, expiresIn = 1800): Response {
  return new Response(JSON.stringify({ access_token: accessToken, expires_in: expiresIn }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('TransfeeraTokenProvider', () => {
  const NOW = new Date('2026-09-25T12:00:00.000Z');
  let fetchMock: jest.Mock;
  let clock: ReturnType<typeof clockMock>;

  function buildProvider(): TransfeeraTokenProvider {
    return new TransfeeraTokenProvider(
      {
        authUrl: AUTH_URL,
        clientId: 'the-client-id',
        clientSecret: 'the-client-secret',
        userAgent: 'Porto Hub de Afiliados (afiliados@portoservico.com.br)',
        timeoutMs: 10_000,
      },
      clock,
    );
  }

  beforeEach(() => {
    clock = clockMock(NOW);
    fetchMock = jest.fn().mockResolvedValue(tokenResponse('first-token'));
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('asks for a client credentials token in json, with the user agent', async () => {
    await expect(buildProvider().getAccessToken()).resolves.toBe('first-token');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(AUTH_URL);
    expect(JSON.parse(init.body)).toEqual({
      grant_type: 'client_credentials',
      client_id: 'the-client-id',
      client_secret: 'the-client-secret',
    });
    expect(init.headers['User-Agent']).toBe(
      'Porto Hub de Afiliados (afiliados@portoservico.com.br)',
    );
  });

  it('reuses the token until a minute before it expires', async () => {
    const provider = buildProvider();
    await provider.getAccessToken();

    clock.now.mockReturnValue(new Date(NOW.getTime() + (1800 - 61) * 1000));
    await provider.getAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValue(tokenResponse('second-token'));
    clock.now.mockReturnValue(new Date(NOW.getTime() + (1800 - 59) * 1000));
    await expect(provider.getAccessToken()).resolves.toBe('second-token');
  });

  it('asks once for concurrent callers', async () => {
    const provider = buildProvider();

    await Promise.all([provider.getAccessToken(), provider.getAccessToken()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403])('reads a %s as a refused credential', async (status) => {
    fetchMock.mockResolvedValue(new Response('', { status }));

    await expect(buildProvider().getAccessToken()).rejects.toThrow(PayoutProviderAccessDeniedError);
  });

  it('reads a 5xx or a body without token as the provider being down', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 502 }));
    await expect(buildProvider().getAccessToken()).rejects.toThrow(PayoutProviderUnavailableError);

    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    await expect(buildProvider().getAccessToken()).rejects.toThrow(PayoutProviderUnavailableError);
  });
});
