import Link from 'next/link';
import { UserRoleEnum } from '@porto/contracts';
import { QUEUE_PATH } from '@/core/admin-routes';
import type { SessionUser } from '@/features/admin-auth/session';
import { PortoLogo } from '@/features/landing/porto-logo';
import { UserMenu } from './user-menu';

/** O perfil aparece na trilha; mostrar na barra evita decidir com o login errado. */
const ROLE_LABELS: Record<UserRoleEnum, string> = {
  [UserRoleEnum.PORTO_ANALYST]: 'Analista · Porto',
  [UserRoleEnum.PORTO_ADMIN]: 'Administrador · Porto',
  [UserRoleEnum.MESA_ADMIN]: 'Administrador · Mesa',
};

export function AdminTopbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link href={QUEUE_PATH} aria-label="Painel do Hub de Afiliados">
            <PortoLogo />
          </Link>

          <nav>
            <Link
              href={QUEUE_PATH}
              className="text-sm font-medium text-ink-700 transition-colors hover:text-blue-600"
            >
              Afiliados
            </Link>
          </nav>
        </div>

        <UserMenu name={user.name} email={user.email} roleLabel={ROLE_LABELS[user.role]} />
      </div>
    </header>
  );
}
