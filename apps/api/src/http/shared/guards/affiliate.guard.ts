import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum } from '@porto/contracts';
import { AuthenticatedRequest } from '../authenticated-request';
import { assertDeclaredRole } from './assert-declared-role';

/**
 * Irmão do `AdminGuard`, e a mesma razão de existir: o `AuthenticatedGuard` já
 * garantiu que o token é válido, e aqui se decide se ele é **deste** canal. Sem
 * isto, um token de operador leria a área do afiliado. Depois, o perfil contra
 * o `@Roles(...)` da rota, como no painel.
 */
@Injectable()
export class AffiliateGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const claims = request.auth;

    if (!claims || claims.aud !== AuthAudienceEnum.AFFILIATE) {
      throw new ForbiddenException('Acesso restrito à área do afiliado.');
    }

    assertDeclaredRole(this.reflector, context, claims.role);

    request.actor = { publicId: claims.sub, name: claims.name, role: claims.role };

    return true;
  }
}
