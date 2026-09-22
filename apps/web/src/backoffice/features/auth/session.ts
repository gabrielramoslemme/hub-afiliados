import 'server-only';

import { cookies } from 'next/headers';
import type { AdminLoginResponse } from '@porto/contracts';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_PATH,
  SESSION_MAX_AGE_SECONDS,
  SESSION_USER_COOKIE,
} from '@/shared/lib/session-cookie';

export type SessionUser = AdminLoginResponse['user'];

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: SESSION_COOKIE_PATH,
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

/**
 * Nome, e-mail e perfil também vão em cookie `httpOnly`. Não são segredo, mas
 * deixá-los legíveis por script não traria vantagem nenhuma — e a API não expõe
 * rota de perfil do operador nesta onda.
 */
export async function createSession(login: AdminLoginResponse): Promise<void> {
  const jar = await cookies();

  jar.set(SESSION_COOKIE, login.accessToken, COOKIE_OPTIONS);
  jar.set(SESSION_USER_COOKIE, JSON.stringify(login.user), COOKIE_OPTIONS);
}

export async function readSessionUser(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(SESSION_USER_COOKIE)?.value;

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    // Cookie corrompido vale o mesmo que cookie ausente: o layout manda para a
    // sessão expirada, que apaga os cookies, e a pessoa entra de novo.
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();

  // Apagar exige o mesmo `path` da escrita: o navegador guarda um cookie por
  // par nome+caminho, então `delete(nome)` sozinho não alcança o que foi
  // gravado em `/admin` — a pessoa veria a tela de login com a sessão viva.
  //
  // E **um** `delete` por cookie: o jar do Next indexa por nome, então apagar o
  // mesmo nome num segundo caminho não soma — sobrescreve, e só o último vira
  // `Set-Cookie`.
  jar.delete({ name: SESSION_COOKIE, path: SESSION_COOKIE_PATH });
  jar.delete({ name: SESSION_USER_COOKIE, path: SESSION_COOKIE_PATH });
}
