import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum } from '@porto/contracts';
import { AuthenticatedRequest } from '../authenticated-request';
import { assertDeclaredRole } from './assert-declared-role';

/**
 * Guard do canal: o `AuthenticatedGuard` já garantiu que o token é válido, e
 * aqui se decide se ele é **deste** canal. Esquecer a audiência é escalação de
 * privilégio — um token de afiliado abriria a fila de análise. Depois, se o
 * perfil está entre os que a rota declara em `@Roles(...)`.
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

    assertDeclaredRole(this.reflector, context, claims.role);

    request.actor = { publicId: claims.sub, name: claims.name, role: claims.role };

    return true;
  }
}
