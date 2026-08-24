import 'server-only';

import type { AffiliateMeResponse, AffiliateWalletResponse } from '@porto/contracts';
import { affiliateApiFetch } from '@/shared/http/api-client';

/**
 * Saldo e extrato não podem vir de cache: entre a pessoa abrir a carteira e
 * olhar de novo, uma venda pode ter entrado ou um pagamento pode ter saído.
 */
const FRESH: RequestInit = { cache: 'no-store' };

export function fetchAccount(): Promise<AffiliateMeResponse> {
  return affiliateApiFetch<AffiliateMeResponse>('/affiliate/me', FRESH);
}

export function fetchWallet(): Promise<AffiliateWalletResponse> {
  return affiliateApiFetch<AffiliateWalletResponse>('/affiliate/me/wallet', FRESH);
}
