import { AffiliateStatusEnum, PixKeyTypeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { registerAffiliate } from './register-affiliate.action';

jest.mock('@/shared/http/api-client', () => ({ publicApiFetch: jest.fn() }));

const apiFetch = publicApiFetch as jest.MockedFunction<typeof publicApiFetch>;

const validInput = {
  fullName: 'Marina Ferraz',
  email: 'marina@email.com',
  cpf: '529.982.247-25',
  pixKeyType: PixKeyTypeEnum.EMAIL,
  pixKey: 'marina@email.com',
};

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({
    publicId: '10000000-0000-4000-8000-000000000001',
    status: AffiliateStatusEnum.PENDING_APPROVAL,
  });
});

describe('registerAffiliate', () => {
  it('registers an affiliate the api accepts', async () => {
    await expect(registerAffiliate(validInput)).resolves.toEqual({ status: 'success' });
  });

  it('posts to the affiliates resource', async () => {
    await registerAffiliate(validInput);

    expect(apiFetch).toHaveBeenCalledWith('/affiliates', expect.anything());
  });

  it('sends the email already normalized', async () => {
    await registerAffiliate({ ...validInput, email: '  Marina@Email.com  ' });

    const [, init] = apiFetch.mock.calls[0];
    expect(JSON.parse(String(init?.body)).email).toBe('marina@email.com');
  });

  it('refuses an invalid payload without calling the api', async () => {
    await registerAffiliate({ ...validInput, fullName: 'Marina' });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('reports a schema violation on the offending field', async () => {
    const result = await registerAffiliate({ ...validInput, fullName: 'Marina' });

    expect(result).toEqual({
      status: 'invalid',
      fieldErrors: { fullName: 'Informe o nome e o sobrenome.' },
    });
  });

  it('turns a duplicated email into an error on the email field', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(409, RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED, 'Já cadastrado.'),
    );

    const result = await registerAffiliate(validInput);

    expect(result).toEqual({ status: 'invalid', fieldErrors: { email: 'Já cadastrado.' } });
  });

  it('turns a mismatched pix key into an error on the pix key field', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(400, RegistrationErrorCodeEnum.PIX_KEY_MISMATCH, 'A chave precisa bater.'),
    );

    const result = await registerAffiliate(validInput);

    expect(result).toEqual({
      status: 'invalid',
      fieldErrors: { pixKey: 'A chave precisa bater.' },
    });
  });

  it('turns an api error without a known code into a form error', async () => {
    apiFetch.mockRejectedValue(new ApiError(400, null, 'Requisição inválida.'));

    const result = await registerAffiliate(validInput);

    expect(result).toEqual({ status: 'failed', message: 'Requisição inválida.' });
  });

  it('does not leak an unexpected failure to the page', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:3000'));

    const result = await registerAffiliate(validInput);

    expect(result).toEqual({
      status: 'failed',
      message: 'Não foi possível enviar seu cadastro agora. Tente novamente em instantes.',
    });
  });
});
