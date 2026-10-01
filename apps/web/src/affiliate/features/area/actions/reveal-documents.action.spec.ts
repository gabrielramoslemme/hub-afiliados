import { redirect } from 'next/navigation';
import { AuthErrorCodeEnum, RateLimitErrorCodeEnum } from '@porto/contracts';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { revealDocuments } from './reveal-documents.action';

jest.mock('@/shared/http/api-client', () => ({ affiliateApiFetch: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const apiFetch = affiliateApiFetch as jest.MockedFunction<typeof affiliateApiFetch>;

const TOO_MANY = 'Muitas tentativas. Tente de novo em 14 minutos.';

const documents = { cpf: '52998224725', rg: '12345678X', pixKey: '11987654321' };
const input = { currentPassword: 'SenhaAtual!2026' };

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue(documents);
});

describe('revealDocuments', () => {
  it('asks the affiliate channel for the documents with the password that confirms it', async () => {
    await expect(revealDocuments(input)).resolves.toEqual({ status: 'success', documents });
    expect(apiFetch).toHaveBeenCalledWith('/affiliate/me/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('refuses an empty password without calling the api', async () => {
    await expect(revealDocuments({ currentPassword: '' })).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { currentPassword: 'Informe sua senha atual.' },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('puts a wrong password on the password field', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(400, AuthErrorCodeEnum.WRONG_PASSWORD, 'Senha incorreta.'),
    );

    await expect(revealDocuments(input)).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { currentPassword: 'Senha incorreta. Confira e tente de novo.' },
    });
  });

  it('sends an expired session back to sign in', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, null, 'Sessão expirada. Entre novamente.'));

    await expect(revealDocuments(input)).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/minha-conta/sessao-expirada');
  });

  it('hides an unexpected failure behind a message the affiliate can act on', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(revealDocuments(input)).resolves.toEqual({
      status: 'failed',
      message: 'Não foi possível mostrar seus documentos agora. Tente novamente em instantes.',
    });
  });

  // A tela trava o envio e mostra a contagem: tentar de novo antes só
  // renovaria o bloqueio.
  it('tells the form how long to wait when the api refused for too many attempts', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(429, RateLimitErrorCodeEnum.TOO_MANY_REQUESTS, TOO_MANY, 840),
    );

    await expect(revealDocuments(input)).resolves.toEqual({
      status: 'failed',
      message: TOO_MANY,
      retryAfterSeconds: 840,
    });
  });
});
