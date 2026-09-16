import { AuthErrorCodeEnum } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { resetPassword } from './reset-password.action';

jest.mock('@/shared/http/api-client', () => ({ publicApiFetch: jest.fn() }));

const apiFetch = publicApiFetch as jest.MockedFunction<typeof publicApiFetch>;

const input = {
  token: 'plain-token',
  password: 'SenhaNova!2026',
  passwordConfirmation: 'SenhaNova!2026',
};

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(undefined);
});

describe('resetPassword', () => {
  it('posts to the affiliate channel', async () => {
    await resetPassword(input);

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'plain-token', password: 'SenhaNova!2026' }),
    });
  });

  /* A confirmação existe para a pessoa não errar a digitação; a API não tem o que fazer com ela. */
  it('keeps the confirmation out of the request', async () => {
    await resetPassword(input);

    expect(apiFetch.mock.calls[0]?.[1]?.body).not.toContain('passwordConfirmation');
  });

  it('refuses two passwords that do not match, without calling the API', async () => {
    const result = await resetPassword({ ...input, passwordConfirmation: 'OutraCoisa!2026' });

    expect(result).toEqual({ ok: false, message: 'As senhas não conferem' });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('explains a link that does not work anymore', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(400, AuthErrorCodeEnum.INVALID_TOKEN, 'Este link não vale mais.'),
    );

    const result = await resetPassword(input);

    expect(result).toEqual({
      ok: false,
      message:
        'Este link não vale mais. Ele só pode ser usado uma vez, e expira — peça um novo em "Esqueci minha senha".',
    });
  });
});
