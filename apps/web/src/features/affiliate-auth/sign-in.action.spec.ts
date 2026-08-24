import { redirect } from 'next/navigation';
import { AffiliateStatusEnum, AuthErrorCodeEnum } from '@porto/contracts';
import { AFFILIATE_AREA_PATH } from '@/core/affiliate-routes';
import { publicApiFetch } from '@/core/http/api-client';
import { ApiError } from '@/core/http/api-error';
import { createSession } from './session';
import { signIn } from './sign-in.action';

jest.mock('@/core/http/api-client', () => ({ publicApiFetch: jest.fn() }));
jest.mock('./session', () => ({ createSession: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));

const apiFetch = publicApiFetch as jest.MockedFunction<typeof publicApiFetch>;
const session = createSession as jest.MockedFunction<typeof createSession>;
const goTo = redirect as jest.MockedFunction<typeof redirect>;

const login = {
  accessToken: 'token',
  user: {
    publicId: '10000000-0000-4000-8000-000000000001',
    name: 'Marina Ferraz',
    email: 'marina@email.com',
    status: AffiliateStatusEnum.APPROVED,
    coupon: 'MARINA25',
  },
};

const credentials = { email: 'marina@email.com', password: 'MudarAgora!2026' };

beforeEach(() => {
  apiFetch.mockReset();
  session.mockReset();
  goTo.mockReset();
  apiFetch.mockResolvedValue(login);
});

describe('signIn', () => {
  it('posts to the affiliate channel', async () => {
    await signIn(credentials);

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/auth/login', expect.anything());
  });

  it('sends the email already normalized', async () => {
    await signIn({ ...credentials, email: '  Marina@Email.com  ' });

    const [, init] = apiFetch.mock.calls[0];
    expect(JSON.parse(String(init?.body)).email).toBe('marina@email.com');
  });

  it('opens the session with what the api returned', async () => {
    await signIn(credentials);

    expect(session).toHaveBeenCalledWith(login);
  });

  it('lands on the affiliate area', async () => {
    await signIn(credentials);

    expect(goTo).toHaveBeenCalledWith(AFFILIATE_AREA_PATH);
  });

  it('refuses an invalid payload without calling the api', async () => {
    await expect(signIn({ email: 'nao-e-email', password: '' })).resolves.toEqual({
      message: 'Informe e-mail e senha.',
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('opens no session when the api refuses', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(401, AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW, 'Mensagem da API.'),
    );

    await signIn(credentials);

    expect(session).not.toHaveBeenCalled();
    expect(goTo).not.toHaveBeenCalled();
  });

  it('translates the refusal by code, never by the text the api sent', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(401, AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW, 'Mensagem da API.'),
    );

    await expect(signIn(credentials)).resolves.toEqual({
      message:
        'Seu cadastro ainda está em análise. Assim que houver decisão, você recebe um e-mail.',
    });
  });

  it('reports a failure that is not an api error without leaking it', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(signIn(credentials)).resolves.toEqual({
      message: 'Não foi possível entrar agora. Tente novamente em instantes.',
    });
  });
});
