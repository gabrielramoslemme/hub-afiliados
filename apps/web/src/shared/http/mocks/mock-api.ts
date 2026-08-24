import { AffiliateStatusEnum, AuthErrorCodeEnum } from '@porto/contracts';
import {
  mockAffiliateAccount,
  mockAffiliates,
  mockOperator,
  mockWallet,
  toListItem,
} from './fixtures';

/**
 * Dublê do canal `/v1/admin`, que ainda não existe na API — cards 3.6 e 4.x.
 *
 * É uma função que devolve `Response`, e **não** um interceptador de `fetch`
 * global. A diferença não é de estilo: o Next reaplica o próprio patch de cache
 * sobre o `globalThis.fetch` a cada recompilação em dev, e um interceptador
 * instalado no boot é descartado em silêncio no primeiro Fast Refresh — o
 * painel passa a receber ECONNREFUSED sem nada no log dizer por quê.
 *
 * A resposta volta pelo mesmo `request()` do `api-client`, então continuam
 * exercitados o cabeçalho montado, o 204 sem corpo e a tradução do corpo de erro
 * em `ApiError`. O que deixa de ser exercitado é só o trecho de rede.
 */
const PASSWORD = 'MudarAgora!2026';

/** Estado em memória: aprovar e reprovar precisam sumir da fila de análise. */
const affiliates = mockAffiliates.map((affiliate) => ({ ...affiliate }));

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

function notFound(path: string): Response {
  return fail(404, null, 'Afiliado não encontrado.', path);
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

  {
    method: 'POST',
    pattern: /^\/admin\/auth\/login$/,
    handle({ path, body }) {
      if (body.password !== PASSWORD) {
        return fail(401, AuthErrorCodeEnum.INVALID_CREDENTIALS, 'E-mail ou senha inválidos.', path);
      }

      return json({
        accessToken: 'mock.admin.token',
        user: { ...mockOperator, email: String(body.email ?? mockOperator.email) },
      });
    },
  },

  {
    method: 'GET',
    pattern: /^\/admin\/affiliates$/,
    handle({ query }) {
      const page = Number(query.get('page') ?? 1);
      const limit = Number(query.get('limit') ?? 10);
      const status = query.get('status');
      const search = query.get('search')?.trim().toLowerCase();
      const sortOrder = query.get('sortOrder') === 'asc' ? 1 : -1;
      const sortBy = query.get('sortBy') ?? 'createdAt';

      let rows = affiliates.filter((affiliate) => !status || affiliate.status === status);

      if (search) {
        rows = rows.filter(
          (affiliate) =>
            affiliate.name.toLowerCase().includes(search) ||
            affiliate.email.toLowerCase().includes(search) ||
            affiliate.cpf.includes(search.replace(/\D/g, '')),
        );
      }

      rows = [...rows].sort((left, right) => {
        const a = sortBy === 'name' ? left.name : left.createdAt;
        const b = sortBy === 'name' ? right.name : right.createdAt;

        return a.localeCompare(b) * sortOrder;
      });

      return json({
        data: rows.slice((page - 1) * limit, page * limit).map(toListItem),
        total: rows.length,
        page,
        limit,
      });
    },
  },

  {
    method: 'GET',
    pattern: /^\/admin\/affiliates\/(?<publicId>[^/]+)$/,
    handle({ path }, params) {
      const affiliate = affiliates.find((item) => item.publicId === params.publicId);

      if (!affiliate) return notFound(path);

      const { history: _history, ...detail } = affiliate;

      return json(detail);
    },
  },

  {
    method: 'GET',
    pattern: /^\/admin\/affiliates\/(?<publicId>[^/]+)\/history$/,
    handle({ path }, params) {
      const affiliate = affiliates.find((item) => item.publicId === params.publicId);

      return affiliate ? json(affiliate.history) : notFound(path);
    },
  },

  {
    method: 'POST',
    pattern: /^\/admin\/affiliates\/(?<publicId>[^/]+)\/approve$/,
    handle({ path }, params) {
      return decide(params.publicId, AffiliateStatusEnum.APPROVED, null, path);
    },
  },

  {
    method: 'POST',
    pattern: /^\/admin\/affiliates\/(?<publicId>[^/]+)\/reject$/,
    handle({ path, body }, params) {
      const reason = typeof body.reason === 'string' ? body.reason : null;

      return decide(params.publicId, AffiliateStatusEnum.REJECTED, reason, path);
    },
  },
];

function decide(
  publicId: string,
  toStatus: AffiliateStatusEnum,
  reason: string | null,
  path: string,
): Response {
  const affiliate = affiliates.find((item) => item.publicId === publicId);

  if (!affiliate) return notFound(path);

  // A decisão é irreversível e só cabe em cadastro ainda em análise — a mesma
  // regra que o use case vai aplicar, para a tela ser exercitada de verdade.
  if (affiliate.status !== AffiliateStatusEnum.PENDING_APPROVAL) {
    return fail(409, null, 'Este cadastro já foi decidido e não pode ser decidido de novo.', path);
  }

  affiliate.status = toStatus;
  affiliate.approvedAt = '2026-08-21T12:00:00.000Z';
  affiliate.approvedByName = mockOperator.name;
  affiliate.rejectionReason = reason;
  affiliate.history = [
    ...affiliate.history,
    {
      fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus,
      reason,
      actorName: mockOperator.name,
      createdAt: '2026-08-21T12:00:00.000Z',
    },
  ];

  return new Response(null, { status: 204 });
}

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
const DUBBED = ['/admin', '/affiliate/auth', '/affiliate/me'];

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
