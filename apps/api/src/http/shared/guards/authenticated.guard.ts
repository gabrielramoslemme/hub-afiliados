import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_TOKEN_VERIFIER, AccessTokenVerifier } from '@Domain/auth/access-token';
import { AuthenticatedRequest } from '../authenticated-request';
import { IS_PUBLIC } from '../decorators/public.decorator';

const BEARER = 'Bearer ';

function bearerOf(header?: string): string {
  return header?.startsWith(BEARER) ? header.slice(BEARER.length) : '';
}

/**
 * Guard global: sem `@Public()` explícito, requisição sem token válido é 401.
 * A pergunta que ele responde — "este token é válido" — vale para a API
 * inteira; qual canal o token abre é do guard do canal, que lê o `auth` daqui
 * em vez de verificar a assinatura de novo.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly accessTokenVerifier: AccessTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const claims = await this.accessTokenVerifier.verify(bearerOf(request.headers.authorization));

    if (!claims) throw new UnauthorizedException('Sessão expirada. Entre novamente.');

    request.auth = claims;

    return true;
  }
}
