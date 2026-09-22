import 'server-only';

import { redirect } from 'next/navigation';
import type {
  AffiliateMeResponse,
  AffiliateReferralsResponse,
  AffiliateWalletResponse,
  ReferralPeriodEnum,
} from '@porto/contracts';
import { AFFILIATE_SESSION_EXPIRED_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

/**
 * Saldo, extrato e indicações não podem vir de cache: entre a pessoa abrir a
 * tela e olhar de novo, uma venda pode ter entrado ou um pagamento pode ter
 * saído.
 */
const FRESH: RequestInit = { cache: 'no-store' };

/** Mesma regra do painel: sessão recusada vira login, não tela quebrada. */
async function readOrSignIn<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      redirect(AFFILIATE_SESSION_EXPIRED_PATH);
    }

    throw error;
  }
}

export function fetchAccount(): Promise<AffiliateMeResponse> {
  return readOrSignIn(() => affiliateApiFetch<AffiliateMeResponse>('/affiliate/me', FRESH));
}

export function fetchWallet(): Promise<AffiliateWalletResponse> {
  return readOrSignIn(() =>
    affiliateApiFetch<AffiliateWalletResponse>('/affiliate/me/wallet', FRESH),
  );
}

export function fetchReferrals(period: ReferralPeriodEnum): Promise<AffiliateReferralsResponse> {
  return readOrSignIn(() =>
    affiliateApiFetch<AffiliateReferralsResponse>(
      `/affiliate/me/referrals?period=${period}`,
      FRESH,
    ),
  );
}
