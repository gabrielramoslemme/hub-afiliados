import 'server-only';

import { redirect } from 'next/navigation';
import type { PaginatedResult, WithdrawalDetail, WithdrawalListItem } from '@porto/contracts';
import { SESSION_EXPIRED_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { PAYOUTS_PAGE_SIZE, type PayoutsParams } from './lib/payouts-params';

/** Um saque muda de status por fora, pelo webhook: nada de cache. */
const FRESH: RequestInit = { cache: 'no-store' };

async function readOrSignIn<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      redirect(SESSION_EXPIRED_PATH);
    }

    throw error;
  }
}

export function fetchWithdrawals(
  params: PayoutsParams,
): Promise<PaginatedResult<WithdrawalListItem>> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(PAYOUTS_PAGE_SIZE),
  });
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.from) query.set('from', params.from);
  if (params.until) query.set('until', params.until);

  return readOrSignIn(() =>
    authedApiFetch<PaginatedResult<WithdrawalListItem>>(`/admin/withdrawals?${query}`, FRESH),
  );
}

export function fetchWithdrawal(publicId: string): Promise<WithdrawalDetail> {
  return readOrSignIn(() =>
    authedApiFetch<WithdrawalDetail>(`/admin/withdrawals/${publicId}`, FRESH),
  );
}
