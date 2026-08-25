import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';

export const ACCESS_TOKEN_ISSUER = createToken<AccessTokenIssuer>('ACCESS_TOKEN_ISSUER');
export const ACCESS_TOKEN_VERIFIER = createToken<AccessTokenVerifier>('ACCESS_TOKEN_VERIFIER');

/**
 * O que o token carrega. O `sub` é o `public_id`: o token viaja para fora da
 * API — em cookie `httpOnly`, mas viaja —, e o id serial não sai daqui.
 */
export interface AccessTokenClaims {
  sub: string;
  aud: AuthAudienceEnum;
  role: UserRoleEnum | null;
  name: string;
}

export interface AccessTokenIssuer {
  issue(claims: AccessTokenClaims): Promise<string>;
}

/**
 * Emitir e verificar são dois contratos com uma implementação só: quem verifica
 * é o guard, e guard que recebe a capacidade de emitir token pode assinar um.
 */
export interface AccessTokenVerifier {
  /** `null` quando o token é ausente, expirado, adulterado ou sem os claims. */
  verify(token: string): Promise<AccessTokenClaims | null>;
}
