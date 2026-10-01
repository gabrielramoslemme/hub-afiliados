import 'server-only';

import { cookies } from 'next/headers';
import type { AffiliateLoginResponse } from '@porto/contracts';
import { AFFILIATE_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/shared/lib/session-cookie';

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
 * painel de análise". Só o token: quem está logado, o layout lê da API.
 */
export async function createSession(login: AffiliateLoginResponse): Promise<void> {
  (await cookies()).set(AFFILIATE_SESSION_COOKIE, login.accessToken, COOKIE_OPTIONS);
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(AFFILIATE_SESSION_COOKIE);
}
