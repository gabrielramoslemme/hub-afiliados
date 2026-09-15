import 'server-only';

import { redirect } from 'next/navigation';
import type {
  AffiliateDetail,
  AffiliateListItem,
  AffiliateStatusHistoryItem,
  CouponHistoryItem,
  PaginatedResult,
} from '@porto/contracts';
import { SESSION_EXPIRED_PATH } from '@/admin/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { PAGE_SIZE, type QueueParams } from './queue-params';

/**
 * Backoffice de fila não pode ler cache: entre a analista abrir a lista e
 * decidir, outra pessoa pode ter decidido antes. `no-store` em toda leitura.
 */
const FRESH: RequestInit = { cache: 'no-store' };

/**
 * 401 é cookie vencido; 403 é token do outro canal. Nos dois casos a sessão não
 * serve mais, e a saída é entrar de novo — não uma tela quebrada com o erro
 * vazando para o `error.tsx`. O 404 segue reto de propósito: "afiliado não
 * encontrado" é conteúdo de tela, não problema de sessão.
 */
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

export function fetchAffiliates(params: QueueParams): Promise<PaginatedResult<AffiliateListItem>> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(PAGE_SIZE),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  return readOrSignIn(() =>
    authedApiFetch<PaginatedResult<AffiliateListItem>>(`/admin/affiliates?${query}`, FRESH),
  );
}

export function fetchAffiliate(publicId: string): Promise<AffiliateDetail> {
  return readOrSignIn(() =>
    authedApiFetch<AffiliateDetail>(`/admin/affiliates/${publicId}`, FRESH),
  );
}

export function fetchAffiliateHistory(publicId: string): Promise<AffiliateStatusHistoryItem[]> {
  return readOrSignIn(() =>
    authedApiFetch<AffiliateStatusHistoryItem[]>(`/admin/affiliates/${publicId}/history`, FRESH),
  );
}

export function fetchCouponHistory(publicId: string): Promise<CouponHistoryItem[]> {
  return readOrSignIn(() =>
    authedApiFetch<CouponHistoryItem[]>(`/admin/affiliates/${publicId}/coupon/history`, FRESH),
  );
}
