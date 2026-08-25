import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '@porto/contracts';

export const ROLES = 'roles';

/** Rota sem o decorator aceita qualquer perfil do canal. */
export function Roles(...roles: UserRoleEnum[]): CustomDecorator {
  return SetMetadata(ROLES, roles);
}
