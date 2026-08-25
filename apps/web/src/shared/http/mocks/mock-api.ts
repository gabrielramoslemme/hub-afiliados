import { AuthErrorCodeEnum } from '@porto/contracts';
import { mockAffiliateAccount, mockWallet } from './fixtures';

/**
 * Dublê da área do afiliado, que ainda não existe na API — cards 4.x. O canal
 * `/v1/admin` saiu daqui: o painel fala com a API de verdade.
 *
 * É uma função que devolve `Response`, e **não** um interceptador de `fetch`
 * global. A diferença não é de estilo: o Next reaplica o próprio patch de cache
 * sobre o `globalThis.fetch` a cada recompilação em dev, e um interceptador
 * instalado no boot é descartado em silêncio no primeiro Fast Refresh — a tela
 * passa a receber ECONNREFUSED sem nada no log dizer por quê.
 *
 * A resposta volta pelo mesmo `request()` do `api-client`, então continuam
 * exercitados o cabeçalho montado, o 204 sem corpo e a tradução do corpo de erro
 * em `ApiError`. O que deixa de ser exercitado é só o trecho de rede.
 */
const PASSWORD = 'MudarAgora!2026';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fail(status: number, code: string | null, message: string, path: string): Response {
  return json(
    { statusCode: status, code, message, path, timestamp: '2026-08-21T12:00:00.000Z' },
    status,
  );
}

interface MockRequest {
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
}

interface MockRoute {
  method: string;
  pattern: RegExp;
  handle(request: MockRequest, params: Record<string, string>): Response;
}

const routes: MockRoute[] = [
  {
    method: 'POST',
    pattern: /^\/affiliate\/auth\/login$/,
    handle({ path, body }) {
      if (body.password !== PASSWORD) {
        return fail(401, AuthErrorCodeEnum.INVALID_CREDENTIALS, 'E-mail ou senha inválidos.', path);
      }

      return json({
        accessToken: 'mock.affiliate.token',
        user: {
          publicId: mockAffiliateAccount.publicId,
          name: mockAffiliateAccount.name,
          email: String(body.email ?? mockAffiliateAccount.email),
          status: mockAffiliateAccount.status,
          coupon: mockAffiliateAccount.coupon,
        },
      });
    },
  },

  {
    method: 'GET',
    pattern: /^\/affiliate\/me$/,
    handle() {
      return json(mockAffiliateAccount);
    },
  },

  {
    method: 'GET',
    pattern: /^\/affiliate\/me\/wallet$/,
    handle() {
      return json(mockWallet);
    },
  },
];

async function readBody(init: RequestInit): Promise<Record<string, unknown>> {
  if (typeof init.body !== 'string') return {};

  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/*
  Os prefixos cujo conteúdo é inteiramente dublado. O que cai dentro de um deles
  e não casa com rota nenhuma vira 404 explícito; o que cai fora escapa para a
  API de verdade.

  `/affiliate` inteiro não entra: o cadastro público é `POST /affiliates`, fora
  de qualquer canal, e precisa continuar gravando no Postgres com a mesma flag
  ligada.
*/
const DUBBED = ['/affiliate/auth', '/affiliate/me'];

/**
 * Recebe a URL absoluta que o `api-client` montaria e devolve o que a API
 * responderia — ou `null`, que significa "não é comigo, mande para a API de
 * verdade".
 *
 * Rota dentro de um prefixo dublado que não está na tabela devolve 404 em vez
 * de `null`: escapar para a API seria trocar um erro claro por um ECONNREFUSED.
 */
export async function mockApiFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response | null> {
  const url = new URL(String(input));
  const path = url.pathname.replace(/^\/v1/, '');
  const method = (init.method ?? 'GET').toUpperCase();
  const body = await readBody(init);

  for (const route of routes) {
    if (route.method !== method) continue;

    const match = route.pattern.exec(path);
    if (!match) continue;

    return route.handle({ path, query: url.searchParams, body }, match.groups ?? {});
  }

  if (!DUBBED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;

  return fail(404, null, `Rota não dublada: ${method} ${path}`, path);
}
