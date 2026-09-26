import { WithdrawalStatusEnum } from '@porto/contracts';
import { PAYOUTS_PATH } from '@/backoffice/shared/routes';

export const PAYOUTS_PAGE_SIZE = 10;

export interface PayoutsParams {
  page: number;
  status: WithdrawalStatusEnum | null;
  search: string;
  /** AAAA-MM-DD. */
  from: string | null;
  until: string | null;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function day(value: string | undefined): string | null {
  return value && DAY.test(value) ? value : null;
}

/** Mesma regra da fila: nada que chegou pela URL é confiável. */
export function parsePayoutsParams(raw: RawSearchParams): PayoutsParams {
  const page = Number.parseInt(first(raw.page) ?? '', 10);
  const status = first(raw.status);

  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    status:
      status && Object.values(WithdrawalStatusEnum).includes(status as WithdrawalStatusEnum)
        ? (status as WithdrawalStatusEnum)
        : null,
    search: (first(raw.search) ?? '').trim(),
    from: day(first(raw.from)),
    until: day(first(raw.until)),
  };
}

/** Trocar filtro volta para a primeira página, como na fila. */
export function payoutsHref(current: PayoutsParams, changes: Partial<PayoutsParams>): string {
  const resetsPage = ['status', 'search', 'from', 'until'].some((key) => key in changes);
  const next: PayoutsParams = {
    ...current,
    ...changes,
    page: 'page' in changes ? (changes.page as number) : resetsPage ? 1 : current.page,
  };

  const query = new URLSearchParams();
  if (next.status) query.set('status', next.status);
  if (next.search) query.set('search', next.search);
  if (next.from) query.set('from', next.from);
  if (next.until) query.set('until', next.until);
  if (next.page > 1) query.set('page', String(next.page));

  const qs = query.toString();
  return qs ? `${PAYOUTS_PATH}?${qs}` : PAYOUTS_PATH;
}
