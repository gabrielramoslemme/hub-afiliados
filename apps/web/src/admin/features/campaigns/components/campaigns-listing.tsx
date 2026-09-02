import { ArrowDown, ArrowUp, ArrowUpDown, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { CAMPAIGNS_PATH } from '@/admin/shared/routes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatCampaignPeriod } from '../campaign-display';
import {
  type CampaignParams,
  type CampaignSortBy,
  type CampaignSortOrder,
  campaignsHref,
} from '../campaign-params';
import { listCampaigns } from '../list-campaigns';
import { CampaignFilters } from './campaign-filters';
import { CampaignStatusBadge } from './campaign-status';
import { CampaignsPagination } from './campaigns-pagination';
import { RowActions } from './row-actions';

/**
 * A ordem natural de cada coluna. Data começa pela mais recente, porque é assim
 * que a listagem é lida; nome e categoria começam de A a Z; situação começa pelo
 * que está no ar. Sem isto, toda coluna nova abriria decrescente e o alfabeto
 * apareceria de trás para frente no primeiro clique.
 */
const NATURAL_ORDER: Record<CampaignSortBy, CampaignSortOrder> = {
  startsAt: 'desc',
  name: 'asc',
  category: 'asc',
  status: 'asc',
};

function SortableHead({
  params,
  column,
  children,
  className,
}: {
  params: CampaignParams;
  column: CampaignSortBy;
  children: string;
  className?: string;
}) {
  const active = params.sortBy === column;
  // Clicar na coluna ativa inverte; clicar em outra abre na ordem natural dela.
  const nextOrder: CampaignSortOrder = active
    ? params.sortOrder === 'asc'
      ? 'desc'
      : 'asc'
    : NATURAL_ORDER[column];
  const Icon = active ? (params.sortOrder === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <TableHead
      className={className}
      aria-sort={active ? (params.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Link
        href={campaignsHref(params, { sortBy: column, sortOrder: nextOrder })}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-900"
      >
        {children}
        <Icon className={active ? 'size-3.5 text-blue-600' : 'size-3.5 text-ink-300'} aria-hidden />
      </Link>
    </TableHead>
  );
}

/**
 * A listagem inteira: recorte, tabela e paginação no mesmo painel branco. Lê de
 * `listCampaigns`, que hoje corta o mock em memória e amanhã vira a chamada da
 * API — o formato `{ data, total }` é o mesmo dos dois lados.
 */
export function CampaignsListing({ params }: { params: CampaignParams }) {
  const { data, total } = listCampaigns(params);

  return (
    <div className="overflow-hidden rounded-panel border border-ink-200 bg-white shadow-card">
      <CampaignFilters params={params} total={total} />

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-ink-100">
            <Megaphone className="size-6 text-ink-400" aria-hidden />
          </span>
          <p className="font-semibold text-ink-900">Nenhuma campanha neste recorte</p>
          <p className="max-w-sm text-sm text-ink-500">
            {params.search
              ? `Nada encontrado para “${params.search}”. Revise o termo ou limpe a busca.`
              : 'Assim que uma campanha entrar neste recorte, ela aparece aqui.'}
          </p>
          {(params.search || params.status || params.category) && (
            <Link href={CAMPAIGNS_PATH} className="mt-2 text-sm font-semibold text-blue-600">
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-ink-50/60 hover:bg-ink-50/60">
                <SortableHead params={params} column="startsAt">
                  Período
                </SortableHead>
                <SortableHead params={params} column="name">
                  Nome
                </SortableHead>
                <TableHead>Descrição</TableHead>
                <SortableHead params={params} column="category">
                  Categoria
                </SortableHead>
                <SortableHead params={params} column="status">
                  Situação
                </SortableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((campaign) => (
                <TableRow key={campaign.publicId}>
                  <TableCell className="whitespace-nowrap text-ink-700" data-tabular>
                    {formatCampaignPeriod(campaign)}
                  </TableCell>
                  <TableCell className="font-medium text-ink-900">{campaign.name}</TableCell>
                  {/* A regra inteira não cabe na linha, e cortar no meio é o
                      certo: quem precisa dela abre o detalhe. */}
                  <TableCell
                    className="max-w-[22rem] truncate text-ink-500"
                    title={campaign.description}
                  >
                    {campaign.description}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink-500">
                    {campaign.category}
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions campaign={campaign} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <CampaignsPagination params={params} total={total} />
        </>
      )}
    </div>
  );
}
