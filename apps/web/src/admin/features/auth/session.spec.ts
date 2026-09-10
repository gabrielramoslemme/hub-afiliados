import { cookies } from 'next/headers';
import { UserRoleEnum } from '@porto/contracts';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_PATH,
  SESSION_USER_COOKIE,
} from '@/shared/lib/session-cookie';
import { createSession, destroySession } from './session';

// `session.ts` importa `server-only`, que lança fora do servidor. Aqui o alvo
// do teste é o próprio módulo, então quem sai é a marcação, não o módulo.
jest.mock('server-only', () => ({}));

const mockJar = { set: jest.fn(), get: jest.fn(), delete: jest.fn() };

jest.mock('next/headers', () => ({ cookies: jest.fn(async () => mockJar) }));

const login = {
  accessToken: 'token-do-operador',
  user: {
    publicId: '10000000-0000-4000-8000-000000000001',
    name: 'Marina Ferraz',
    email: 'marina@portoseguro.com.br',
    role: UserRoleEnum.PORTO_ANALYST,
    shouldChangePassword: false,
  },
};

beforeEach(() => {
  (cookies as jest.MockedFunction<typeof cookies>).mockClear();
  mockJar.set.mockReset();
  mockJar.delete.mockReset();
});

describe('createSession', () => {
  /**
   * A landing e o cadastro dividem origem com o painel. Sem o `path`, o token
   * do operador viajaria em toda requisição da parte pública — e um XSS ali,
   * mesmo sem ler o cookie `httpOnly`, poderia gastá-lo chamando `/admin`.
   */
  it('scopes both cookies to the panel, so the public pages never carry the operator token', async () => {
    await createSession(login);

    for (const call of mockJar.set.mock.calls) {
      expect(call[2]).toMatchObject({ path: SESSION_COOKIE_PATH, httpOnly: true });
    }

    expect(SESSION_COOKIE_PATH).toBe('/admin');
    expect(mockJar.set).toHaveBeenCalledTimes(2);
  });

  it('keeps the token and the profile in the two known cookies', async () => {
    await createSession(login);

    expect(mockJar.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      'token-do-operador',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(mockJar.set).toHaveBeenCalledWith(
      SESSION_USER_COOKIE,
      JSON.stringify(login.user),
      expect.objectContaining({ httpOnly: true }),
    );
  });
});

describe('destroySession', () => {
  /**
   * Cookie só morre quando nome **e** caminho batem. Apagar sem o `path`
   * deixaria a sessão viva no navegador com a tela mostrando login — o pior
   * formato de falha para quem clicou em "sair".
   */
  it('deletes both cookies on the same path they were written to', async () => {
    await destroySession();

    expect(mockJar.delete).toHaveBeenCalledWith({
      name: SESSION_COOKIE,
      path: SESSION_COOKIE_PATH,
    });
    expect(mockJar.delete).toHaveBeenCalledWith({
      name: SESSION_USER_COOKIE,
      path: SESSION_COOKIE_PATH,
    });
  });

  /**
   * Quem já estava logado quando isto subiu tem o cookie em `/`. Alcançar só
   * `/admin` deixaria essa sessão viva e sem como sair: o `middleware` enxerga
   * o cookie antigo, manda para o painel, a leitura toma 401 e volta para o
   * login — em laço, até os oito horas do `maxAge` vencerem.
   */
  it('also clears the legacy root-path cookies, so an open session can still sign out', async () => {
    await destroySession();

    expect(mockJar.delete).toHaveBeenCalledWith({ name: SESSION_COOKIE, path: '/' });
    expect(mockJar.delete).toHaveBeenCalledWith({ name: SESSION_USER_COOKIE, path: '/' });
  });
});
