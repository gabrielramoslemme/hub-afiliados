import { UserRoleEnum } from '@porto/contracts';

/**
 * O perfil aparece na trilha de auditoria; mostrá-lo junto do nome evita decidir
 * logado com a conta errada. Mora fora dos dois componentes porque a sidebar e a
 * barra do topo mostram o mesmo rótulo — e dois mapas divergem no primeiro
 * perfil novo.
 */
const ROLE_LABELS: Record<UserRoleEnum, string> = {
  [UserRoleEnum.PORTO_ANALYST]: 'Analista · Porto',
  [UserRoleEnum.PORTO_ADMIN]: 'Administrador · Porto',
  [UserRoleEnum.MESA_ADMIN]: 'Administrador · Mesa',
};

export function roleLabel(role: UserRoleEnum): string {
  return ROLE_LABELS[role];
}
