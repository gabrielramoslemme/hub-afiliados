import { PasswordHasher } from '@Domain/auth/password-hasher';

export const passwordHasherMock = (): jest.Mocked<PasswordHasher> => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
  compare: jest.fn().mockResolvedValue(true),
});
