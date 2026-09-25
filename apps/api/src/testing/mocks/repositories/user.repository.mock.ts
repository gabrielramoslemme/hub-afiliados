import { UserRepository } from '@Domain/users/user.repository';

export const userRepositoryMock = (): jest.Mocked<UserRepository> => ({
  findByEmail: jest.fn().mockResolvedValue(null),
  findByPublicId: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null),
  save: jest.fn(),
  updateWithAudit: jest.fn(),
});
