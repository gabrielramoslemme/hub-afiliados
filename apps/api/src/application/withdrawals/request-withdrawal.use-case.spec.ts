import { PixKeyTypeEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import {
  BalanceChangedError,
  NoBalanceToWithdrawError,
  PayoutProviderAccessDeniedError,
  PayoutProviderUnavailableError,
  PayoutRefusedError,
  PayoutsDisabledError,
} from '@Domain/withdrawals/withdrawals.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { buildWithdrawal } from '@Testing/factories/withdrawal.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { withdrawalRepositoryMock } from '@Testing/mocks/repositories/withdrawal.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { payoutGatewayMock } from '@Testing/mocks/services/payout-gateway.mock';
import { RequestWithdrawalUseCase } from './request-withdrawal.use-case';

describe('RequestWithdrawalUseCase', () => {
  const NOW = new Date('2026-09-25T15:00:00.000Z');

  let userRepository: ReturnType<typeof userRepositoryMock>;
  let withdrawalRepository: ReturnType<typeof withdrawalRepositoryMock>;
  let payoutGateway: ReturnType<typeof payoutGatewayMock>;
  let useCase: RequestWithdrawalUseCase;

  const user = buildUser();
  const affiliate = buildAffiliate({
    user,
    cpf: '52998224725',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'pix.marina@email.com',
    coupon: buildCoupon({ id: 7 }),
  });
  const reserved = buildWithdrawal({ affiliateId: affiliate.id, amountCents: 4000 });
  const INPUT = { userPublicId: user.publicId, expectedCents: 4000 };

  beforeEach(() => {
    userRepository = userRepositoryMock();
    withdrawalRepository = withdrawalRepositoryMock();
    payoutGateway = payoutGatewayMock();
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
    withdrawalRepository.reserve.mockResolvedValue({ withdrawal: reserved, availableCents: 4000 });
    useCase = new RequestWithdrawalUseCase(
      userRepository,
      withdrawalRepository,
      payoutGateway,
      clockMock(NOW),
    );
  });

  it('reserves the balance, then asks the provider to pay it under the withdrawal reference', async () => {
    const output = await useCase.execute(INPUT);

    expect(withdrawalRepository.reserve).toHaveBeenCalledWith({
      affiliateId: affiliate.id,
      couponId: 7,
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'pix.marina@email.com',
      expectedCents: 4000,
      requestedAt: NOW,
    });
    expect(payoutGateway.requestPayout).toHaveBeenCalledWith({
      reference: reserved.publicId,
      amountCents: 4000,
      pixKeyType: reserved.pixKeyType,
      pixKey: reserved.pixKey,
      holderCpf: '52998224725',
    });
    expect(withdrawalRepository.markProcessing).toHaveBeenCalledWith(reserved.publicId, 'batch-1');
    expect(output).toEqual({
      publicId: reserved.publicId,
      status: WithdrawalStatusEnum.PROCESSING,
      amountCents: 4000,
      requestedAt: reserved.requestedAt,
    });
  });

  // A ordem é a regra: o PIX só sai de um saque já gravado. Ao contrário, um
  // commit que falhasse depois do PIX devolveria ao saldo dinheiro já pago.
  it('only calls the provider after the reservation is committed', async () => {
    await useCase.execute(INPUT);

    const [reserveOrder] = withdrawalRepository.reserve.mock.invocationCallOrder;
    const [payoutOrder] = payoutGateway.requestPayout.mock.invocationCallOrder;
    expect(reserveOrder).toBeLessThan(payoutOrder);
  });

  it('refuses without balance and never calls the provider', async () => {
    withdrawalRepository.reserve.mockResolvedValue({ withdrawal: null, availableCents: 0 });

    await expect(useCase.execute(INPUT)).rejects.toThrow(NoBalanceToWithdrawError);
    expect(payoutGateway.requestPayout).not.toHaveBeenCalled();
  });

  // A pessoa confirmou um valor na tela e o saque não se desfaz: se o saldo
  // mudou nesse meio-tempo, ela precisa ver o novo antes de o PIX sair.
  it('refuses a balance different from the one the affiliate confirmed, and never calls the provider', async () => {
    withdrawalRepository.reserve.mockResolvedValue({ withdrawal: null, availableCents: 5500 });

    await expect(useCase.execute(INPUT)).rejects.toThrow(BalanceChangedError);
    expect(payoutGateway.requestPayout).not.toHaveBeenCalled();
  });

  it('refuses an affiliate still without a coupon before touching the balance', async () => {
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      affiliate: { ...affiliate, coupon: null },
    });

    await expect(useCase.execute(INPUT)).rejects.toThrow(NoBalanceToWithdrawError);
    expect(withdrawalRepository.reserve).not.toHaveBeenCalled();
  });

  it('refuses when payouts are off in this environment, before reserving anything', async () => {
    payoutGateway.isEnabled.mockReturnValue(false);

    await expect(useCase.execute(INPUT)).rejects.toThrow(PayoutsDisabledError);
    expect(withdrawalRepository.reserve).not.toHaveBeenCalled();
  });

  it('closes the withdrawal as failed and gives the balance back when the provider refuses', async () => {
    payoutGateway.requestPayout.mockRejectedValue(new PayoutRefusedError('Chave inexistente'));

    await expect(useCase.execute(INPUT)).rejects.toThrow(PayoutRefusedError);
    expect(withdrawalRepository.applyPayoutUpdate).toHaveBeenCalledWith({
      update: expect.objectContaining({
        reference: reserved.publicId,
        status: WithdrawalStatusEnum.FAILED,
        failureReason: 'Chave inexistente',
      }),
      at: NOW,
      event: null,
    });
    expect(withdrawalRepository.markProcessing).not.toHaveBeenCalled();
  });

  // Sem resposta não se sabe se o PIX saiu: soltar as vendas aqui deixaria o
  // afiliado sacar de novo o que pode já ter sido pago.
  it.each([
    ['unavailable', new PayoutProviderUnavailableError()],
    ['access denied', new PayoutProviderAccessDeniedError()],
  ])('keeps the withdrawal requested when the provider is %s', async (_case, error) => {
    payoutGateway.requestPayout.mockRejectedValue(error);

    const output = await useCase.execute(INPUT);

    expect(output.status).toBe(WithdrawalStatusEnum.REQUESTED);
    expect(withdrawalRepository.applyPayoutUpdate).not.toHaveBeenCalled();
    expect(withdrawalRepository.markProcessing).not.toHaveBeenCalled();
  });

  it('refuses a token whose user has no affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(INPUT)).rejects.toThrow(UnknownAffiliateError);
  });
});
