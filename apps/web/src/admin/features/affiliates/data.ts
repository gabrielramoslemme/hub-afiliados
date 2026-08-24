import 'server-only';

import type {
  AffiliateDetail,
  AffiliateListItem,
  AffiliateStatusHistoryItem,
  PaginatedResult,
} from '@porto/contracts';
import { authedApiFetch } from '@/shared/http/api-client';
import { PAGE_SIZE, type QueueParams } from './queue-params';

/**
 * Backoffice de fila não pode ler cache: entre a analista abrir a lista e
 * decidir, outra pessoa pode ter decidido antes. `no-store` em toda leitura.
 */
const FRESH: RequestInit = { cache: 'no-store' };

export function fetchAffiliates(params: QueueParams): Promise<PaginatedResult<AffiliateListItem>> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(PAGE_SIZE),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  return authedApiFetch<PaginatedResult<AffiliateListItem>>(`/admin/affiliates?${query}`, FRESH);
}

export function fetchAffiliate(publicId: string): Promise<AffiliateDetail> {
  return authedApiFetch<AffiliateDetail>(`/admin/affiliates/${publicId}`, FRESH);
}

export function fetchAffiliateHistory(publicId: string): Promise<AffiliateStatusHistoryItem[]> {
  return authedApiFetch<AffiliateStatusHistoryItem[]>(
    `/admin/affiliates/${publicId}/history`,
    FRESH,
  );
}
