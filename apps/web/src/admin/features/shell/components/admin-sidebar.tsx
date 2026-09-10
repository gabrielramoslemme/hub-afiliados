'use client';

import { BarChart3, Megaphone, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import type { SessionUser } from '@/admin/features/auth/session';
import { CAMPAIGNS_PATH, DASHBOARD_PATH, QUEUE_PATH } from '@/admin/shared/routes';
import { PortoLogo } from '@/shared/components/porto-logo';
import { cn } from '@/shared/lib/cn';
import { roleLabel } from '../role-label';
import { UserMenu } from './user-menu';

interface NavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  /** O dashboard é a raiz do painel: sem isto ele fica aceso em toda tela. */
  exact?: boolean;
}

/**
 * As seções sem `href` não existem na Onda 1 e aparecem apagadas, com a etiqueta
 * "Em breve": mostram o roteiro sem prometer um clique que não acontece. Ganhar
 * tela é ganhar `href` — não há outro estado a inventar.
 */
const NAV: NavItem[] = [
  { label: 'Dashboard', icon: BarChart3, href: DASHBOARD_PATH, exact: true },
  { label: 'Afiliados', icon: Users, href: QUEUE_PATH },
  { label: 'Campanhas', icon: Megaphone, href: CAMPAIGNS_PATH },
  { label: 'Pagamentos', icon: Wallet },
];

/**
 * A faixa escura do painel. A regra de "uma faixa escura por documento, e ela é
 * o topo" governa a landing, onde a faixa é retórica; aqui ela é estrutura — a
 * navegação fica de pé o dia inteiro na frente da analista, e separar navegação
 * de conteúdo por valor de superfície é o que impede a tela virar uma chapa só.
 *
 * Some abaixo de `lg`: o logotipo do topo leva ao dashboard, que é a home do
 * painel e de onde se chega às demais seções.
 */
export function AdminSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="surface-brand sticky top-0 hidden h-svh w-60 shrink-0 flex-col lg:flex">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href={DASHBOARD_PATH} aria-label="Painel do programa Influenciadores">
          <PortoLogo tone="dark" />
        </Link>
      </div>

      <nav aria-label="Seções do painel" className="px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ label, icon: Icon, href, exact }) => {
            // O detalhe de um cadastro mora sob a fila: `startsWith` mantém a
            // seção acesa enquanto a analista navega dentro dela.
            const active = Boolean(href && (exact ? pathname === href : pathname.startsWith(href)));

            if (!href) {
              return (
                <li key={label}>
                  <span className="flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium text-blue-300/60">
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                    <span className="ml-auto rounded-pill bg-blue-800/60 px-2 py-0.5 text-[0.6875rem] font-semibold text-blue-200">
                      Em breve
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={label} className="relative">
                {/* O trilho do item ativo: 2px na borda da faixa, como no
                    desenho. Fica fora do link para não deslocar o rótulo. */}
                {active && (
                  <span
                    className="absolute inset-y-1.5 -left-3 w-0.5 rounded-pill bg-cyan-500"
                    aria-hidden
                  />
                )}
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-blue-200 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* `mt-auto` prende o bloco no rodapé: quem está logado e a saída ficam
          onde a mão já está, e não competem com a navegação pelo topo. */}
      <div className="mt-auto border-t border-white/10 p-3">
        <UserMenu
          name={user.name}
          email={user.email}
          roleLabel={roleLabel(user.role)}
          tone="dark"
        />
      </div>
    </aside>
  );
}
