'use client';

import { Ticket, UserRound, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AFFILIATE_AREA_PATH } from '@/core/affiliate-routes';
import { cn } from '@/core/cn';

const TABS = [
  { href: AFFILIATE_AREA_PATH, label: 'Carteira', icon: Wallet },
  { href: `${AFFILIATE_AREA_PATH}/cupom`, label: 'Cupom', icon: Ticket },
  { href: `${AFFILIATE_AREA_PATH}/perfil`, label: 'Perfil', icon: UserRound },
];

/**
 * A carteira é a raiz da área, então `startsWith` a marcaria como ativa em toda
 * subpágina. Só ela compara por igualdade; as outras aceitam o que vier abaixo.
 */
function useActiveHref(): string {
  const pathname = usePathname();

  return TABS.slice(1).find((tab) => pathname.startsWith(tab.href))?.href ?? AFFILIATE_AREA_PATH;
}

export function AccountNav({ variant }: { variant: 'bar' | 'inline' }) {
  const active = useActiveHref();

  if (variant === 'inline') {
    return (
      <nav aria-label="Seções da sua conta" className="hidden gap-1 lg:flex">
        {TABS.map((tab) => {
          const isActive = active === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'text-blue-700' : 'text-ink-500 hover:text-blue-600',
              )}
            >
              {tab.label}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-pill bg-cyan-500',
                  'transition-transform duration-300',
                  isActive ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Seções da sua conta"
      /* `pb-safe` não existe: a faixa do iPhone entra pelo padding do ambiente. */
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((tab) => {
          const isActive = active === tab.href;
          const Icon = tab.icon;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-semibold',
                  'transition-colors duration-150',
                  isActive ? 'text-blue-700' : 'text-ink-400 active:text-blue-600',
                )}
              >
                {/* A régua entra de cima e o ícone sobe: o toque tem resposta. */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-6 top-0 h-0.5 rounded-pill bg-cyan-500 transition-transform duration-300',
                    isActive ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
                <Icon
                  className={cn(
                    'size-5 transition-transform duration-200',
                    isActive && '-translate-y-0.5',
                  )}
                  aria-hidden
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
