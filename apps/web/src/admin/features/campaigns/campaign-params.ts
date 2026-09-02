import { CAMPAIGNS_PATH } from '@/admin/shared/routes';
import { CAMPAIGN_STATUSES } from './campaign-display';
import { CAMPAIGN_CATEGORIES, type CampaignCategory, type CampaignStatus } from './mock-data';

export const PAGE_SIZE = 8;

export type CampaignSortBy = 'startsAt' | 'name' | 'category' | 'status';
export type CampaignSortOrder = 'asc' | 'desc';

export interface CampaignParams {
  page: number;
  status: CampaignStatus | null;
  category: CampaignCategory | null;
  search: string;
  sortBy: CampaignSortBy;
  sortOrder: CampaignSortOrder;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const DEFAULTS: CampaignParams = {
  page: 1,
  status: null,
  category: null,
  search: '',
  sortBy: 'startsAt',
  sortOrder: 'desc',
};

/**
 * A descrição fica de fora de propósito: ordenar campanha por texto de regra não
 * responde nenhuma pergunta que a analista faça, e coluna ordenável que ninguém
 * usa é só mais um clique que muda a tela sem explicar por quê.
 */
const SORTABLE: CampaignSortBy[] = ['startsAt', 'name', 'category', 'status'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * A URL é a fonte do estado da listagem: recorte, ordenação e página. Vem do
 * usuário, então nada aqui confia no que chegou — situação desconhecida,
 * categoria inventada e página zero viram o padrão em vez de virarem erro.
 */
export function parseCampaignParams(raw: RawSearchParams): CampaignParams {
  const page = Number.parseInt(first(raw.page) ?? '', 10);
  const status = first(raw.status) as CampaignStatus | undefined;
  const category = first(raw.category) as CampaignCategory | undefined;
  const sortBy = first(raw.sortBy) as CampaignSortBy | undefined;

  return {
    page: Number.isFinite(page) && page >= 1 ? page : DEFAULTS.page,
    status: status && CAMPAIGN_STATUSES.includes(status) ? status : DEFAULTS.status,
    category: category && CAMPAIGN_CATEGORIES.includes(category) ? category : DEFAULTS.category,
    search: (first(raw.search) ?? '').trim(),
    sortBy: sortBy && SORTABLE.includes(sortBy) ? sortBy : DEFAULTS.sortBy,
    sortOrder: first(raw.sortOrder) === 'asc' ? 'asc' : DEFAULTS.sortOrder,
  };
}

/**
 * Trocar recorte ou ordenação volta para a primeira página: continuar na página
 * 3 de um corte que agora tem uma é a forma mais rápida de a listagem parecer
 * vazia sem estar.
 */
export function campaignsHref(current: CampaignParams, changes: Partial<CampaignParams>): string {
  const resetsPage = ['status', 'category', 'search', 'sortBy', 'sortOrder'].some(
    (key) => key in changes,
  );
  const next: CampaignParams = {
    ...current,
    ...changes,
    page: 'page' in changes ? (changes.page as number) : resetsPage ? 1 : current.page,
  };

  const query = new URLSearchParams();

  if (next.status) query.set('status', next.status);
  if (next.category) query.set('category', next.category);
  if (next.search) query.set('search', next.search);
  if (next.sortBy !== DEFAULTS.sortBy) query.set('sortBy', next.sortBy);
  if (next.sortOrder !== DEFAULTS.sortOrder) query.set('sortOrder', next.sortOrder);
  if (next.page !== DEFAULTS.page) query.set('page', String(next.page));

  const search = query.toString();

  return search ? `${CAMPAIGNS_PATH}?${search}` : CAMPAIGNS_PATH;
}
