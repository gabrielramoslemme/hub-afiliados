import { Search } from 'lucide-react';
import Link from 'next/link';
import { AffiliateStatusEnum } from '@porto/contracts';
import { Input } from '@/components/ui/input';
import { QUEUE_PATH } from '@/core/admin-routes';
import { cn } from '@/core/cn';
import { type QueueParams, queueHref } from './queue-params';

const TABS: Array<{ label: string; status: AffiliateStatusEnum | null }> = [
  { label: 'Em análise', status: AffiliateStatusEnum.PENDING_APPROVAL },
  { label: 'Aprovados', status: AffiliateStatusEnum.APPROVED },
  { label: 'Reprovados', status: AffiliateStatusEnum.REJECTED },
  { label: 'Suspensos', status: AffiliateStatusEnum.SUSPENDED },
  { label: 'Todos', status: null },
];

/**
 * Filtro sem uma linha de JavaScript: as abas são links e a busca é um `form`
 * com `method="get"`. O estado mora na URL, então recarregar, voltar e
 * compartilhar o endereço funcionam de graça — e a fila continua utilizável
 * mesmo se o bundle não carregar.
 */
export function QueueFilters({ params }: { params: QueueParams }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label="Filtrar por situação">
        <ul className="flex flex-wrap items-center gap-1">
          {TABS.map((tab) => {
            const active = params.status === tab.status;

            return (
              <li key={tab.label}>
                <Link
                  href={queueHref(params, { status: tab.status })}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors',
                    active ? 'bg-blue-50 text-blue-700' : 'text-ink-500 hover:bg-ink-100',
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form action={QUEUE_PATH} method="get" className="flex items-center gap-2">
        {params.status && <input type="hidden" name="status" value={params.status} />}
        {params.sortBy !== 'createdAt' && (
          <input type="hidden" name="sortBy" value={params.sortBy} />
        )}
        {params.sortOrder !== 'desc' && (
          <input type="hidden" name="sortOrder" value={params.sortOrder} />
        )}

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            type="search"
            name="search"
            defaultValue={params.search}
            aria-label="Buscar por nome, e-mail ou CPF"
            placeholder="Buscar por nome, e-mail ou CPF"
            className="h-9 w-full pl-9 lg:w-80"
          />
        </div>

        {/* Enter já envia, mas teclado e leitor de tela precisam do controle. */}
        <button type="submit" className="sr-only">
          Buscar
        </button>
      </form>
    </div>
  );
}
