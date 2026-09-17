import 'server-only';

import { cookies } from 'next/headers';
import type { AffiliateLoginResponse } from '@porto/contracts';
import {
  AFFILIATE_SESSION_COOKIE,
  AFFILIATE_SESSION_USER_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from '@/shared/lib/session-cookie';

export type AffiliateSessionUser = AffiliateLoginResponse['user'];

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

/**
 * Cookie próprio do afiliado, separado do cookie do operador. Não é zelo
 * excessivo: o `middleware` de `/admin` só confere que o cookie existe, então
 * um nome compartilhado transformaria "entrei como afiliado" em "entrei no
 * painel de análise".
 */
export async function createSession(login: AffiliateLoginResponse): Promise<void> {
  const jar = await cookies();

  jar.set(AFFILIATE_SESSION_COOKIE, login.accessToken, COOKIE_OPTIONS);
  jar.set(AFFILIATE_SESSION_USER_COOKIE, JSON.stringify(login.user), COOKIE_OPTIONS);
}

export async function readSessionUser(): Promise<AffiliateSessionUser | null> {
  const raw = (await cookies()).get(AFFILIATE_SESSION_USER_COOKIE)?.value;

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AffiliateSessionUser;
  } catch {
    // Cookie corrompido vale o mesmo que cookie ausente: o layout manda para a
    // sessão expirada, que apaga os cookies, e a pessoa entra de novo.
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();

  jar.delete(AFFILIATE_SESSION_COOKIE);
  jar.delete(AFFILIATE_SESSION_USER_COOKIE);
}
