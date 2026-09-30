import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '@porto/contracts';

export const ROLES = 'roles';

/**
 * Os perfis que alcançam a rota. Toda rota autenticada declara os seus: sem o
 * decorator, o guard do canal recusa qualquer perfil.
 */
export function Roles(...roles: UserRoleEnum[]): CustomDecorator {
  return SetMetadata(ROLES, roles);
}
