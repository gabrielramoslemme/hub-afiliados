import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { AccountNav, AccountTopbar } from '@/affiliate/features/area';
import { readSessionUser } from '@/affiliate/features/auth/session';
import { AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * O `middleware` só enxerga que o cookie existe. Quem lê o conteúdo é este
 * layout — e cookie corrompido precisa virar login, não tela quebrada.
 */
export default async function AccountLayout({ children }: PropsWithChildren) {
  const user = await readSessionUser();

  if (!user) redirect(AFFILIATE_LOGIN_PATH);

  return (
    <div className="min-h-svh bg-ink-50">
      <AccountTopbar name={user.name} />

      {/* O `pb` alto no mobile é a altura da barra de abas fixa no rodapé. */}
      <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-8 lg:px-8 lg:pb-16">{children}</main>

      <AccountNav variant="bar" />
    </div>
  );
}
