import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthAudienceEnum } from '@porto/contracts';
import { AuthenticatedRequest } from '../authenticated-request';

/**
 * Irmão do `AdminGuard`, e a mesma razão de existir: o `AuthenticatedGuard` já
 * garantiu que o token é válido, e aqui se decide se ele é **deste** canal. Sem
 * isto, um token de operador leria a área do afiliado.
 */
@Injectable()
export class AffiliateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const claims = request.auth;

    if (!claims || claims.aud !== AuthAudienceEnum.AFFILIATE) {
      throw new ForbiddenException('Acesso restrito à área do afiliado.');
    }

    request.actor = { publicId: claims.sub, name: claims.name, role: claims.role };

    return true;
  }
}
