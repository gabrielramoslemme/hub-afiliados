import { TokenGenerator } from '@Domain/auth/token-generator';

export const tokenGeneratorMock = (): jest.Mocked<TokenGenerator> => ({
  generate: jest.fn().mockReturnValue({ token: 'plain-token', hash: 'hashed-token' }),
  hash: jest.fn().mockReturnValue('hashed-token'),
});
