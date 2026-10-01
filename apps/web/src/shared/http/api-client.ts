import 'server-only';

import { cookies, headers } from 'next/headers';
import { env } from '@/shared/lib/env';
import { AFFILIATE_SESSION_COOKIE, SESSION_COOKIE } from '@/shared/lib/session-cookie';
import { ApiError, type ApiErrorBody, messageOf } from './api-error';

/**
 * O navegador nunca fala com a API: o token de sessão vive em cookie `httpOnly`
 * e só o servidor do Next o lê. Some o CORS como superfície, some o token do
 * alcance de qualquer script, e sobra um lugar único para rate limit.
 *
 * São duas funções em vez de um parâmetro `auth` porque esquecer um booleano é
 * fácil; escolher o nome errado da função, não.
 */
/*
  A API conta as tentativas por visitante, pelo endereço que o CloudFront
  escreveu. Quem chama a API é o Next, então o header precisa seguir adiante —
  sem ele, todo visitante contaria como o próprio Next, e vinte logins de gente
  diferente travariam o portal inteiro.
*/
const VISITOR_HEADER = 'cloudfront-viewer-address';

async function request<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const visitor = (await headers()).get(VISITOR_HEADER);

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(visitor ? { [VISITOR_HEADER]: visitor } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json();

  if (!response.ok) {
    const error = body as ApiErrorBody;
    const retryAfter = Number(response.headers.get('retry-after'));

    throw new ApiError(
      error.statusCode ?? response.status,
      error.code ?? null,
      messageOf(error),
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }

  return body as T;
}

/** Rota pública: cadastro e login. Nenhum token viaja. */
export function publicApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, null);
}

/** Rota autenticada do painel. Sem cookie de sessão, falha aqui e não na API. */
export async function authedApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) throw new ApiError(401, null, 'Sessão expirada. Entre novamente.');

  return request<T>(path, init, token);
}

/**
 * Rota autenticada da área do afiliado. É uma terceira função, e não um
 * parâmetro de audiência, pelo mesmo motivo das outras duas: o cookie que ela
 * lê é outro, e trocar audiência por engano abriria o canal errado com o token
 * errado. O nome da função é a escolha; não há booleano para esquecer.
 */
export async function affiliateApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(AFFILIATE_SESSION_COOKIE)?.value;

  if (!token) throw new ApiError(401, null, 'Sessão expirada. Entre novamente.');

  return request<T>(path, init, token);
}
