import { type NextRequest, NextResponse } from 'next/server';
import { AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';
import {
  AFFILIATE_SESSION_COOKIE,
  AFFILIATE_SESSION_USER_COOKIE,
} from '@/shared/lib/session-cookie';

/** O par do `/admin/sessao-expirada`, com o cookie e o login do afiliado. */
export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(AFFILIATE_LOGIN_PATH, request.url));

  response.cookies.delete(AFFILIATE_SESSION_COOKIE);
  response.cookies.delete(AFFILIATE_SESSION_USER_COOKIE);

  return response;
}
