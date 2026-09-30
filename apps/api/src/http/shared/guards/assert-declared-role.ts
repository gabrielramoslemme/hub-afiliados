import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleEnum } from '@porto/contracts';
import { ROLES } from '../decorators/roles.decorator';

/**
 * A segunda pergunta dos guards de canal: o perfil do token está entre os que a
 * rota declara? Rota sem `@Roles(...)` fecha para todo perfil — esquecer o
 * decorator numa rota nova não pode abri-la para o canal inteiro.
 */
export function assertDeclaredRole(
  reflector: Reflector,
  context: ExecutionContext,
  role: UserRoleEnum | null,
): void {
  const roles = reflector.getAllAndOverride<UserRoleEnum[] | undefined>(ROLES, [
    context.getHandler(),
    context.getClass(),
  ]);

  if (!roles?.length || !role || !roles.includes(role)) {
    throw new ForbiddenException('Seu perfil não tem acesso a esta operação.');
  }
}
