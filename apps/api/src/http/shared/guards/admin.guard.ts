import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AuthenticatedRequest } from '../authenticated-request';
import { ROLES } from '../decorators/roles.decorator';

/**
 * Guard do canal: o `AuthenticatedGuard` já garantiu que o token é válido, e
 * aqui se decide se ele é **deste** canal. Esquecer a audiência é escalação de
 * privilégio — um token de afiliado abriria a fila de análise.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const claims = request.auth;

    if (!claims || claims.aud !== AuthAudienceEnum.ADMIN) {
      throw new ForbiddenException('Acesso restrito ao painel da Porto.');
    }

    const roles = this.reflector.getAllAndOverride<UserRoleEnum[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roles?.length && (!claims.role || !roles.includes(claims.role))) {
      throw new ForbiddenException('Seu perfil não tem acesso a esta operação.');
    }

    request.actor = { publicId: claims.sub, name: claims.name, role: claims.role };

    return true;
  }
}
