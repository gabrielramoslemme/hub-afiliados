import { ReferralPeriodEnum } from '@porto/contracts';
import { mockReferrals, mockWallet } from './fixtures';

/**
 * O que sobrou do dublê: a carteira e as indicações do afiliado, que dependem
 * de venda, extrato e pagamento — tabelas que a Onda 1 não tem. Login, conta e
 * o canal `/v1/admin` saíram daqui: as três pontas falam com a API de verdade.
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
    method: 'GET',
    pattern: /^\/affiliate\/me\/wallet$/,
    handle() {
      return json(mockWallet);
    },
  },
  {
    method: 'GET',
    pattern: /^\/affiliate\/me\/referrals$/,
    handle({ path, query }) {
      const period = query.get('period') ?? ReferralPeriodEnum.LAST_30_DAYS;

      // A API vai recusar o período desconhecido na validação do DTO, e o dublê
      // recusa do mesmo jeito: devolver a lista inteira esconderia o erro.
      if (!Object.values<string>(ReferralPeriodEnum).includes(period)) {
        return fail(400, null, `Período inválido: ${period}`, path);
      }

      return json(mockReferrals(period as ReferralPeriodEnum));
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
const DUBBED = ['/affiliate/me/wallet', '/affiliate/me/referrals'];

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
