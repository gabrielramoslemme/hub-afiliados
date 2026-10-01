import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';

export const passwordResetTokenRepositoryMock = (): jest.Mocked<PasswordResetTokenRepository> => ({
  create: jest.fn(),
  findUsable: jest.fn().mockResolvedValue(null),
  redeem: jest.fn().mockResolvedValue(true),
  invalidateAllFor: jest.fn().mockResolvedValue(undefined),
  listCreatedSince: jest.fn().mockResolvedValue([]),
  deleteExpired: jest.fn().mockResolvedValue(undefined),
});
