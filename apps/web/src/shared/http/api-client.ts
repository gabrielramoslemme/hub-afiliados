import 'server-only';

import { cookies } from 'next/headers';
import { env } from '@/shared/lib/env';
import { AFFILIATE_SESSION_COOKIE, SESSION_COOKIE } from '@/shared/lib/session-cookie';
import { ApiError, type ApiErrorBody, messageOf } from './api-error';

type Transport = (input: string, init: RequestInit) => Promise<Response>;

let announced = false;

/**
 * Em desenvolvimento, enquanto as rotas `/v1/admin` não existirem na API, o
 * transporte é trocado por um dublê em memória. Trocar a **função**, e não
 * remendar o `fetch` global: o Next reaplica o próprio patch de cache sobre o
 * `globalThis.fetch` a cada recompilação, e um interceptador instalado no boot
 * some no primeiro Fast Refresh, levando o painel junto sem nada no log.
 *
 * O import é dinâmico para o dublê não entrar no bundle de quem não o liga.
 */
async function transport(): Promise<Transport> {
  if (!env.isMockingApi) {
    if (!announced) {
      announced = true;
      console.warn(
        '[web] API_MOCKING não está "enabled": o painel e a área do afiliado vão ' +
          'falhar ao entrar, porque /v1/admin e /v1/affiliate/auth ainda não ' +
          'existem na API.',
      );
    }

    return fetch;
  }

  if (!announced) {
    announced = true;
    console.warn('[web] Dublê ativo: /v1/admin e a área do afiliado são respondidos em memória.');
  }

  const { mockApiFetch } = await import('@/shared/http/mocks/mock-api');

  // O dublê responde só o canal `/admin`. O cadastro público continua indo para
  // a API de verdade com a mesma flag ligada — é por isso que ele devolve
  // `null` em vez de 404 para o que não é dele.
  return async (input, init) => (await mockApiFetch(input, init)) ?? fetch(input, init);
}

/**
 * O navegador nunca fala com a API: o token de sessão vive em cookie `httpOnly`
 * e só o servidor do Next o lê. Some o CORS como superfície, some o token do
 * alcance de qualquer script, e sobra um lugar único para rate limit.
 *
 * São duas funções em vez de um parâmetro `auth` porque esquecer um booleano é
 * fácil; escolher o nome errado da função, não.
 */
async function request<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const send = await transport();

  const response = await send(`${env.apiBaseUrl}${path}`, {
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
