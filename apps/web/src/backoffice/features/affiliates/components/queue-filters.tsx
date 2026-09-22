import { Search } from 'lucide-react';
import Link from 'next/link';
import { AffiliateStatusEnum } from '@porto/contracts';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/cn';
import { type QueueParams, queueHref } from '../lib/queue-params';

const TABS: Array<{ label: string; status: AffiliateStatusEnum | null }> = [
  { label: 'Em análise', status: AffiliateStatusEnum.PENDING_APPROVAL },
  { label: 'Aprovados', status: AffiliateStatusEnum.APPROVED },
  { label: 'Reprovados', status: AffiliateStatusEnum.REJECTED },
  { label: 'Todos', status: null },
];

interface QueueFiltersProps {
  params: QueueParams;
  total: number;
}

/**
 * Filtro sem uma linha de JavaScript: as abas são links e a busca é um `form`
 * com `method="get"`. O estado mora na URL, então recarregar, voltar e
 * compartilhar o endereço funcionam de graça — e a fila continua utilizável
 * mesmo se o bundle não carregar.
 *
 * As abas ficam no lugar do dropdown "Filtros" do desenho de referência: para
 * quatro recortes, a aba é um clique e o dropdown são três, e o recorte atual
 * fica legível sem abrir nada.
 */
export function QueueFilters({ params, total }: QueueFiltersProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-ink-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
      <nav aria-label="Filtrar por situação">
        <ul className="flex flex-wrap items-center gap-1 rounded-pill bg-ink-100 p-1">
          {TABS.map((tab) => {
            const active = params.status === tab.status;

            return (
              <li key={tab.label}>
                <Link
                  href={queueHref(params, { status: tab.status })}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-8 items-center rounded-pill px-3.5 text-[0.8125rem] font-semibold transition-colors',
                    active
                      ? 'bg-white text-blue-700 shadow-card'
                      : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3">
        {/* O total do recorte responde a pergunta que a analista faz antes de
            começar: quanto ainda tem para hoje. */}
        <span className="hidden whitespace-nowrap text-[0.8125rem] text-ink-500 sm:inline">
          <strong className="font-semibold text-ink-900" data-tabular>
            {total}
          </strong>{' '}
          {total === 1 ? 'cadastro' : 'cadastros'}
        </span>

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
              className="h-9 w-full pl-9 lg:w-72"
            />
          </div>

          {/* Enter já envia, mas teclado e leitor de tela precisam do controle. */}
          <button type="submit" className="sr-only">
            Buscar
          </button>
        </form>
      </div>
    </div>
  );
}
