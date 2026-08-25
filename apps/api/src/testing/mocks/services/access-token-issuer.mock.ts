import { AccessTokenIssuer } from '@Domain/auth/access-token';

export const accessTokenIssuerMock = (): jest.Mocked<AccessTokenIssuer> => ({
  issue: jest.fn().mockResolvedValue('signed.access.token'),
});
