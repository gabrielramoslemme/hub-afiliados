import { createToken } from '@Domain/shared/token';

export const TOKEN_GENERATOR = createToken<TokenGenerator>('TOKEN_GENERATOR');

/** O valor em claro só existe no e-mail enviado; o banco guarda o hash. */
export interface GeneratedToken {
  token: string;
  hash: string;
}

export interface TokenGenerator {
  generate(): GeneratedToken;
}
