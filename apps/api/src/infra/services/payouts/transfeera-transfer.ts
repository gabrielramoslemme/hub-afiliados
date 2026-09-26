import { WithdrawalStatusEnum } from '@porto/contracts';
import { redactSensitive } from '@Domain/shared/redaction.util';
import { PayoutUpdate, PayoutUpdateStatus } from '@Domain/withdrawals/payout-gateway';

/**
 * A transferência como a Transfeera a descreve, no webhook e na consulta do
 * lote. Só o que se lê; o resto do corpo vai inteiro — limpo — para a trilha.
 */
export interface TransfeeraTransfer {
  id?: string | number | null;
  integration_id?: string | null;
  status?: string | null;
  status_description?: string | null;
  receipt_url?: string | null;
  bank_receipt_url?: string | null;
  pix_end2end_id?: string | null;
  error?: unknown;
}

/*
  `FALHA` está sendo aposentado pela Transfeera em favor de `DEVOLVIDO`, e no
  PIX `TRANSFERIDO` deu lugar a `FINALIZADO`. Os dois seguem aqui enquanto ela
  puder mandá-los. O que não está no mapa é intermediário: não muda o saque.
*/
const STATUS_BY_TRANSFEERA: Record<string, PayoutUpdateStatus> = {
  FINALIZADO: WithdrawalStatusEnum.PAID,
  FALHA: WithdrawalStatusEnum.FAILED,
  DEVOLVIDO: WithdrawalStatusEnum.RETURNED,
};

const ACCOUNT_KEYS = new Set([
  'destination_bank_account',
  'DestinationBankAccount',
  'pix_key_validation',
]);
const HOLDER_FIELDS = new Set([
  'pix_key',
  'cpf_cnpj',
  'name',
  'email',
  'agency',
  'account',
  'account_digit',
]);

/*
  Texto livre do fornecedor: pode citar a chave, e aqui não se sabe qual ela é.
  Na trilha some inteiro; o motivo, já limpo, fica no saque.
*/
const FREE_TEXT_KEYS = new Set(['status_description', 'error']);

const REDACTED = '[removido]';

function errorMessage(error: unknown): string | null {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string') return message;
  }

  return null;
}

function redactAccount(account: unknown): unknown {
  if (!account || typeof account !== 'object' || Array.isArray(account)) return account;

  return Object.fromEntries(
    Object.entries(account).map(([key, value]) => [key, HOLDER_FIELDS.has(key) ? REDACTED : value]),
  );
}

/**
 * O corpo da Transfeera sem os dados de quem recebe. A chave PIX e o CPF não
 * vão para log nem para a trilha — e a trilha guarda o corpo inteiro.
 */
export function redactTransfeeraPayload<T>(payload: T): T {
  if (Array.isArray(payload)) return payload.map((item) => redactTransfeeraPayload(item)) as T;
  if (!payload || typeof payload !== 'object') return payload;

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      ACCOUNT_KEYS.has(key)
        ? redactAccount(value)
        : FREE_TEXT_KEYS.has(key) && value != null
          ? REDACTED
          : redactTransfeeraPayload(value),
    ]),
  ) as T;
}

export function toPayoutUpdate(
  transfer: TransfeeraTransfer,
  payload: Record<string, unknown>,
): PayoutUpdate {
  const providerStatus = transfer.status ?? '';
  const reason = transfer.status_description ?? errorMessage(transfer.error);

  return {
    reference: transfer.integration_id ?? '',
    status: STATUS_BY_TRANSFEERA[providerStatus] ?? null,
    providerStatus,
    providerTransferId: transfer.id == null ? null : String(transfer.id),
    endToEndId: transfer.pix_end2end_id ?? null,
    receiptUrl: transfer.receipt_url ?? transfer.bank_receipt_url ?? null,
    // Só o molde do CPF: a chave exata o adapter tira, que é quem conhece o saque.
    failureReason: reason === null ? null : redactSensitive(reason),
    payload: redactTransfeeraPayload(payload),
  };
}
