import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';

export const affiliateRepositoryMock = (): jest.Mocked<AffiliateRepository> => ({
  findByCpf: jest.fn().mockResolvedValue(null),
  findByPublicId: jest.fn().mockResolvedValue(null),
  findByUserId: jest.fn().mockResolvedValue(null),
  search: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
  save: jest.fn(),
  changeStatus: jest.fn().mockResolvedValue(null),
  createWithUser: jest.fn(),
});
