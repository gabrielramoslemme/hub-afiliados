import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { readSessionUser } from '@/backoffice/features/auth/session';
import { AdminSidebar, AdminTopbar } from '@/backoffice/features/shell';
import { SESSION_EXPIRED_PATH } from '@/backoffice/shared/routes';

/**
 * O middleware já barra quem não tem cookie. Esta segunda checagem existe porque
 * o middleware só vê que o cookie está lá — quem lê o conteúdo é aqui, e cookie
 * corrompido tem que virar login, não tela quebrada.
 *
 * Pela sessão expirada, e não direto para o login: o cookie do token continua no
 * navegador, e o middleware devolveria a pessoa do login para cá, em laço.
 */
export default async function AdminShellLayout({ children }: PropsWithChildren) {
  const user = await readSessionUser();

  if (!user) redirect(SESSION_EXPIRED_PATH);

  return (
    <div className="flex min-h-svh bg-ink-50">
      <AdminSidebar user={user} />

      {/* `min-w-0` na coluna: sem ele a tabela larga estica o flex e a página
          inteira ganha rolagem horizontal, em vez de a tabela rolar sozinha. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={user} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
