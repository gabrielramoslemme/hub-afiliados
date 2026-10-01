import { cookies } from 'next/headers';
import { UserRoleEnum } from '@porto/contracts';
import { SESSION_COOKIE, SESSION_COOKIE_PATH } from '@/shared/lib/session-cookie';
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
  it('scopes the token to the panel, so the public pages never carry it', async () => {
    await createSession(login);

    expect(mockJar.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      'token-do-operador',
      expect.objectContaining({ path: SESSION_COOKIE_PATH, httpOnly: true }),
    );
    expect(SESSION_COOKIE_PATH).toBe('/admin');
  });

  /*
    Nome e perfil num cookie que ninguém conferia eram forjáveis: bastava
    escrevê-lo para o painel mostrar outro nome e outro perfil. O layout lê quem
    está logado da API, a cada página.
  */
  it('writes only the token, never the profile', async () => {
    await createSession(login);

    expect(mockJar.set).toHaveBeenCalledTimes(1);
  });
});

/**
 * O jar do Next indexa cookie por **nome**, não por nome+caminho:
 * `ResponseCookies` guarda um `Map` chaveado pelo nome e regrava os `Set-Cookie`
 * a partir dele. Dois `delete` do mesmo cookie saem como um só — o último. Sem
 * reproduzir isso aqui, o teste mede "a chamada aconteceu" e não "o navegador
 * recebeu", que é onde o logout quebrou.
 */
function survivingDeletes(): Record<string, string | undefined> {
  const surviving: Record<string, string | undefined> = {};

  for (const call of mockJar.delete.mock.calls) {
    const { name, path } = call[0] as { name: string; path?: string };

    surviving[name] = path;
  }

  return surviving;
}

describe('destroySession', () => {
  /**
   * Cookie só morre quando nome **e** caminho batem. Apagar em outro caminho
   * deixaria a sessão viva no navegador com a tela mostrando login — o pior
   * formato de falha para quem clicou em "sair".
   */
  it('deletes the cookie on the same path it was written to', async () => {
    await destroySession();

    expect(survivingDeletes()).toEqual({ [SESSION_COOKIE]: SESSION_COOKIE_PATH });
  });

  /**
   * Um `delete` por cookie, e nenhum a mais. Apagar o mesmo nome num segundo
   * caminho não é zelo redundante: o segundo sobrescreve o primeiro no jar, o
   * `Set-Cookie` sai só para o caminho errado e a sessão sobrevive ao "sair" —
   * o `middleware` então devolve a pessoa ao painel, em laço.
   */
  it('deletes each cookie once, so no second path can overwrite the first', async () => {
    await destroySession();

    expect(mockJar.delete).toHaveBeenCalledTimes(1);
  });
});
