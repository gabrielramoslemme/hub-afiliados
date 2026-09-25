import { createToken } from '@Domain/shared/token';

export const PAYOUT_WEBHOOK_SIGNATURE_VERIFIER = createToken<PayoutWebhookSignatureVerifier>(
  'PAYOUT_WEBHOOK_SIGNATURE_VERIFIER',
);

export interface PayoutSignedRequest {
  /** O header de assinatura inteiro, como chegou. */
  signatureHeader?: string;
  body?: Buffer;
}

/**
 * A assinatura do webhook do fornecedor de pagamento. Contrato próprio, e não
 * o `WebhookSignatureVerifier` da Porto: o formato do header, a unidade do
 * instante e o segredo são outros.
 */
export interface PayoutWebhookSignatureVerifier {
  verify(request: PayoutSignedRequest): boolean;
}
