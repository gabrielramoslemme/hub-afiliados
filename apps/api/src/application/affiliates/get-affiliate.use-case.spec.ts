import { PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { GetAffiliateUseCase } from './get-affiliate.use-case';

describe('GetAffiliateUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let useCase: GetAffiliateUseCase;

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    useCase = new GetAffiliateUseCase(affiliateRepository);
  });

  // A listagem só mostra o CPF mascarado; quem abre o cadastro para decidir precisa dele inteiro.
  it('answers the whole cpf and pix key to whoever opens the registration', async () => {
    const affiliate = buildAffiliate({
      cpf: '52998224725',
      pixKeyType: PixKeyTypeEnum.CPF,
      pixKey: '52998224725',
    });
    affiliateRepository.findByPublicId.mockResolvedValue({ ...affiliate, approvedBy: null });

    await expect(useCase.execute(affiliate.publicId)).resolves.toMatchObject({
      cpf: '52998224725',
      maskedCpf: '***.***.247-25',
      pixKey: '52998224725',
    });
  });

  it('reports an affiliate that does not exist', async () => {
    await expect(useCase.execute('missing')).rejects.toThrow(AffiliateNotFoundError);
  });
});
