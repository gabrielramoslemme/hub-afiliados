import { createToken } from '@Domain/shared/token';

export const WEBHOOK_SIGNATURE_VERIFIER = createToken<WebhookSignatureVerifier>(
  'WEBHOOK_SIGNATURE_VERIFIER',
);

/** O que a assinatura cobre, como chegou: headers crus e os bytes do corpo. */
export interface SignedRequest {
  timestamp?: string;
  signature?: string;
  body?: Buffer;
}

/**
 * Quem chama o webhook prova que tem o segredo sem mandá-lo: assina o corpo e o
 * instante do envio. Contrato próprio, como o `AccessTokenVerifier`, para o
 * guard não conhecer algoritmo nem de onde vem o segredo.
 */
export interface WebhookSignatureVerifier {
  /** `false` para header ausente, assinatura que não confere ou instante fora da janela. */
  verify(request: SignedRequest): boolean;
}
