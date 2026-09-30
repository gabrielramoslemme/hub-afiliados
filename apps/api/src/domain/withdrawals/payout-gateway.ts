import { PixKeyTypeEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';

export const PAYOUT_GATEWAY = createToken<PayoutGateway>('PAYOUT_GATEWAY');

export interface RequestPayoutInput {
  /**
   * O `publicId` do saque. É a chave de idempotência no fornecedor: repetir o
   * pedido com a mesma referência nunca paga duas vezes.
   */
  reference: string;
  amountCents: number;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  /** O CPF do afiliado, só dígitos: o fornecedor confere que a chave é da própria pessoa. */
  holderCpf: string;
}

export interface PayoutRequestResult {
  /** Nulo quando o fornecedor já tinha o pedido — uma repetição — e não devolveu o lote. */
  batchId: string | null;
}

/** Os desfechos que mudam o saque. Status intermediário do fornecedor chega como nulo. */
export type PayoutUpdateStatus =
  | WithdrawalStatusEnum.PAID
  | WithdrawalStatusEnum.FAILED
  | WithdrawalStatusEnum.RETURNED
  | null;

/** O estado de um pagamento no fornecedor, já no nosso vocabulário. */
export interface PayoutUpdate {
  reference: string;
  status: PayoutUpdateStatus;
  /** O status como o fornecedor o escreve, para a trilha. */
  providerStatus: string;
  providerTransferId: string | null;
  endToEndId: string | null;
  receiptUrl: string | null;
  failureReason: string | null;
  /** O corpo do fornecedor já sem chave PIX nem CPF. */
  payload: Record<string, unknown>;
}

/**
 * O que a regra precisa de quem paga o PIX. Quem hoje paga é a Transfeera; o
 * vocabulário dela — lote, `integration_id`, `FINALIZADO` — vive inteiro em
 * `infra/services/payouts/`.
 *
 * `requestPayout` lança `PayoutRefusedError` quando o fornecedor recusou de vez
 * (o valor pode voltar ao saldo), e `PayoutProviderUnavailableError` ou
 * `PayoutProviderAccessDeniedError` quando não se sabe se ele recebeu (o saque
 * espera a reconciliação).
 */
export interface PayoutGateway {
  /** Falso quando o ambiente não tem credencial: o saque fica desligado. */
  isEnabled(): boolean;
  requestPayout(input: RequestPayoutInput): Promise<PayoutRequestResult>;
  /** Nulo quando o lote não tem transferência nenhuma. */
  findPayout(batchId: string): Promise<PayoutUpdate | null>;
}

export const PAYOUT_NOTIFICATION_TRANSLATOR = createToken<PayoutNotificationTranslator>(
  'PAYOUT_NOTIFICATION_TRANSLATOR',
);

/**
 * A notificação do fornecedor no nosso vocabulário. A rota do webhook valida o
 * formato; o que cada campo significa — e o que não pode ir para a trilha — é
 * de quem conhece o fornecedor.
 */
export interface PayoutNotificationTranslator {
  /** O desfecho da transferência já validada, com o corpo inteiro limpo. */
  toUpdate(transfer: object, payload: Record<string, unknown>): PayoutUpdate;
  /** O corpo sem os dados de quem recebe, para a trilha de um evento sem efeito. */
  redact(payload: Record<string, unknown>): Record<string, unknown>;
}
