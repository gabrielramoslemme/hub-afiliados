import { PayoutEventOutcomeEnum, PayoutEventSourceEnum } from '@porto/contracts';

/**
 * Uma notificação ou consulta do fornecedor de pagamento, como chegou —
 * aplicada ou não. É a trilha que o suporte lê quando um saque não anda.
 * O `payload` é gravado **sem** chave PIX e sem CPF.
 */
export interface PayoutEventEntity {
  id: number;
  publicId: string;
  source: PayoutEventSourceEnum;
  /** O id do evento no fornecedor; nulo na reconciliação, que não é um evento dele. */
  eventId: string | null;
  withdrawalId: number | null;
  /** A referência que o fornecedor citou — o nosso `publicId`, quando é saque nosso. */
  reference: string | null;
  providerStatus: string | null;
  outcome: PayoutEventOutcomeEnum;
  payload: Record<string, unknown>;
  receivedAt: Date;
}
