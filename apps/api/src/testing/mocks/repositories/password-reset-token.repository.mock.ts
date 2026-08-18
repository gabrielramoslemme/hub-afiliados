import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';

export const passwordResetTokenRepositoryMock = (): jest.Mocked<PasswordResetTokenRepository> => ({
  create: jest.fn(),
  findUsable: jest.fn().mockResolvedValue(null),
  markUsed: jest.fn().mockResolvedValue(undefined),
  invalidateAllFor: jest.fn().mockResolvedValue(undefined),
  deleteExpired: jest.fn().mockResolvedValue(undefined),
});
