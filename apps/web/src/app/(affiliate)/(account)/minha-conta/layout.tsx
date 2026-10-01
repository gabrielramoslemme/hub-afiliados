import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';
import { AccountNav, AccountTopbar } from '@/affiliate/features/area';
import { fetchAccount } from '@/affiliate/features/area/data';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * O `middleware` só enxerga que o cookie existe. Quem confere a sessão é este
 * layout, lendo a conta na API — sessão recusada vira login pela sessão
 * expirada, que apaga o cookie antes de redirecionar.
 */
export default async function AccountLayout({ children }: PropsWithChildren) {
  const user = await fetchAccount();

  return (
    <div className="min-h-svh bg-ink-50">
      <AccountTopbar name={user.name} />

      {/* O `pb` alto no mobile é a altura da barra de abas fixa no rodapé. */}
      <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-8 lg:px-8 lg:pb-16">{children}</main>

      <AccountNav variant="bar" />
    </div>
  );
}
