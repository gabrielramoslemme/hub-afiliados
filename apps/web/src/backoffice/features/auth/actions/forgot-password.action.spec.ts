import { RateLimitErrorCodeEnum } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { requestPasswordReset } from './forgot-password.action';

jest.mock('@/shared/http/api-client', () => ({ publicApiFetch: jest.fn() }));

const apiFetch = publicApiFetch as jest.MockedFunction<typeof publicApiFetch>;

const TOO_MANY = 'Muitas tentativas. Tente de novo em 14 minutos.';

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(undefined);
});

describe('requestPasswordReset', () => {
  /* O canal é o que decide para qual tela o link do e-mail aponta. */
  it('posts to the admin channel', async () => {
    await requestPasswordReset({ email: 'ana@porto.example' });

    expect(apiFetch).toHaveBeenCalledWith('/admin/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'ana@porto.example' }),
    });
  });

  it('refuses what is not an email without calling the API', async () => {
    const result = await requestPasswordReset({ email: 'nao-e-email' });

    expect(result).toEqual({ ok: false, message: 'Informe um e-mail válido.' });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  /*
    A resposta é a mesma exista ou não a conta: se ela variasse, a tela viraria
    uma forma de descobrir quem opera o painel.
  */
  it('succeeds the same way for any email the API accepted', async () => {
    const result = await requestPasswordReset({ email: 'ninguem@porto.example' });

    expect(result).toEqual({ ok: true });
  });

  it('reports a failure that is the API falling over, not a missing account', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, null, 'Erro interno'));

    const result = await requestPasswordReset({ email: 'ana@porto.example' });

    expect(result).toEqual({
      ok: false,
      message: 'Não foi possível enviar o link agora. Tente novamente em instantes.',
    });
  });

  // A tela trava o envio e mostra a contagem: tentar de novo antes só
  // renovaria o bloqueio.
  it('tells the form how long to wait when the api refused for too many attempts', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(429, RateLimitErrorCodeEnum.TOO_MANY_REQUESTS, TOO_MANY, 840),
    );

    await expect(requestPasswordReset({ email: 'analista@porto.example' })).resolves.toEqual({
      ok: false,
      message: TOO_MANY,
      retryAfterSeconds: 840,
    });
  });
});
