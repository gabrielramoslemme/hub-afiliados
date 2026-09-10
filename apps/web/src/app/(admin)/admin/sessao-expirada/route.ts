import { type NextRequest, NextResponse } from 'next/server';
import { LOGIN_PATH } from '@/admin/shared/routes';
import {
  LEGACY_SESSION_COOKIE_PATH,
  SESSION_COOKIE,
  SESSION_COOKIE_PATH,
  SESSION_USER_COOKIE,
} from '@/shared/lib/session-cookie';

/**
 * O único lugar que pode apagar o cookie no meio de uma navegação: Server
 * Component não escreve cookie, e Server Action não é acionada por link. Sem
 * isto, a leitura que recebe 401 mandaria para o login com o cookie vencido
 * ainda no navegador, e o `middleware` — que só enxerga que o cookie existe —
 * devolveria a pessoa para a fila, em laço.
 */
export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));

  // Mesmo par nome+caminho da escrita, pelo motivo do `destroySession` — e o
  // caminho antigo junto, que é o que tira do laço quem virou com sessão aberta.
  response.cookies.delete({ name: SESSION_COOKIE, path: SESSION_COOKIE_PATH });
  response.cookies.delete({ name: SESSION_USER_COOKIE, path: SESSION_COOKIE_PATH });

  response.cookies.delete({ name: SESSION_COOKIE, path: LEGACY_SESSION_COOKIE_PATH });
  response.cookies.delete({ name: SESSION_USER_COOKIE, path: LEGACY_SESSION_COOKIE_PATH });

  return response;
}
