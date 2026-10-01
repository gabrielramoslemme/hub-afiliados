import { redirect } from 'next/navigation';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { destroySession } from '../session';
import { signOut } from './sign-out.action';

jest.mock('@/shared/http/api-client', () => ({ affiliateApiFetch: jest.fn() }));
jest.mock('../session', () => ({ destroySession: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const apiFetch = affiliateApiFetch as jest.MockedFunction<typeof affiliateApiFetch>;

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue(undefined);
});

describe('signOut', () => {
  // Só apagar o cookie deixaria o token valendo até vencer: um token copiado
  // antes continuaria lendo CPF e chave PIX.
  it('ends the session on the api before dropping the cookie', async () => {
    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/auth/logout', { method: 'POST' });
    expect(destroySession).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/entrar');
  });

  it('still drops the cookie when the api no longer knows the session', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, null, 'Sessão expirada. Entre novamente.'));

    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');

    expect(destroySession).toHaveBeenCalled();
  });
});
