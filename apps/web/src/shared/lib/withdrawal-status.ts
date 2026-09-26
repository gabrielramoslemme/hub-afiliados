import {
  type AffiliateStatementEntry,
  StatementEntryKindEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';

/**
 * O status do saque em palavras. `REQUESTED` e `PROCESSING` dizem a mesma
 * coisa para quem lê: o PIX está a caminho. A diferença — o fornecedor já
 * respondeu ou não — é assunto da reconciliação.
 */
export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatusEnum, string> = {
  [WithdrawalStatusEnum.REQUESTED]: 'Em processamento',
  [WithdrawalStatusEnum.PROCESSING]: 'Em processamento',
  [WithdrawalStatusEnum.PAID]: 'Pago',
  [WithdrawalStatusEnum.FAILED]: 'Não realizado',
  [WithdrawalStatusEnum.RETURNED]: 'Devolvido',
};

export type WithdrawalStatusTone = 'pending' | 'approved' | 'rejected';

const TONES: Record<WithdrawalStatusEnum, WithdrawalStatusTone> = {
  [WithdrawalStatusEnum.REQUESTED]: 'pending',
  [WithdrawalStatusEnum.PROCESSING]: 'pending',
  [WithdrawalStatusEnum.PAID]: 'approved',
  [WithdrawalStatusEnum.FAILED]: 'rejected',
  [WithdrawalStatusEnum.RETURNED]: 'rejected',
};

export function withdrawalStatusTone(status: WithdrawalStatusEnum): WithdrawalStatusTone {
  return TONES[status];
}

/** A linha de baixo do extrato: o que a linha é, e, no saque, onde ele está. */
export function statementCaption(entry: AffiliateStatementEntry): string {
  if (entry.kind === StatementEntryKindEnum.INCENTIVE || !entry.withdrawalStatus)
    return 'Incentivo';

  return `Saque · ${WITHDRAWAL_STATUS_LABELS[entry.withdrawalStatus]}`;
}
