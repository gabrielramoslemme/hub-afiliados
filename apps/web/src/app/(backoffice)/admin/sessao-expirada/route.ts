import { type NextRequest, NextResponse } from 'next/server';
import { LOGIN_PATH } from '@/backoffice/shared/routes';
import {
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

  // Mesmo par nome+caminho da escrita, e uma chamada por cookie, pelo motivo do
  // `destroySession`: o jar indexa por nome, e um segundo caminho sobrescreveria
  // o primeiro em vez de somar.
  response.cookies.delete({ name: SESSION_COOKIE, path: SESSION_COOKIE_PATH });
  response.cookies.delete({ name: SESSION_USER_COOKIE, path: SESSION_COOKIE_PATH });

  return response;
}
