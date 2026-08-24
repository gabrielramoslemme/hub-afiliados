import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { readSessionUser } from '@/features/admin-auth/session';
import { AdminTopbar } from '@/features/admin-shell/admin-topbar';

/**
 * O middleware já barra quem não tem cookie. Esta segunda checagem existe porque
 * o middleware só vê que o cookie está lá — quem lê o conteúdo é aqui, e cookie
 * corrompido tem que virar login, não tela quebrada.
 */
export default async function AdminShellLayout({ children }: PropsWithChildren) {
  const user = await readSessionUser();

  if (!user) redirect('/admin/login');

  return (
    <div className="min-h-svh bg-ink-50">
      <AdminTopbar user={user} />
      <main className="mx-auto w-full max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
