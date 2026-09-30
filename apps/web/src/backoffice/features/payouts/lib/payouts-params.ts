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

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** O mesmo limite do `ListWithdrawalsQueryDto`: acima dele a API responde 400. */
export const PAYOUTS_SEARCH_MAX_LENGTH = 120;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A API confere o calendário (`IsDateString` estrito), não só o molde. */
function day(value: string | undefined): string | null {
  const match = value ? DAY.exec(value) : null;
  if (!match) return null;

  const [, year, month, date] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  const exists =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === date;

  return exists ? (value as string) : null;
}

function searchTerm(value: string | undefined): string {
  const term = (value ?? '').trim();

  return term.length <= PAYOUTS_SEARCH_MAX_LENGTH ? term : '';
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
    search: searchTerm(first(raw.search)),
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
