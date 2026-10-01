import 'server-only';

import { cookies } from 'next/headers';
import type { AdminLoginResponse } from '@porto/contracts';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_PATH,
  SESSION_MAX_AGE_SECONDS,
} from '@/shared/lib/session-cookie';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: SESSION_COOKIE_PATH,
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

/**
 * Só o token vai em cookie. Nome e perfil ficavam num segundo cookie que ninguém
 * conferia — forjá-lo bastava para a tela mostrar outro nome e outro perfil —, e
 * agora o layout os lê de `GET /admin/me`, a cada página.
 */
export async function createSession(login: AdminLoginResponse): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, login.accessToken, COOKIE_OPTIONS);
}

export async function destroySession(): Promise<void> {
  // Apagar exige o mesmo `path` da escrita: o navegador guarda um cookie por
  // par nome+caminho, então `delete(nome)` sozinho não alcança o que foi
  // gravado em `/admin` — a pessoa veria a tela de login com a sessão viva.
  (await cookies()).delete({ name: SESSION_COOKIE, path: SESSION_COOKIE_PATH });
}
