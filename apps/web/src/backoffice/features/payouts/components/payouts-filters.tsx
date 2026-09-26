import { Search } from 'lucide-react';
import { WithdrawalStatusEnum } from '@porto/contracts';
import { PAYOUTS_PATH } from '@/backoffice/shared/routes';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { WITHDRAWAL_STATUS_LABELS } from '@/shared/lib/withdrawal-status';
import type { PayoutsParams } from '../lib/payouts-params';

/**
 * `REQUESTED` e `PROCESSING` dizem a mesma coisa no badge — "em
 * processamento" —, mas aqui a analista está procurando um saque específico
 * na reconciliação, e é o filtro que distingue o que o fornecedor ainda não
 * confirmou do que ele já aceitou.
 */
const STATUS_FILTER_LABELS: Record<WithdrawalStatusEnum, string> = {
  ...WITHDRAWAL_STATUS_LABELS,
  [WithdrawalStatusEnum.REQUESTED]: 'Em processamento (sem resposta)',
};

interface PayoutsFiltersProps {
  params: PayoutsParams;
  total: number;
}

/**
 * Filtro sem uma linha de JavaScript: um `form` com `method="get"`. O estado
 * mora na URL, como na fila de afiliados — recarregar, voltar e compartilhar
 * o endereço funcionam de graça.
 */
export function PayoutsFilters({ params, total }: PayoutsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-ink-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
      <form action={PAYOUTS_PATH} method="get" className="flex flex-wrap items-center gap-2">
        <select
          name="status"
          defaultValue={params.status ?? ''}
          aria-label="Filtrar por status"
          className="h-9 rounded-md border border-input bg-background px-3 text-[0.8125rem] text-foreground transition-[border-color,box-shadow] duration-150 hover:border-ink-400 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-600/15"
        >
          <option value="">Todos os status</option>
          {Object.values(WithdrawalStatusEnum).map((status) => (
            <option key={status} value={status}>
              {STATUS_FILTER_LABELS[status]}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            type="search"
            name="search"
            defaultValue={params.search}
            aria-label="Buscar por nome ou CPF"
            placeholder="Nome ou CPF"
            className="h-9 w-full pl-9 lg:w-56"
          />
        </div>

        <Input
          type="date"
          name="from"
          defaultValue={params.from ?? ''}
          aria-label="De"
          className="h-9 w-36 text-[0.8125rem]"
        />
        <Input
          type="date"
          name="until"
          defaultValue={params.until ?? ''}
          aria-label="Até"
          className="h-9 w-36 text-[0.8125rem]"
        />

        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>

      {/* O total do recorte responde a pergunta que a analista faz antes de
          começar: quanto ainda tem para hoje. */}
      <span className="hidden whitespace-nowrap text-[0.8125rem] text-ink-500 sm:inline">
        <strong className="font-semibold text-ink-900" data-tabular>
          {total}
        </strong>{' '}
        {total === 1 ? 'saque' : 'saques'}
      </span>
    </div>
  );
}
