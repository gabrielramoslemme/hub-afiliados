import { createToken } from '@Domain/shared/token';

export const TOKEN_GENERATOR = createToken<TokenGenerator>('TOKEN_GENERATOR');

/** O valor em claro só existe no e-mail enviado; o banco guarda o hash. */
export interface GeneratedToken {
  token: string;
  hash: string;
}

export interface TokenGenerator {
  generate(): GeneratedToken;
  /**
   * O mesmo algoritmo do `generate`, para procurar no banco pelo hash do token
   * que chegou no link. Se as duas metades morassem em lugares diferentes,
   * trocar de algoritmo quebraria a busca em silêncio.
   */
  hash(token: string): string;
}
