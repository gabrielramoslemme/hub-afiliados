import { AffiliateStatusEnum } from '@porto/contracts';
import { QUEUE_PATH } from '@/admin/shared/routes';

export const PAGE_SIZE = 10;

export type QueueSortBy = 'createdAt' | 'name';
export type QueueSortOrder = 'asc' | 'desc';

export interface QueueParams {
  page: number;
  status: AffiliateStatusEnum | null;
  search: string;
  sortBy: QueueSortBy;
  sortOrder: QueueSortOrder;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const DEFAULTS: QueueParams = {
  page: 1,
  status: null,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORTABLE: QueueSortBy[] = ['createdAt', 'name'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * A URL é a fonte do estado da fila: filtro, ordenação e página. Vem do usuário,
 * então nada aqui confia no que chegou — status desconhecido, coluna que a API
 * não ordena e página zero viram o padrão, em vez de virarem erro 500 lá na API.
 */
export function parseQueueParams(raw: RawSearchParams): QueueParams {
  const page = Number.parseInt(first(raw.page) ?? '', 10);
  const status = first(raw.status);
  const sortBy = first(raw.sortBy) as QueueSortBy | undefined;

  return {
    page: Number.isFinite(page) && page >= 1 ? page : DEFAULTS.page,
    status:
      status && Object.values(AffiliateStatusEnum).includes(status as AffiliateStatusEnum)
        ? (status as AffiliateStatusEnum)
        : DEFAULTS.status,
    search: (first(raw.search) ?? '').trim(),
    sortBy: sortBy && SORTABLE.includes(sortBy) ? sortBy : DEFAULTS.sortBy,
    sortOrder: first(raw.sortOrder) === 'asc' ? 'asc' : DEFAULTS.sortOrder,
  };
}

/**
 * Trocar filtro ou ordenação volta para a primeira página: continuar na página 4
 * de um recorte que agora tem duas é a forma mais rápida de a fila parecer
 * vazia sem estar.
 */
export function queueHref(current: QueueParams, changes: Partial<QueueParams>): string {
  const resetsPage = ['status', 'search', 'sortBy', 'sortOrder'].some((key) => key in changes);
  const next: QueueParams = {
    ...current,
    ...changes,
    page: 'page' in changes ? (changes.page as number) : resetsPage ? 1 : current.page,
  };

  const query = new URLSearchParams();

  if (next.status) query.set('status', next.status);
  if (next.search) query.set('search', next.search);
  if (next.sortBy !== DEFAULTS.sortBy) query.set('sortBy', next.sortBy);
  if (next.sortOrder !== DEFAULTS.sortOrder) query.set('sortOrder', next.sortOrder);
  if (next.page !== DEFAULTS.page) query.set('page', String(next.page));

  const search = query.toString();

  return search ? `${QUEUE_PATH}?${search}` : QUEUE_PATH;
}
