import { AccessTokenVerifier } from '@Domain/auth/access-token';

/** O padrão é recusar: teste que precisa de sessão válida diz isso explicitamente. */
export const accessTokenVerifierMock = (): jest.Mocked<AccessTokenVerifier> => ({
  verify: jest.fn().mockResolvedValue(null),
});
