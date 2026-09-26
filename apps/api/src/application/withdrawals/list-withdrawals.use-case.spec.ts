import { WithdrawalStatusEnum } from '@porto/contracts';
import { buildWithdrawal } from '@Testing/factories/withdrawal.factory';
import { withdrawalRepositoryMock } from '@Testing/mocks/repositories/withdrawal.repository.mock';
import { ListWithdrawalsUseCase } from './list-withdrawals.use-case';

describe('ListWithdrawalsUseCase', () => {
  const input = {
    page: 2,
    limit: 10,
    status: WithdrawalStatusEnum.PAID,
    search: 'marina',
    requestedFrom: new Date('2026-09-01T03:00:00Z'),
    requestedUntil: new Date('2026-10-01T03:00:00Z'),
  };

  it('passes the filters through and never lets the full cpf out of a list row', async () => {
    const withdrawalRepository = withdrawalRepositoryMock();
    withdrawalRepository.search.mockResolvedValue({
      data: [buildWithdrawal({ paidAt: new Date('2026-09-25T12:05:00Z') })],
      total: 11,
      page: 2,
      limit: 10,
    });

    const output = await new ListWithdrawalsUseCase(withdrawalRepository).execute(input);

    expect(withdrawalRepository.search).toHaveBeenCalledWith(input);
    expect(output.total).toBe(11);
    expect(output.data[0]).toEqual(
      expect.objectContaining({ affiliateName: 'Marina Ferraz', maskedCpf: '***.***.247-25' }),
    );
    expect(JSON.stringify(output)).not.toContain('52998224725');
    expect(JSON.stringify(output)).not.toContain('pix.marina@email.com');
  });
});
