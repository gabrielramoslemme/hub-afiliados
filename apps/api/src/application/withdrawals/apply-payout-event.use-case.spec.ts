import {
  MailTemplateEnum,
  PayoutEventOutcomeEnum,
  PayoutEventSourceEnum,
  PixKeyTypeEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { PayoutUpdate } from '@Domain/withdrawals/payout-gateway';
import { UnknownPayoutReferenceError } from '@Domain/withdrawals/withdrawals.errors';
import { buildWithdrawal } from '@Testing/factories/withdrawal.factory';
import { withdrawalRepositoryMock } from '@Testing/mocks/repositories/withdrawal.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { linkBuilderMock } from '@Testing/mocks/services/link-builder.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { ApplyPayoutEventUseCase } from './apply-payout-event.use-case';

describe('ApplyPayoutEventUseCase', () => {
  const NOW = new Date('2026-09-25T15:00:00.000Z');

  let withdrawalRepository: ReturnType<typeof withdrawalRepositoryMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let useCase: ApplyPayoutEventUseCase;

  const update: PayoutUpdate = {
    reference: '40000000-0000-4000-8000-000000000001',
    status: WithdrawalStatusEnum.PAID,
    providerStatus: 'FINALIZADO',
    providerTransferId: '60040',
    endToEndId: 'E123',
    receiptUrl: 'https://r',
    failureReason: null,
    payload: { object: 'Transfer' },
  };

  function applied(status: WithdrawalStatusEnum) {
    return {
      outcome: PayoutEventOutcomeEnum.APPLIED,
      withdrawal: buildWithdrawal({
        status,
        amountCents: 4000,
        pixKeyType: PixKeyTypeEnum.EMAIL,
        pixKey: 'pix.marina@email.com',
      }),
    };
  }

  beforeEach(() => {
    withdrawalRepository = withdrawalRepositoryMock();
    mailer = mailerMock();
    useCase = new ApplyPayoutEventUseCase(
      withdrawalRepository,
      mailer,
      linkBuilderMock(),
      clockMock(NOW),
    );
  });

  it('applies the update and records the event with where it came from', async () => {
    withdrawalRepository.applyPayoutUpdate.mockResolvedValue(applied(WithdrawalStatusEnum.PAID));

    await useCase.execute({ update, source: PayoutEventSourceEnum.WEBHOOK, eventId: 'evt-1' });

    expect(withdrawalRepository.applyPayoutUpdate).toHaveBeenCalledWith({
      update,
      at: NOW,
      event: { source: PayoutEventSourceEnum.WEBHOOK, eventId: 'evt-1', receivedAt: NOW },
    });
  });

  it('tells the affiliate the withdrawal was paid, with the amount and the masked key', async () => {
    withdrawalRepository.applyPayoutUpdate.mockResolvedValue(applied(WithdrawalStatusEnum.PAID));

    await useCase.execute({ update, source: PayoutEventSourceEnum.WEBHOOK, eventId: 'evt-1' });

    expect(mailer.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.WITHDRAWAL_PAID,
      to: 'marina.ferraz@email.com',
      toName: 'Marina Ferraz',
      variables: {
        name: 'Marina Ferraz',
        amount: expect.stringContaining('40,00'),
        maskedPixKey: expect.not.stringContaining('pix.marina@email.com'),
        link: 'https://afiliados.porto.example/minha-conta/carteira',
      },
    });
  });

  it('tells the affiliate a returned pix is back in the balance', async () => {
    withdrawalRepository.applyPayoutUpdate.mockResolvedValue(
      applied(WithdrawalStatusEnum.RETURNED),
    );

    await useCase.execute({
      update: { ...update, status: WithdrawalStatusEnum.RETURNED },
      source: PayoutEventSourceEnum.WEBHOOK,
      eventId: 'evt-2',
    });

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ template: MailTemplateEnum.WITHDRAWAL_RETURNED }),
    );
  });

  it('sends nothing for a failure, a repetition or an ignored status', async () => {
    withdrawalRepository.applyPayoutUpdate.mockResolvedValueOnce(
      applied(WithdrawalStatusEnum.FAILED),
    );
    await useCase.execute({ update, source: PayoutEventSourceEnum.WEBHOOK, eventId: 'a' });

    withdrawalRepository.applyPayoutUpdate.mockResolvedValueOnce({
      ...applied(WithdrawalStatusEnum.PAID),
      outcome: PayoutEventOutcomeEnum.DUPLICATE,
    });
    await useCase.execute({ update, source: PayoutEventSourceEnum.WEBHOOK, eventId: 'b' });

    withdrawalRepository.applyPayoutUpdate.mockResolvedValueOnce({
      ...applied(WithdrawalStatusEnum.PROCESSING),
      outcome: PayoutEventOutcomeEnum.IGNORED,
    });
    await useCase.execute({ update, source: PayoutEventSourceEnum.WEBHOOK, eventId: 'c' });

    expect(mailer.send).not.toHaveBeenCalled();
  });

  // Responder 404 é o que faz a Transfeera tentar de novo — o webhook pode ter
  // chegado antes do commit do pedido.
  it('refuses a reference that is no withdrawal of ours', async () => {
    withdrawalRepository.applyPayoutUpdate.mockResolvedValue({
      outcome: PayoutEventOutcomeEnum.UNKNOWN_WITHDRAWAL,
      withdrawal: null,
    });

    await expect(
      useCase.execute({ update, source: PayoutEventSourceEnum.WEBHOOK, eventId: 'x' }),
    ).rejects.toThrow(UnknownPayoutReferenceError);
  });
});
