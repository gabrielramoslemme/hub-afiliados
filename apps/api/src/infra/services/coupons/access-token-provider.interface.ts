/**
 * Autenticar no gateway não é saber o que é um cupom — pela mesma razão que
 * `MailRenderer` e `MailProvider` são contratos separados. O gateway de cupons
 * pede um token e, se levar 401, descarta o que tinha e tenta uma vez só.
 */
export interface AccessTokenProvider {
  getAccessToken(): Promise<string>;
  /** Descarta o token guardado; a próxima chamada busca outro. */
  invalidate(): void;
}
