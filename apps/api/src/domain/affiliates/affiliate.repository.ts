import { AffiliateStatusEnum } from '@porto/contracts';
import { AffiliateDetail, AffiliateEntity, AffiliateWithUser } from './affiliate.entity';

export const AFFILIATE_REPOSITORY = Symbol('AFFILIATE_REPOSITORY');

export interface ChangeAffiliateStatusInput {
  affiliateId: number;
  toStatus: AffiliateStatusEnum;
  /** Motivo registrado na trilha de auditoria. */
  reason?: string | null;
  actorUserId?: number | null;
  /** Colunas que a transição também altera, gravadas na mesma transação. */
  changes?: Partial<Pick<AffiliateEntity, 'approvedAt' | 'approvedByUserId' | 'rejectionReason'>>;
}

export interface AffiliateRepository {
  findByCpf(cpf: string): Promise<AffiliateEntity | null>;
  findByPublicId(publicId: string): Promise<AffiliateDetail | null>;
  findByUserId(userId: number): Promise<AffiliateWithUser | null>;
  save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity>;
  /**
   * Muda o status e grava o histórico na mesma transação. O status anterior sai
   * da linha travada dentro dela — recebê-lo de fora permitiria registrar uma
   * transição que nunca aconteceu.
   */
  changeStatus(input: ChangeAffiliateStatusInput): Promise<AffiliateEntity | null>;
}
