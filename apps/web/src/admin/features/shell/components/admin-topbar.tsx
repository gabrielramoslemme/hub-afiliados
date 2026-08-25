import Link from 'next/link';
import { UserRoleEnum } from '@porto/contracts';
import type { SessionUser } from '@/admin/features/auth/session';
import { QUEUE_PATH } from '@/admin/shared/routes';
import { PortoLogo } from '@/shared/components/porto-logo';
import { UserMenu } from './user-menu';

/** O perfil aparece na trilha; mostrar na barra evita decidir com o login errado. */
const ROLE_LABELS: Record<UserRoleEnum, string> = {
  [UserRoleEnum.PORTO_ANALYST]: 'Analista · Porto',
  [UserRoleEnum.PORTO_ADMIN]: 'Administrador · Porto',
  [UserRoleEnum.MESA_ADMIN]: 'Administrador · Mesa',
};

/**
 * A barra não repete a navegação: quem navega é a `AdminSidebar`. Aqui ficam a
 * identidade de quem está logado e a saída — e, abaixo de `lg`, onde a faixa
 * escura some, a assinatura da marca que devolve para a fila.
 */
export function AdminTopbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-6 px-6 lg:px-8">
        <Link href={QUEUE_PATH} aria-label="Painel do Hub de Afiliados" className="lg:hidden">
          <PortoLogo />
        </Link>

        <span className="hidden text-sm font-medium text-ink-500 lg:inline">Painel de análise</span>

        <UserMenu name={user.name} email={user.email} roleLabel={ROLE_LABELS[user.role]} />
      </div>
    </header>
  );
}
