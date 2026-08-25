import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateDetail } from '@Domain/affiliates/affiliate.entity';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { GetAffiliateUseCase } from './get-affiliate.use-case';

describe('GetAffiliateUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let useCase: GetAffiliateUseCase;

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    useCase = new GetAffiliateUseCase(affiliateRepository);
  });

  it('answers the whole cpf and the pix key of the open registration', async () => {
    const user = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' });
    const affiliate: AffiliateDetail = {
      ...buildAffiliate({
        user,
        cpf: '52998224725',
        pixKeyType: PixKeyTypeEnum.CPF,
        pixKey: '52998224725',
      }),
      approvedBy: null,
    };
    affiliateRepository.findByPublicId.mockResolvedValue(affiliate);

    await expect(useCase.execute(affiliate.publicId)).resolves.toEqual({
      publicId: affiliate.publicId,
      name: 'Marina Ferraz',
      email: 'marina@email.com',
      maskedCpf: '***.***.247-25',
      cpf: '52998224725',
      pixKeyType: PixKeyTypeEnum.CPF,
      pixKey: '52998224725',
      status: AffiliateStatusEnum.PENDING_APPROVAL,
      approvedAt: null,
      approvedByName: null,
      rejectionReason: null,
      createdAt: new Date('2026-08-17T12:00:00Z'),
    });
  });

  it('names who decided', async () => {
    const approvedAt = new Date('2026-08-20T09:00:00Z');
    const approvedBy = buildAdminUser({ name: 'Analista Porto' });
    affiliateRepository.findByPublicId.mockResolvedValue({
      ...buildAffiliate({ status: AffiliateStatusEnum.APPROVED, approvedAt }),
      approvedBy,
    });

    const result = await useCase.execute('any-public-id');

    expect(result).toMatchObject({ approvedAt, approvedByName: 'Analista Porto' });
  });

  it('reports an affiliate that does not exist', async () => {
    await expect(useCase.execute('missing')).rejects.toThrow(AffiliateNotFoundError);
  });
});
