import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import Link from 'next/link';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatDate, formatTime } from '@/shared/lib/format';
import { fetchAffiliates } from '../data';
import { type QueueParams, type QueueSortBy, queueHref } from '../lib/queue-params';
import { AffiliateStatusBadge } from './affiliate-status';
import { QueueFilters } from './queue-filters';
import { QueuePagination } from './queue-pagination';
import { RowActions } from './row-actions';

function SortableHead({
  params,
  column,
  children,
}: {
  params: QueueParams;
  column: QueueSortBy;
  children: string;
}) {
  const active = params.sortBy === column;
  // Clicar na coluna ativa inverte; clicar em outra começa decrescente, que é a
  // ordem em que a fila é lida — mais recente primeiro.
  const nextOrder = active && params.sortOrder === 'desc' ? 'asc' : 'desc';
  const Icon = active ? (params.sortOrder === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <TableHead
      aria-sort={active ? (params.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Link
        href={queueHref(params, { sortBy: column, sortOrder: nextOrder })}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-900"
      >
        {children}
        <Icon className={active ? 'size-3.5 text-blue-600' : 'size-3.5 text-ink-300'} aria-hidden />
      </Link>
    </TableHead>
  );
}

/** Inicial em disco: dá âncora visual à linha sem inventar foto que não existe. */
function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[0.8125rem] font-bold text-blue-700"
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export async function AffiliatesQueue({ params }: { params: QueueParams }) {
  const { data, total } = await fetchAffiliates(params);

  return (
    <div className="overflow-hidden rounded-panel border border-ink-200 bg-white shadow-card">
      <QueueFilters params={params} total={total} />

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-ink-100">
            <Inbox className="size-6 text-ink-400" aria-hidden />
          </span>
          <p className="font-semibold text-ink-900">Nenhum cadastro neste recorte</p>
          <p className="max-w-sm text-sm text-ink-500">
            {params.search
              ? `Nada encontrado para “${params.search}”. Revise o termo ou limpe a busca.`
              : 'Assim que um cadastro chegar por este filtro, ele aparece aqui.'}
          </p>
          {(params.search || params.status) && (
            <Link href={QUEUE_PATH} className="mt-2 text-sm font-semibold text-blue-600">
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-ink-50/60 hover:bg-ink-50/60">
                <SortableHead params={params} column="name">
                  Afiliado
                </SortableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Situação</TableHead>
                <SortableHead params={params} column="createdAt">
                  Enviado em
                </SortableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((affiliate) => (
                <TableRow key={affiliate.publicId}>
                  <TableCell className="py-3">
                    <Link
                      href={`${QUEUE_PATH}/${affiliate.publicId}`}
                      className="flex items-center gap-3 font-medium text-ink-900 transition-colors hover:text-blue-600"
                    >
                      <Avatar name={affiliate.name} />
                      {affiliate.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-ink-500">{affiliate.email}</TableCell>
                  {/* Listagem mostra CPF mascarado; completo só no detalhe. */}
                  <TableCell className="whitespace-nowrap text-ink-500" data-tabular>
                    {affiliate.maskedCpf}
                  </TableCell>
                  <TableCell>
                    <AffiliateStatusBadge status={affiliate.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-tabular>
                    <span className="block text-ink-700">{formatDate(affiliate.createdAt)}</span>
                    <span className="block text-[0.8125rem] text-ink-400">
                      {formatTime(affiliate.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      publicId={affiliate.publicId}
                      name={affiliate.name}
                      status={affiliate.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <QueuePagination params={params} total={total} />
        </>
      )}
    </div>
  );
}
