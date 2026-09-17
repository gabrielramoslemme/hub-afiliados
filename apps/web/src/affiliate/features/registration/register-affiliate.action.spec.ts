import {
  AffiliateStatusEnum,
  PixKeyTypeEnum,
  RegistrationErrorCodeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { registerAffiliate } from './register-affiliate.action';

jest.mock('@/shared/http/api-client', () => ({ publicApiFetch: jest.fn() }));

const apiFetch = publicApiFetch as jest.MockedFunction<typeof publicApiFetch>;

/**
 * As regras de cada campo são do schema e têm teste em `registration-schema.spec.ts`.
 * Aqui fica só a fronteira: o que chega à API, e como a recusa dela volta para a tela.
 */
const validInput = {
  fullName: 'Marina Ferraz',
  email: 'marina@email.com',
  cpf: '529.982.247-25',
  rg: '12.345.678-X',
  pixKeyType: PixKeyTypeEnum.EMAIL,
  pixKey: 'marina@email.com',
  termsAccepted: true,
};

function sentBody(): Record<string, unknown> {
  const [, init] = apiFetch.mock.calls[0];

  return JSON.parse(String(init?.body));
}

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

  /* O corpo é o que o schema devolveu, e não o que a tela mandou: normalizado. */
  it('posts what the schema normalized, not what the form sent', async () => {
    await registerAffiliate({
      ...validInput,
      email: '  Marina@Email.com  ',
      rg: '12.345.678-x',
      socialNetwork: SocialNetworkEnum.INSTAGRAM,
      socialHandle: '@marina.ferraz',
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/affiliates',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(sentBody()).toEqual({
      fullName: 'Marina Ferraz',
      email: 'marina@email.com',
      cpf: '529.982.247-25',
      rg: '12345678X',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'marina@email.com',
      socialNetwork: SocialNetworkEnum.INSTAGRAM,
      socialHandle: 'marina.ferraz',
      termsAccepted: true,
    });
  });

  /*
    O `select` começa vazio e manda `''`. Mandar isso adiante gravaria uma rede
    em branco ao lado de um `@` nulo — metade de um par que o banco recusa.
  */
  it('sends no social profile when the person chose no network', async () => {
    await registerAffiliate({ ...validInput, socialNetwork: '', socialHandle: '' });

    expect(sentBody()).not.toHaveProperty('socialNetwork');
    expect(sentBody()).not.toHaveProperty('socialHandle');
  });

  it('refuses an invalid payload on the offending field without calling the api', async () => {
    const result = await registerAffiliate({ ...validInput, fullName: 'Marina' });

    expect(result).toEqual({ status: 'invalid', fieldErrors: { fullName: expect.any(String) } });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('turns a refusal the api tied to a field into an error on that field', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(409, RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED, 'Já cadastrado.'),
    );

    await expect(registerAffiliate(validInput)).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { cpf: 'Já cadastrado.' },
    });
  });

  it('turns an api error without a known code into a form error', async () => {
    apiFetch.mockRejectedValue(new ApiError(400, null, 'Requisição inválida.'));

    await expect(registerAffiliate(validInput)).resolves.toEqual({
      status: 'failed',
      message: 'Requisição inválida.',
    });
  });

  it('does not leak an unexpected failure to the page', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:3000'));

    const result = await registerAffiliate(validInput);

    expect(result.status).toBe('failed');
    expect(JSON.stringify(result)).not.toContain('ECONNREFUSED');
  });
});
