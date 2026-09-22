'use client';

import { House, type LucideIcon, Megaphone, UserRound, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { ACCOUNT_TABS, type AccountTabHref, activeTabHref } from '../lib/account-tabs';

const ICONS: Record<AccountTabHref, LucideIcon> = {
  '/minha-conta': House,
  '/minha-conta/carteira': Wallet,
  '/minha-conta/materiais': Megaphone,
  '/minha-conta/perfil': UserRound,
};

export function AccountNav({ variant }: { variant: 'bar' | 'inline' }) {
  const active = activeTabHref(usePathname());

  if (variant === 'inline') {
    return (
      <nav aria-label="Seções da sua conta" className="hidden gap-1 lg:flex">
        {ACCOUNT_TABS.map((tab) => {
          const isActive = active === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'rounded-md px-3.5 py-2 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-blue-50 font-semibold text-blue-700'
                  : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900',
              )}
            >
              {tab.label}
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
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ACCOUNT_TABS.map((tab) => {
          const isActive = active === tab.href;
          const Icon = ICONS[tab.href];

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
                    'absolute inset-x-5 top-0 h-0.5 rounded-pill bg-cyan-500 transition-transform duration-300',
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
