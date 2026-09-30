import {
  MailTemplateEnum,
  PayoutEventOutcomeEnum,
  PayoutEventSourceEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import {
  PayoutProviderUnavailableError,
  PayoutRefusedError,
} from '@Domain/withdrawals/withdrawals.errors';
import { buildWithdrawal } from '@Testing/factories/withdrawal.factory';
import { withdrawalRepositoryMock } from '@Testing/mocks/repositories/withdrawal.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { linkBuilderMock } from '@Testing/mocks/services/link-builder.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { payoutGatewayMock } from '@Testing/mocks/services/payout-gateway.mock';
import { ReconcileWithdrawalsUseCase } from './reconcile-withdrawals.use-case';

describe('ReconcileWithdrawalsUseCase', () => {
  const NOW = new Date('2026-09-25T15:00:00.000Z');
  const INPUT = { retryAfterMinutes: 5, staleAfterMinutes: 120, limit: 50 };

  let withdrawalRepository: ReturnType<typeof withdrawalRepositoryMock>;
  let payoutGateway: ReturnType<typeof payoutGatewayMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let useCase: ReconcileWithdrawalsUseCase;

  const requested = buildWithdrawal({ status: WithdrawalStatusEnum.REQUESTED });
  const processing = buildWithdrawal({
    status: WithdrawalStatusEnum.PROCESSING,
    providerBatchId: '1426',
  });

  function stale(status: WithdrawalStatusEnum, rows: ReturnType<typeof buildWithdrawal>[]) {
    withdrawalRepository.listStale.mockImplementation(async (input) =>
      input.status === status ? rows : [],
    );
  }

  beforeEach(() => {
    withdrawalRepository = withdrawalRepositoryMock();
    payoutGateway = payoutGatewayMock();
    mailer = mailerMock();
    useCase = new ReconcileWithdrawalsUseCase(
      withdrawalRepository,
      payoutGateway,
      mailer,
      linkBuilderMock(),
      clockMock(NOW),
    );
  });

  it('looks for requested withdrawals past the retry wait and processing ones past the stale wait', async () => {
    await useCase.execute(INPUT);

    expect(withdrawalRepository.listStale).toHaveBeenCalledWith({
      status: WithdrawalStatusEnum.REQUESTED,
      updatedBefore: new Date('2026-09-25T14:55:00.000Z'),
      limit: 50,
    });
    expect(withdrawalRepository.listStale).toHaveBeenCalledWith({
      status: WithdrawalStatusEnum.PROCESSING,
      updatedBefore: new Date('2026-09-25T13:00:00.000Z'),
      limit: 50,
    });
  });

  // A mesma referência é o que faz o fornecedor não pagar duas vezes o pedido
  // que talvez já tenha recebido.
  it('asks again for an unanswered withdrawal under the same reference', async () => {
    stale(WithdrawalStatusEnum.REQUESTED, [requested]);

    const result = await useCase.execute(INPUT);

    expect(payoutGateway.requestPayout).toHaveBeenCalledWith({
      reference: requested.publicId,
      amountCents: requested.amountCents,
      pixKeyType: requested.pixKeyType,
      pixKey: requested.pixKey,
      holderCpf: requested.affiliate.cpf,
    });
    expect(withdrawalRepository.markProcessing).toHaveBeenCalledWith(requested.publicId, 'batch-1');
    expect(result.retried).toBe(1);
  });

  it('takes a repeated request as accepted, without a batch', async () => {
    stale(WithdrawalStatusEnum.REQUESTED, [requested]);
    payoutGateway.requestPayout.mockResolvedValue({ batchId: null });

    await useCase.execute(INPUT);

    expect(withdrawalRepository.markProcessing).toHaveBeenCalledWith(requested.publicId, null);
  });

  // Só o primeiro pedido pode fechar como falho. Na repetição, o primeiro pode
  // ter sido aceito sem resposta — e a idempotência repetida, lida como recusa,
  // devolveria ao saldo vendas de um PIX que ainda vai cair.
  it('keeps a refused retry open and reports it, without giving the balance back', async () => {
    stale(WithdrawalStatusEnum.REQUESTED, [requested]);
    payoutGateway.requestPayout.mockRejectedValue(new PayoutRefusedError('Chave inexistente'));

    const result = await useCase.execute(INPUT);

    expect(withdrawalRepository.applyPayoutUpdate).not.toHaveBeenCalled();
    expect(withdrawalRepository.markProcessing).not.toHaveBeenCalled();
    expect(result.retried).toBe(0);
    expect(result.failed).toEqual([requested.publicId]);
  });

  it('leaves a retry for the next round while the provider is down, and goes on', async () => {
    const second = buildWithdrawal({ status: WithdrawalStatusEnum.REQUESTED });
    stale(WithdrawalStatusEnum.REQUESTED, [requested, second]);
    payoutGateway.requestPayout
      .mockRejectedValueOnce(new PayoutProviderUnavailableError())
      .mockResolvedValueOnce({ batchId: 'batch-2' });

    const result = await useCase.execute(INPUT);

    expect(withdrawalRepository.markProcessing).toHaveBeenCalledTimes(1);
    expect(withdrawalRepository.markProcessing).toHaveBeenCalledWith(second.publicId, 'batch-2');
    expect(result.retried).toBe(1);
  });

  // `listStale` devolve os mais antigos por `updatedAt`: a linha que a tentativa
  // não fecha precisa ir para o fim da fila, senão cinquenta presas travam os
  // saques mais novos atrás delas, rodada após rodada.
  it('claims each withdrawal before asking the provider again', async () => {
    stale(WithdrawalStatusEnum.REQUESTED, [requested]);
    payoutGateway.requestPayout.mockRejectedValue(new PayoutProviderUnavailableError());

    await useCase.execute(INPUT);

    expect(withdrawalRepository.claimForAttempt).toHaveBeenCalledWith(
      requested.publicId,
      WithdrawalStatusEnum.REQUESTED,
    );
    expect(withdrawalRepository.claimForAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      payoutGateway.requestPayout.mock.invocationCallOrder[0],
    );
  });

  // A lista foi lida sem lock, e a rodada pode levar minutos: um webhook pode ter
  // fechado o saque, e as vendas dele já estar em outro. Reenviar esse pedido
  // arriscaria pagar duas vezes.
  it('does not ask again for a withdrawal that changed since the listing', async () => {
    stale(WithdrawalStatusEnum.REQUESTED, [requested]);
    withdrawalRepository.claimForAttempt.mockResolvedValue(false);

    const result = await useCase.execute(INPUT);

    expect(payoutGateway.requestPayout).not.toHaveBeenCalled();
    expect(result).toEqual({ retried: 0, settled: 0, failed: [] });
  });

  it('claims a processing withdrawal before looking its batch up, and skips it once changed', async () => {
    stale(WithdrawalStatusEnum.PROCESSING, [processing]);
    withdrawalRepository.claimForAttempt.mockResolvedValue(false);

    await useCase.execute(INPUT);

    expect(withdrawalRepository.claimForAttempt).toHaveBeenCalledWith(
      processing.publicId,
      WithdrawalStatusEnum.PROCESSING,
    );
    expect(payoutGateway.findPayout).not.toHaveBeenCalled();
  });

  // Uma linha que quebra de um jeito imprevisto não pode derrubar os saques
  // que vêm depois dela na mesma rodada.
  it('collects an unexpected failure on a requested row without stopping the round', async () => {
    const second = buildWithdrawal({ status: WithdrawalStatusEnum.REQUESTED });
    withdrawalRepository.listStale.mockImplementation(async (input) => {
      if (input.status === WithdrawalStatusEnum.REQUESTED) return [requested, second];
      if (input.status === WithdrawalStatusEnum.PROCESSING) return [processing];
      return [];
    });
    payoutGateway.requestPayout
      .mockRejectedValueOnce(new Error('unexpected'))
      .mockResolvedValueOnce({ batchId: 'batch-2' });

    const result = await useCase.execute(INPUT);

    expect(withdrawalRepository.markProcessing).toHaveBeenCalledTimes(1);
    expect(withdrawalRepository.markProcessing).toHaveBeenCalledWith(second.publicId, 'batch-2');
    expect(payoutGateway.findPayout).toHaveBeenCalledWith('1426');
    expect(result.retried).toBe(1);
    expect(result.failed).toEqual([requested.publicId]);
  });

  it('settles a stale processing withdrawal from the provider batch, and tells the affiliate', async () => {
    stale(WithdrawalStatusEnum.PROCESSING, [processing]);
    payoutGateway.findPayout.mockResolvedValue({
      reference: 'whatever-the-provider-says',
      status: WithdrawalStatusEnum.PAID,
      providerStatus: 'FINALIZADO',
      providerTransferId: '60040',
      endToEndId: 'E123',
      receiptUrl: 'https://r',
      failureReason: null,
      payload: {},
    });
    withdrawalRepository.applyPayoutUpdate.mockResolvedValue({
      outcome: PayoutEventOutcomeEnum.APPLIED,
      withdrawal: { ...processing, status: WithdrawalStatusEnum.PAID },
    });

    const result = await useCase.execute(INPUT);

    expect(payoutGateway.findPayout).toHaveBeenCalledWith('1426');
    expect(withdrawalRepository.applyPayoutUpdate).toHaveBeenCalledWith({
      update: expect.objectContaining({
        reference: processing.publicId,
        status: WithdrawalStatusEnum.PAID,
      }),
      at: NOW,
      event: { source: PayoutEventSourceEnum.RECONCILIATION, eventId: null, receivedAt: NOW },
    });
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ template: MailTemplateEnum.WITHDRAWAL_PAID }),
    );
    expect(result.settled).toBe(1);
  });

  it('reports a settlement that diverges from a closed withdrawal, without telling the affiliate', async () => {
    stale(WithdrawalStatusEnum.PROCESSING, [processing]);
    payoutGateway.findPayout.mockResolvedValue({
      reference: processing.publicId,
      status: WithdrawalStatusEnum.PAID,
      providerStatus: 'FINALIZADO',
      providerTransferId: '60040',
      endToEndId: 'E123',
      receiptUrl: 'https://r',
      failureReason: null,
      payload: {},
    });
    withdrawalRepository.applyPayoutUpdate.mockResolvedValue({
      outcome: PayoutEventOutcomeEnum.DIVERGENT,
      withdrawal: { ...processing, status: WithdrawalStatusEnum.FAILED },
    });

    const result = await useCase.execute(INPUT);

    expect(mailer.send).not.toHaveBeenCalled();
    expect(result.settled).toBe(0);
    expect(result.failed).toEqual([processing.publicId]);
  });

  it('does not write anything while the provider still has the transfer on its way', async () => {
    stale(WithdrawalStatusEnum.PROCESSING, [processing]);
    payoutGateway.findPayout.mockResolvedValue({
      reference: processing.publicId,
      status: null,
      providerStatus: 'RECEBIDO',
      providerTransferId: null,
      endToEndId: null,
      receiptUrl: null,
      failureReason: null,
      payload: {},
    });

    await useCase.execute(INPUT);

    expect(withdrawalRepository.applyPayoutUpdate).not.toHaveBeenCalled();
  });

  // A queda do fornecedor é esperada: vai para a próxima rodada, e não para a
  // lista que o job loga como erro para alguém conferir.
  it('leaves a lookup for the next round while the provider is down, without reporting it', async () => {
    stale(WithdrawalStatusEnum.PROCESSING, [processing]);
    payoutGateway.findPayout.mockRejectedValue(new PayoutProviderUnavailableError());

    const result = await useCase.execute(INPUT);

    expect(withdrawalRepository.applyPayoutUpdate).not.toHaveBeenCalled();
    expect(result.failed).toEqual([]);
  });

  it('collects an unexpected failure from findPayout without stopping the round', async () => {
    const secondProcessing = buildWithdrawal({
      status: WithdrawalStatusEnum.PROCESSING,
      providerBatchId: '9000',
    });
    stale(WithdrawalStatusEnum.PROCESSING, [processing, secondProcessing]);
    payoutGateway.findPayout.mockRejectedValueOnce(new Error('unexpected')).mockResolvedValueOnce({
      reference: 'whatever-the-provider-says',
      status: WithdrawalStatusEnum.PAID,
      providerStatus: 'FINALIZADO',
      providerTransferId: '60041',
      endToEndId: 'E124',
      receiptUrl: 'https://r',
      failureReason: null,
      payload: {},
    });
    withdrawalRepository.applyPayoutUpdate.mockResolvedValue({
      outcome: PayoutEventOutcomeEnum.APPLIED,
      withdrawal: { ...secondProcessing, status: WithdrawalStatusEnum.PAID },
    });

    const result = await useCase.execute(INPUT);

    expect(result.settled).toBe(1);
    expect(result.failed).toEqual([processing.publicId]);
  });

  it('does nothing while payouts are off', async () => {
    payoutGateway.isEnabled.mockReturnValue(false);

    await useCase.execute(INPUT);

    expect(withdrawalRepository.listStale).not.toHaveBeenCalled();
  });
});
