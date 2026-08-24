import 'server-only';

import { cookies } from 'next/headers';
import type { AdminLoginResponse } from '@porto/contracts';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_USER_COOKIE,
} from '@/core/session-cookie';

export type SessionUser = AdminLoginResponse['user'];

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
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
    // Cookie corrompido vale o mesmo que cookie ausente: o middleware manda
    // para o login e a pessoa entra de novo.
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();

  jar.delete(SESSION_COOKIE);
  jar.delete(SESSION_USER_COOKIE);
}
