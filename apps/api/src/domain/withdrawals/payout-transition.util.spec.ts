import { WithdrawalStatusEnum } from '@porto/contracts';
import { PayoutTransitionEnum, resolvePayoutTransition } from './payout-transition.util';

const { REQUESTED, PROCESSING, PAID, FAILED, RETURNED } = WithdrawalStatusEnum;
const { APPLY, DUPLICATE, IGNORE, DIVERGE } = PayoutTransitionEnum;

describe('resolvePayoutTransition', () => {
  it.each([
    [REQUESTED, PAID, APPLY],
    [PROCESSING, PAID, APPLY],
    [REQUESTED, FAILED, APPLY],
    [PROCESSING, FAILED, APPLY],
    [PROCESSING, RETURNED, APPLY],
    // `as const`: sem isso o TS alarga `incoming` para `WithdrawalStatusEnum`
    // inteiro, e `resolvePayoutTransition` para de aceitar REQUESTED/PROCESSING nele.
  ] as const)('moves an open withdrawal from %s to %s', (current, incoming, expected) => {
    expect(resolvePayoutTransition(current, incoming)).toBe(expected);
  });

  // O banco de destino pode devolver um PIX que já tinha caído: o dinheiro
  // voltou para a conta da Mesa, e o saque tem de dizer isso.
  it('accepts a return after the withdrawal was paid', () => {
    expect(resolvePayoutTransition(PAID, RETURNED)).toBe(APPLY);
  });

  it.each([PAID, FAILED, RETURNED] as const)('treats a repeated %s as a duplicate', (status) => {
    expect(resolvePayoutTransition(status, status)).toBe(DUPLICATE);
  });

  it.each([
    [RETURNED, PAID],
    [PAID, FAILED],
    [RETURNED, FAILED],
  ] as const)('never reopens a closed withdrawal from %s to %s', (current, incoming) => {
    expect(resolvePayoutTransition(current, incoming)).toBe(IGNORE);
  });

  // As vendas de um saque falho já voltaram ao saldo e podem ter ido para outro
  // saque: um PIX que caiu (ou voltou) depois disso é dinheiro fora do lugar.
  it.each([PAID, RETURNED] as const)('flags %s on a failed withdrawal as divergent', (incoming) => {
    expect(resolvePayoutTransition(FAILED, incoming)).toBe(DIVERGE);
  });

  it('ignores the intermediate statuses the provider sends on the way', () => {
    expect(resolvePayoutTransition(PROCESSING, null)).toBe(IGNORE);
  });
});
