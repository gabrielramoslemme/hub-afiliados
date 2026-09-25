import { AuditLogRepository } from '@Domain/audit/audit-log.repository';

export const auditLogRepositoryMock = (): jest.Mocked<AuditLogRepository> => ({
  listByAffiliateId: jest.fn().mockResolvedValue([]),
});
