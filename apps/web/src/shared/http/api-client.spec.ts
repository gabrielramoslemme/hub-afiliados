import { headers } from 'next/headers';
import { publicApiFetch } from './api-client';
import { ApiError } from './api-error';

jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({ headers: jest.fn(), cookies: jest.fn() }));

const requestHeaders = headers as jest.MockedFunction<typeof headers>;
const fetchMock = jest.fn();

function from(viewerAddress: string | null) {
  const visitor = new Headers(viewerAddress ? { 'cloudfront-viewer-address': viewerAddress } : {});
  requestHeaders.mockResolvedValue(visitor as Awaited<ReturnType<typeof headers>>);
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
  it('refuses the 21st call from the same visitor to the same route without reaching the api', async () => {
    from('203.0.113.7:51000');

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await publicApiFetch('/affiliate/auth/login', { method: 'POST' });
    }
    const refused = publicApiFetch('/affiliate/auth/login', { method: 'POST' });

    await expect(refused).rejects.toBeInstanceOf(ApiError);
    await expect(refused).rejects.toMatchObject({ statusCode: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it('counts each route on its own, so a busy login does not block the sign-up', async () => {
    from('198.51.100.10:51000');

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await publicApiFetch('/affiliate/auth/login', { method: 'POST' });
    }

    await expect(publicApiFetch('/affiliates', { method: 'POST' })).resolves.toBeUndefined();
  });

  // Sem um IP em que confiar, todo visitante cairia na mesma chave, e vinte
  // logins derrubariam o portal inteiro. A trava por conta da API segue valendo.
  it('lets through a call with no address it can trust', async () => {
    from(null);

    for (let attempt = 0; attempt < 25; attempt += 1) {
      await publicApiFetch('/admin/auth/login', { method: 'POST' });
    }

    expect(fetchMock).toHaveBeenCalledTimes(25);
  });
});
