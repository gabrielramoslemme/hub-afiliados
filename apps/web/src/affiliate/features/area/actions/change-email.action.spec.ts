import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthErrorCodeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { changeEmail } from './change-email.action';

jest.mock('@/shared/http/api-client', () => ({ affiliateApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const apiFetch = affiliateApiFetch as jest.MockedFunction<typeof affiliateApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const input = { email: 'marina.nova@email.com', currentPassword: 'SenhaAtual!2026' };

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue(undefined);
});

describe('changeEmail', () => {
  it('sends the normalized email and the password that confirms it to the affiliate channel', async () => {
    await changeEmail({ ...input, email: '  Marina.Nova@Email.com ' });

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/me/email', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  });

  it('refreshes the profile once the email changed', async () => {
    await expect(changeEmail(input)).resolves.toEqual({ status: 'success' });
    expect(revalidate).toHaveBeenCalledWith('/minha-conta/perfil');
  });

  it('refuses something that is not an email without calling the api', async () => {
    await expect(changeEmail({ ...input, email: 'marina' })).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { email: 'Informe um e-mail válido.' },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('puts a wrong password on the password field', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(400, AuthErrorCodeEnum.WRONG_PASSWORD, 'Senha incorreta.'),
    );

    await expect(changeEmail(input)).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { currentPassword: 'Senha incorreta. Confira e tente de novo.' },
    });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('puts an email taken by another account on the email field', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(
        409,
        RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED,
        'Este e-mail já está cadastrado.',
      ),
    );

    await expect(changeEmail(input)).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { email: 'Este e-mail já está em uso em outra conta.' },
    });
  });

  it('sends an expired session back to sign in', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, null, 'Sessão expirada. Entre novamente.'));

    await expect(changeEmail(input)).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/minha-conta/sessao-expirada');
  });

  it('hides an unexpected failure behind a message the affiliate can act on', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(changeEmail(input)).resolves.toEqual({
      status: 'failed',
      message: 'Não foi possível alterar seu e-mail agora. Tente novamente em instantes.',
    });
  });
});
