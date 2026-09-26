import { StatementEntryKindEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { statementCaption, withdrawalStatusTone } from './withdrawal-status';

const entry = {
  id: 'x',
  title: 'Saque via PIX',
  cents: 100,
  occurredAt: '2026-09-25T12:00:00Z',
  receiptUrl: null,
};

describe('statementCaption', () => {
  it('calls an incentive line an incentive', () => {
    expect(
      statementCaption({
        ...entry,
        kind: StatementEntryKindEnum.INCENTIVE,
        withdrawalStatus: null,
      }),
    ).toBe('Incentivo');
  });

  // "Solicitado" diria à pessoa que nada aconteceu; para ela, o pedido gravado
  // e o aceito pelo fornecedor são a mesma coisa: o PIX está a caminho.
  it.each([
    [WithdrawalStatusEnum.REQUESTED, 'Saque · Em processamento'],
    [WithdrawalStatusEnum.PROCESSING, 'Saque · Em processamento'],
    [WithdrawalStatusEnum.PAID, 'Saque · Pago'],
    [WithdrawalStatusEnum.FAILED, 'Saque · Não realizado'],
    [WithdrawalStatusEnum.RETURNED, 'Saque · Devolvido'],
  ])('captions a %s withdrawal as "%s"', (status, caption) => {
    expect(
      statementCaption({ ...entry, kind: StatementEntryKindEnum.PAYOUT, withdrawalStatus: status }),
    ).toBe(caption);
  });
});

describe('withdrawalStatusTone', () => {
  it('reads paid as approved and the two closings without money as rejected', () => {
    expect(withdrawalStatusTone(WithdrawalStatusEnum.PAID)).toBe('approved');
    expect(withdrawalStatusTone(WithdrawalStatusEnum.FAILED)).toBe('rejected');
    expect(withdrawalStatusTone(WithdrawalStatusEnum.RETURNED)).toBe('rejected');
    expect(withdrawalStatusTone(WithdrawalStatusEnum.REQUESTED)).toBe('pending');
  });
});
