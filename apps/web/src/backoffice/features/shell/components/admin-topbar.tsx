import Link from 'next/link';
import type { SessionUser } from '@/backoffice/features/auth/session';
import { DASHBOARD_PATH } from '@/backoffice/shared/routes';
import { PortoLogo } from '@/shared/components/porto-logo';
import { roleLabel } from '../lib/role-label';
import { UserMenu } from './user-menu';

/**
 * Só abaixo de `lg`, onde a faixa escura não cabe. No desktop a sidebar carrega
 * marca, navegação e conta — uma barra no topo sem nenhum dos três seria um
 * traço horizontal ocupando 64px de altura.
 */
export function AdminTopbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur lg:hidden">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <Link href={DASHBOARD_PATH} aria-label="Painel do programa Influenciadores">
          <PortoLogo />
        </Link>

        <div className="w-52">
          <UserMenu name={user.name} email={user.email} roleLabel={roleLabel(user.role)} />
        </div>
      </div>
    </header>
  );
}
