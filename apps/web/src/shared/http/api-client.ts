import 'server-only';

import { cookies, headers } from 'next/headers';
import { env } from '@/shared/lib/env';
import { createRateLimiter } from '@/shared/lib/rate-limit';
import { AFFILIATE_SESSION_COOKIE, SESSION_COOKIE } from '@/shared/lib/session-cookie';
import { ApiError, type ApiErrorBody, messageOf } from './api-error';
import { clientIp } from './client-ip';

/**
 * O navegador nunca fala com a API: o token de sessão vive em cookie `httpOnly`
 * e só o servidor do Next o lê. Some o CORS como superfície, some o token do
 * alcance de qualquer script, e sobra um lugar único para rate limit.
 *
 * São duas funções em vez de um parâmetro `auth` porque esquecer um booleano é
 * fácil; escolher o nome errado da função, não.
 */
async function request<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json();

  if (!response.ok) {
    const error = body as ApiErrorBody;
    throw new ApiError(error.statusCode ?? response.status, error.code ?? null, messageOf(error));
  }

  return body as T;
}

/*
  Vinte chamadas por rota a cada quinze minutos, por visitante: folga para quem
  erra a senha ou o formulário, e pouco para quem testa e-mails e CPFs em massa
  ou dispara cadastros para encher a caixa de outra pessoa. A conta é por rota
  para um login insistente não travar o cadastro de quem divide a mesma rede.
*/
const publicRouteLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60 * 1000 });

/**
 * Rota pública: cadastro, logins e senha. Nenhum token viaja, e por isso é aqui
 * que o volume por visitante é contido, antes de a chamada sair do Next.
 */
export async function publicApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const visitor = clientIp(await headers());

  if (visitor && !publicRouteLimiter.consume(`${path} ${visitor}`, Date.now())) {
    throw new ApiError(
      429,
      null,
      'Muitas tentativas a partir desta conexão. Aguarde alguns minutos e tente de novo.',
    );
  }

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
