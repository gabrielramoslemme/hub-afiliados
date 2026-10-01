import { headers } from 'next/headers';
import { publicApiFetch } from './api-client';
import { ApiError } from './api-error';

jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({ headers: jest.fn(), cookies: jest.fn() }));

const requestHeaders = headers as jest.MockedFunction<typeof headers>;
const fetchMock = jest.fn();

function visitor(viewerAddress?: string) {
  const incoming = new Headers(viewerAddress ? { 'cloudfront-viewer-address': viewerAddress } : {});
  requestHeaders.mockResolvedValue(incoming as Awaited<ReturnType<typeof headers>>);
}

beforeAll(() => {
  process.env.API_BASE_URL = 'http://api.test/v1';
  global.fetch = fetchMock;
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

describe('publicApiFetch', () => {
  // A API conta as tentativas por visitante. Sem repassar quem o CloudFront
  // viu, toda chamada feita pelo Next contaria como a do próprio Next.
  it('passes on the visitor CloudFront saw', async () => {
    visitor('203.0.113.7:51000');

    await publicApiFetch('/affiliate/auth/login', { method: 'POST' });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get('cloudfront-viewer-address')).toBe('203.0.113.7:51000');
  });

  it('sends no visitor header when there is none to pass on', async () => {
    visitor();

    await publicApiFetch('/affiliate/auth/login', { method: 'POST' });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).has('cloudfront-viewer-address')).toBe(false);
  });

  it('keeps the wait the api asked for on the error', async () => {
    visitor();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 429, code: 'RATE-001', message: 'Muitas tentativas.' }),
        { status: 429, headers: { 'Retry-After': '840' } },
      ),
    );

    const failure = publicApiFetch('/affiliate/auth/login', { method: 'POST' });

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ statusCode: 429, retryAfterSeconds: 840 });
  });
});
