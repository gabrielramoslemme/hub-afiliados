import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { PAYOUTS_PATH } from '@/backoffice/shared/routes';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { fetchWithdrawals } from '../data';
import { PAYOUTS_PAGE_SIZE, type PayoutsParams, payoutsHref } from '../lib/payouts-params';
import { PayoutsFilters } from './payouts-filters';
import { WithdrawalStatusBadge } from './withdrawal-status-badge';

/**
 * Copiada da fila de afiliados em vez de generalizada: as duas paginações são
 * pequenas, e um componente genérico pagaria com uma prop a mais por diferença
 * entre elas — pior que repetir uma vez.
 */
function PayoutsPagination({ params, total }: { params: PayoutsParams; total: number }) {
  const lastPage = Math.max(1, Math.ceil(total / PAYOUTS_PAGE_SIZE));
  const from = total === 0 ? 0 : (params.page - 1) * PAYOUTS_PAGE_SIZE + 1;
  const to = Math.min(params.page * PAYOUTS_PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3">
      <p className="text-sm text-ink-500" data-tabular>
        {from}–{to} de {total}
      </p>

      <div className="flex items-center gap-2">
        {params.page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={payoutsHref(params, { page: params.page - 1 })}>
              <ChevronLeft aria-hidden />
              Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden />
            Anterior
          </Button>
        )}

        <span className="px-1 text-sm text-ink-500" data-tabular>
          {params.page} de {lastPage}
        </span>

        {params.page < lastPage ? (
          <Button asChild variant="outline" size="sm">
            <Link href={payoutsHref(params, { page: params.page + 1 })}>
              Próxima
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
            <ChevronRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

export async function PayoutsTable({ params }: { params: PayoutsParams }) {
  const { data, total } = await fetchWithdrawals(params);

  return (
    <div className="overflow-hidden rounded-panel border border-ink-200 bg-white shadow-card">
      <PayoutsFilters params={params} total={total} />

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-ink-100">
            <Inbox className="size-6 text-ink-400" aria-hidden />
          </span>
          <p className="font-semibold text-ink-900">Nenhum saque encontrado com estes filtros.</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-ink-50/60 hover:bg-ink-50/60">
                <TableHead>Afiliado</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pedido em</TableHead>
                <TableHead>Pago em</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((withdrawal) => (
                <TableRow key={withdrawal.publicId}>
                  <TableCell className="py-3">
                    <Link
                      href={`${PAYOUTS_PATH}/${withdrawal.publicId}`}
                      className="block font-medium text-ink-900 transition-colors hover:text-blue-600"
                    >
                      {withdrawal.affiliateName}
                      <span
                        className="block text-[0.8125rem] font-normal text-ink-400"
                        data-tabular
                      >
                        {withdrawal.maskedCpf}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink-700" data-tabular>
                    {formatBRL(withdrawal.amountCents)}
                  </TableCell>
                  <TableCell>
                    <WithdrawalStatusBadge status={withdrawal.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink-500" data-tabular>
                    {formatDateTime(withdrawal.requestedAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink-500" data-tabular>
                    {withdrawal.paidAt ? formatDateTime(withdrawal.paidAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <PayoutsPagination params={params} total={total} />
        </>
      )}
    </div>
  );
}
