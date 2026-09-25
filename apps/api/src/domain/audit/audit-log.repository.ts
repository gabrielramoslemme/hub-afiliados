import { createToken } from '@Domain/shared/token';
import { AuditLogWithActor } from './audit-log.entity';

export const AUDIT_LOG_REPOSITORY = createToken<AuditLogRepository>('AUDIT_LOG_REPOSITORY');

/**
 * Só leitura: quem grava é o repositório de cada entidade, na transação da
 * mudança que a linha descreve.
 */
export interface AuditLogRepository {
  /**
   * A trilha do afiliado, da mais recente para a mais antiga: as linhas do
   * cadastro e as do cupom dele, com quem agiu em cada uma.
   */
  listByAffiliateId(affiliateId: number): Promise<AuditLogWithActor[]>;
}
