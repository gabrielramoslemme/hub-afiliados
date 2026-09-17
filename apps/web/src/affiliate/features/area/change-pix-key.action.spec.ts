import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthErrorCodeEnum, PixKeyTypeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { changePixKey } from './change-pix-key.action';

jest.mock('@/shared/http/api-client', () => ({ affiliateApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const apiFetch = affiliateApiFetch as jest.MockedFunction<typeof affiliateApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const input = {
  pixKeyType: PixKeyTypeEnum.PHONE,
  pixKey: '(11) 98765-4321',
  currentPassword: 'SenhaAtual!2026',
};

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue(undefined);
});

describe('changePixKey', () => {
  it('sends the key and the password that confirms it to the affiliate channel', async () => {
    await changePixKey(input);

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/me/pix-key', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  });

  it('refreshes the profile once the key changed', async () => {
    await expect(changePixKey(input)).resolves.toEqual({ status: 'success' });
    expect(revalidate).toHaveBeenCalledWith('/minha-conta/perfil');
  });

  it('refuses a key that does not fit its type without calling the api', async () => {
    await expect(
      changePixKey({ ...input, pixKeyType: PixKeyTypeEnum.EMAIL, pixKey: 'marina' }),
    ).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { pixKey: 'Informe um e-mail válido como chave PIX.' },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('puts a wrong password on the password field', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(400, AuthErrorCodeEnum.WRONG_PASSWORD, 'Senha incorreta.'),
    );

    await expect(changePixKey(input)).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { currentPassword: 'Senha incorreta. Confira e tente de novo.' },
    });
    expect(revalidate).not.toHaveBeenCalled();
  });

  /* A mensagem da API fala do "CPF informado", que no perfil ninguém digitou. */
  it('explains that a cpf key has to be the cpf of the registration', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(
        400,
        RegistrationErrorCodeEnum.PIX_KEY_MISMATCH,
        'A chave PIX do tipo CPF precisa ser igual ao CPF informado.',
      ),
    );

    await expect(
      changePixKey({ ...input, pixKeyType: PixKeyTypeEnum.CPF, pixKey: '111.444.777-35' }),
    ).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { pixKey: 'A chave do tipo CPF precisa ser o CPF do seu cadastro.' },
    });
  });

  it('sends an expired session back to sign in', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, null, 'Sessão expirada. Entre novamente.'));

    await expect(changePixKey(input)).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/minha-conta/sessao-expirada');
  });

  it('hides an unexpected failure behind a message the affiliate can act on', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(changePixKey(input)).resolves.toEqual({
      status: 'failed',
      message: 'Não foi possível alterar sua chave PIX agora. Tente novamente em instantes.',
    });
  });
});
