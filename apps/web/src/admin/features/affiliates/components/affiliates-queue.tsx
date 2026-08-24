import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import Link from 'next/link';
import { QUEUE_PATH } from '@/admin/shared/routes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatDateTime } from '@/shared/lib/format';
import { fetchAffiliates } from '../data';
import { type QueueParams, type QueueSortBy, queueHref } from '../queue-params';
import { AffiliateStatusBadge } from './affiliate-status';
import { QueueFilters } from './queue-filters';
import { QueuePagination } from './queue-pagination';

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
        <Icon className="size-3.5" aria-hidden />
      </Link>
    </TableHead>
  );
}

export async function AffiliatesQueue({ params }: { params: QueueParams }) {
  const { data, total } = await fetchAffiliates(params);

  return (
    <div className="flex flex-col gap-6">
      <QueueFilters params={params} />

      <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <Inbox className="size-8 text-ink-300" aria-hidden />
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
                <TableRow>
                  <SortableHead params={params} column="name">
                    Afiliado
                  </SortableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Situação</TableHead>
                  <SortableHead params={params} column="createdAt">
                    Enviado em
                  </SortableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((affiliate) => (
                  <TableRow key={affiliate.publicId}>
                    <TableCell className="py-3">
                      <span className="block font-medium text-ink-900">{affiliate.name}</span>
                      <span className="block text-[0.8125rem] text-ink-500">{affiliate.email}</span>
                    </TableCell>
                    {/* Listagem mostra CPF mascarado; completo só no detalhe. */}
                    <TableCell className="whitespace-nowrap text-ink-500">
                      {affiliate.maskedCpf}
                    </TableCell>
                    <TableCell>
                      <AffiliateStatusBadge status={affiliate.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink-500">
                      {formatDateTime(affiliate.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`${QUEUE_PATH}/${affiliate.publicId}`}
                        className="group inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Analisar
                        <span className="sr-only"> o cadastro de {affiliate.name}</span>
                        <ArrowRight
                          className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <QueuePagination params={params} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
