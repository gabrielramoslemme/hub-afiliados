import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { requestPasswordReset } from './forgot-password.action';

jest.mock('@/shared/http/api-client', () => ({ publicApiFetch: jest.fn() }));

const apiFetch = publicApiFetch as jest.MockedFunction<typeof publicApiFetch>;

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(undefined);
});

describe('requestPasswordReset', () => {
  it('posts to the affiliate channel', async () => {
    await requestPasswordReset({ email: 'marina@email.com' });

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'marina@email.com' }),
    });
  });

  it('normalizes the email before sending it', async () => {
    await requestPasswordReset({ email: '  Marina@Email.com ' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/affiliate/auth/forgot-password',
      expect.objectContaining({ body: JSON.stringify({ email: 'marina@email.com' }) }),
    );
  });

  it('refuses what is not an email without calling the API', async () => {
    const result = await requestPasswordReset({ email: 'nao-e-email' });

    expect(result).toEqual({ ok: false, message: 'Informe um e-mail válido.' });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  /*
    O 204 da API é o mesmo exista ou não a conta, e o action não tem como — nem
    por quê — distinguir: se ele devolvesse algo diferente, a tela viraria uma
    forma de descobrir quem é afiliado.
  */
  it('succeeds the same way for any email the API accepted', async () => {
    const result = await requestPasswordReset({ email: 'ninguem@email.com' });

    expect(result).toEqual({ ok: true });
  });

  it('reports a failure that is the API falling over, not a missing account', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, null, 'Erro interno'));

    const result = await requestPasswordReset({ email: 'marina@email.com' });

    expect(result).toEqual({
      ok: false,
      message: 'Não foi possível enviar o link agora. Tente novamente em instantes.',
    });
  });
});
