import { WithdrawalStatusEnum } from '@porto/contracts';
import { PayoutUpdateStatus } from './payout-gateway';

export enum PayoutTransitionEnum {
  APPLY = 'APPLY',
  DUPLICATE = 'DUPLICATE',
  IGNORE = 'IGNORE',
  /** Pago ou devolvido num saque já falho: nada muda, mas alguém precisa conferir. */
  DIVERGE = 'DIVERGE',
}

const { REQUESTED, PROCESSING, PAID, FAILED, RETURNED } = WithdrawalStatusEnum;

/*
  De onde cada desfecho pode partir. A devolução é a única que alcança um saque
  já pago: o dinheiro voltou para a conta da Mesa depois de ter caído. Nenhum
  desfecho reabre um saque falho ou devolvido — as vendas dele já podem estar em
  outro saque.
*/
const ALLOWED_FROM: Record<Exclude<PayoutUpdateStatus, null>, WithdrawalStatusEnum[]> = {
  [PAID]: [REQUESTED, PROCESSING],
  [FAILED]: [REQUESTED, PROCESSING],
  [RETURNED]: [REQUESTED, PROCESSING, PAID],
};

/** Os status que devolvem as vendas ao saldo. */
export const RELEASING_STATUSES: readonly WithdrawalStatusEnum[] = [FAILED, RETURNED];

export function resolvePayoutTransition(
  current: WithdrawalStatusEnum,
  incoming: PayoutUpdateStatus,
): PayoutTransitionEnum {
  if (incoming === null) return PayoutTransitionEnum.IGNORE;
  if (current === incoming) return PayoutTransitionEnum.DUPLICATE;
  /*
    As vendas do saque falho já voltaram ao saldo e podem estar em outro saque.
    Um PIX que caiu (ou voltou) depois disso não pode sumir como "sem efeito":
    é dinheiro fora do lugar, e reabrir o saque pagaria as vendas duas vezes.
  */
  if (current === FAILED && incoming !== FAILED) return PayoutTransitionEnum.DIVERGE;

  return ALLOWED_FROM[incoming].includes(current)
    ? PayoutTransitionEnum.APPLY
    : PayoutTransitionEnum.IGNORE;
}
