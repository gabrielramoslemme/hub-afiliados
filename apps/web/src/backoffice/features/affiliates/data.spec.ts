import { SESSION_EXPIRED_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { fetchAffiliate, fetchAffiliates } from './data';
import type { QueueParams } from './lib/queue-params';

jest.mock('@/shared/http/api-client', () => ({ authedApiFetch: jest.fn() }));

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    // O `redirect` de verdade sinaliza por exceção; o dublê imita isso para o
    // teste provar que a leitura **para** ali, em vez de seguir e estourar.
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

const params: QueueParams = {
  page: 1,
  status: null,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const fetchMock = authedApiFetch as jest.MockedFunction<typeof authedApiFetch>;

describe('leitura da fila com a sessão vencida', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the analyst to sign in again when the api refuses the session', async () => {
    fetchMock.mockRejectedValue(new ApiError(401, null, 'Sessão expirada. Entre novamente.'));

    await expect(fetchAffiliates(params)).rejects.toThrow(`NEXT_REDIRECT:${SESSION_EXPIRED_PATH}`);
  });

  it('does the same for a token of the wrong channel', async () => {
    fetchMock.mockRejectedValue(new ApiError(403, null, 'Acesso restrito ao painel da Porto.'));

    await expect(fetchAffiliate('any-id')).rejects.toThrow(`NEXT_REDIRECT:${SESSION_EXPIRED_PATH}`);
  });

  it('lets a not found through, because that is the screen’s job to show', async () => {
    fetchMock.mockRejectedValue(new ApiError(404, null, 'Afiliado não encontrado.'));

    await expect(fetchAffiliate('any-id')).rejects.toThrow('Afiliado não encontrado.');
  });

  it('does not redirect when the read works', async () => {
    fetchMock.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

    await expect(fetchAffiliates(params)).resolves.toMatchObject({ total: 0 });
  });
});
