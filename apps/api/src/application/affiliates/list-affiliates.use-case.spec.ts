import { AffiliateStatusEnum } from '@porto/contracts';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { ListAffiliatesInput, ListAffiliatesUseCase } from './list-affiliates.use-case';

describe('ListAffiliatesUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let useCase: ListAffiliatesUseCase;

  const input: ListAffiliatesInput = {
    page: 1,
    limit: 10,
    status: null,
    search: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    useCase = new ListAffiliatesUseCase(affiliateRepository);
  });

  it('masks the cpf and never carries it whole', async () => {
    const user = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' });
    affiliateRepository.search.mockResolvedValue({
      rows: [buildAffiliate({ user, cpf: '52998224725' })],
      total: 1,
    });

    const result = await useCase.execute(input);

    expect(result.data[0]).toEqual({
      publicId: expect.any(String),
      name: 'Marina Ferraz',
      email: 'marina@email.com',
      maskedCpf: '***.***.247-25',
      status: AffiliateStatusEnum.PENDING_APPROVAL,
      createdAt: new Date('2026-08-17T12:00:00Z'),
    });
    expect(JSON.stringify(result)).not.toContain('52998224725');
  });

  it('passes the criteria through to the repository', async () => {
    await useCase.execute({
      ...input,
      page: 3,
      status: AffiliateStatusEnum.APPROVED,
      search: 'ana',
    });

    expect(affiliateRepository.search).toHaveBeenCalledWith({
      page: 3,
      limit: 10,
      status: AffiliateStatusEnum.APPROVED,
      search: 'ana',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('answers the page it was asked for, with the total of the whole slice', async () => {
    affiliateRepository.search.mockResolvedValue({ rows: [], total: 42 });

    await expect(useCase.execute({ ...input, page: 2, limit: 5 })).resolves.toEqual({
      data: [],
      total: 42,
      page: 2,
      limit: 5,
    });
  });
});
