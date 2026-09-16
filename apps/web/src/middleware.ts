import { type NextRequest, NextResponse } from 'next/server';
import {
  DASHBOARD_PATH,
  isPanelIconPath,
  isPanelPasswordPath,
  LOGIN_PATH,
  REDIRECT_PARAM,
} from '@/admin/shared/routes';
import { AFFILIATE_AREA_PATH, AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';
import { AFFILIATE_SESSION_COOKIE, SESSION_COOKIE } from '@/shared/lib/session-cookie';

function redirectTo(request: NextRequest, pathname: string, keepTarget = false): NextResponse {
  const url = request.nextUrl.clone();
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  url.pathname = pathname;
  url.search = '';

  // Sem isto, abrir o link de um cadastro específico custa a sessão e o link:
  // a pessoa entra e é largada na fila, procurando de novo o que já tinha.
  if (keepTarget) url.searchParams.set(REDIRECT_PARAM, target);

  return NextResponse.redirect(url);
}

/** Nenhuma das duas áreas é indexável — as duas dividem domínio com a landing. */
function allow(): NextResponse {
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return response;
}

/**
 * Negação por omissão nas duas áreas logadas, e **um cookie para cada uma**: o
 * middleware só enxerga que o cookie existe, então compartilhar o nome faria
 * uma sessão de afiliado valer como sessão de operador. É o análogo, no front,
 * da regra da API — rota que nasce protegida não vira aberta por esquecimento.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // A exceção de um arquivo: o ícone da aba do painel mora dentro do segmento
  // que este middleware guarda. Ver `isPanelIconPath`.
  if (isPanelIconPath(pathname)) return allow();

  // E a de duas telas: recuperar senha acontece antes de haver sessão — e
  // também depois, quando quem clica no link do e-mail ainda está logado. As
  // duas passam sem redirecionamento nenhum. Ver `isPanelPasswordPath`.
  if (isPanelPasswordPath(pathname)) return allow();

  if (pathname === AFFILIATE_LOGIN_PATH || pathname.startsWith(`${AFFILIATE_AREA_PATH}`)) {
    const hasSession = Boolean(request.cookies.get(AFFILIATE_SESSION_COOKIE)?.value);
    const isLogin = pathname === AFFILIATE_LOGIN_PATH;

    if (!hasSession && !isLogin) return redirectTo(request, AFFILIATE_LOGIN_PATH);
    if (hasSession && isLogin) return redirectTo(request, AFFILIATE_AREA_PATH);

    return allow();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = pathname === LOGIN_PATH;

  if (!hasSession && !isLogin) return redirectTo(request, LOGIN_PATH, true);
  if (hasSession && isLogin) return redirectTo(request, DASHBOARD_PATH);

  return allow();
}

export const config = { matcher: ['/admin/:path*', '/minha-conta/:path*', '/entrar'] };
