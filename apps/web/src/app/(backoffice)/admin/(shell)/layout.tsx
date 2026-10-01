import type { PropsWithChildren } from 'react';
import { fetchOperator } from '@/backoffice/features/auth/data';
import { AdminSidebar, AdminTopbar } from '@/backoffice/features/shell';

/**
 * O middleware só vê que o cookie existe. Quem confere a sessão é este layout,
 * perguntando à API quem está logado — inclusive nas telas que ainda não leem
 * nada da API, como o dashboard. Sessão recusada vira login pela sessão
 * expirada, e não direto: o cookie continua no navegador, e o middleware
 * devolveria a pessoa do login para cá, em laço.
 */
export default async function AdminShellLayout({ children }: PropsWithChildren) {
  const user = await fetchOperator();

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
