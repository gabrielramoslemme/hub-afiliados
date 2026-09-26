import { WithdrawalNotFoundError } from '@Domain/withdrawals/withdrawals.errors';
import { buildWithdrawal } from '@Testing/factories/withdrawal.factory';
import { payoutEventRepositoryMock } from '@Testing/mocks/repositories/payout-event.repository.mock';
import { saleRepositoryMock } from '@Testing/mocks/repositories/sale.repository.mock';
import { withdrawalRepositoryMock } from '@Testing/mocks/repositories/withdrawal.repository.mock';
import { GetWithdrawalUseCase } from './get-withdrawal.use-case';

describe('GetWithdrawalUseCase', () => {
  let withdrawalRepository: ReturnType<typeof withdrawalRepositoryMock>;
  let saleRepository: ReturnType<typeof saleRepositoryMock>;
  let payoutEventRepository: ReturnType<typeof payoutEventRepositoryMock>;
  let useCase: GetWithdrawalUseCase;

  beforeEach(() => {
    withdrawalRepository = withdrawalRepositoryMock();
    saleRepository = saleRepositoryMock();
    payoutEventRepository = payoutEventRepositoryMock();
    useCase = new GetWithdrawalUseCase(withdrawalRepository, saleRepository, payoutEventRepository);
  });

  it('refuses a withdrawal that does not exist', async () => {
    await expect(useCase.execute('40000000-0000-4000-8000-000000000099')).rejects.toThrow(
      WithdrawalNotFoundError,
    );
  });

  // Conferir pede o tipo, o final e o identificador do PIX — não a chave inteira.
  it('masks the pix key even in the detail, and loads the sales and trail of this withdrawal', async () => {
    const withdrawal = buildWithdrawal({ id: 42 });
    withdrawalRepository.findByPublicId.mockResolvedValue(withdrawal);

    const output = await useCase.execute(withdrawal.publicId);

    expect(output.maskedPixKey).not.toBe(withdrawal.pixKey);
    expect(JSON.stringify(output)).not.toContain('pix.marina@email.com');
    expect(saleRepository.listByWithdrawal).toHaveBeenCalledWith(42);
    expect(payoutEventRepository.listByWithdrawal).toHaveBeenCalledWith(42);
  });
});
