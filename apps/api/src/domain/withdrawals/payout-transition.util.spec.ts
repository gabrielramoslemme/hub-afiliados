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
    [RETURNED, FAILED],
  ] as const)('never reopens a closed withdrawal from %s to %s', (current, incoming) => {
    expect(resolvePayoutTransition(current, incoming)).toBe(IGNORE);
  });

  // As vendas de um saque falho já voltaram ao saldo e podem ter ido para outro
  // saque: um PIX que caiu depois disso é dinheiro fora do lugar.
  it('flags a payment on a failed withdrawal as divergent', () => {
    expect(resolvePayoutTransition(FAILED, PAID)).toBe(DIVERGE);
  });

  // A Transfeera leva toda `FALHA` a `DEVOLVIDO` logo em seguida: o saldo já
  // voltou, e alarmar aqui ensinaria a ignorar o alarme de pagamento em dobro.
  it('takes the return that follows every failure as a duplicate', () => {
    expect(resolvePayoutTransition(FAILED, RETURNED)).toBe(DUPLICATE);
  });

  // Uma falha depois do pago não pode sumir como "sem efeito": se o dinheiro
  // voltou, o afiliado perdeu o saldo e ninguém saberia.
  it('flags a failure on a paid withdrawal as divergent', () => {
    expect(resolvePayoutTransition(PAID, FAILED)).toBe(DIVERGE);
  });

  it('ignores the intermediate statuses the provider sends on the way', () => {
    expect(resolvePayoutTransition(PROCESSING, null)).toBe(IGNORE);
  });
});
