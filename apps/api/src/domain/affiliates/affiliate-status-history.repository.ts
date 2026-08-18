import { AffiliateStatusHistoryWithActor } from './affiliate-status-history.entity';

export const AFFILIATE_STATUS_HISTORY_REPOSITORY = Symbol('AFFILIATE_STATUS_HISTORY_REPOSITORY');

/**
 * Só leitura: quem grava é `AffiliateRepository.changeStatus`, na mesma
 * transação da mudança. Trilha que pode ficar de fora não é trilha.
 */
export interface AffiliateStatusHistoryRepository {
  listByAffiliateId(affiliateId: number): Promise<AffiliateStatusHistoryWithActor[]>;
}
