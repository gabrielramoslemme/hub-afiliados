import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { CAMPAIGNS_PATH } from '@/admin/shared/routes';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/cn';
import { type CampaignParams, campaignsHref } from '../campaign-params';
import type { CampaignStatus } from '../mock-data';
import { CategoryFilter } from './category-filter';

const TABS: Array<{ label: string; status: CampaignStatus | null }> = [
  { label: 'Ativas', status: 'active' },
  { label: 'Agendadas', status: 'scheduled' },
  { label: 'Encerradas', status: 'ended' },
  { label: 'Canceladas', status: 'canceled' },
  { label: 'Todas', status: null },
];

/**
 * Recorte sem uma linha de JavaScript: as abas são links e a busca é um `form`
 * com `method="get"`. O estado mora na URL, então recarregar, voltar e
 * compartilhar o endereço funcionam de graça.
 *
 * Criar campanha depende de rota que a Onda 1 não tem. O botão fica no lugar do
 * desenho, desabilitado e dito — prometer o clique é pior que adiá-lo.
 */
export function CampaignFilters({ params, total }: { params: CampaignParams; total: number }) {
  return (
    <div className="flex flex-col gap-4 border-b border-ink-200 px-4 py-4 xl:flex-row xl:items-center xl:justify-between xl:px-5">
      <nav aria-label="Filtrar por situação">
        <ul className="flex flex-wrap items-center gap-1 rounded-pill bg-ink-100 p-1">
          {TABS.map((tab) => {
            const active = params.status === tab.status;

            return (
              <li key={tab.label}>
                <Link
                  href={campaignsHref(params, { status: tab.status })}
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden whitespace-nowrap pr-1 text-[0.8125rem] text-ink-500 sm:inline">
          <strong className="font-semibold text-ink-900" data-tabular>
            {total}
          </strong>{' '}
          {total === 1 ? 'campanha' : 'campanhas'}
        </span>

        <form action={CAMPAIGNS_PATH} method="get" className="flex items-center">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.sortBy !== 'startsAt' && (
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
              aria-label="Buscar por nome, descrição ou categoria"
              placeholder="Buscar campanha"
              className="h-9 w-full pl-9 xl:w-60"
            />
          </div>

          {/* Enter já envia, mas teclado e leitor de tela precisam do controle. */}
          <button type="submit" className="sr-only">
            Buscar
          </button>
        </form>

        <CategoryFilter params={params} />

        <Button size="sm" disabled>
          <Plus aria-hidden />
          Nova campanha
          <span className="rounded-pill bg-white/20 px-2 py-0.5 text-[0.6875rem] font-semibold">
            Em breve
          </span>
        </Button>
      </div>
    </div>
  );
}
