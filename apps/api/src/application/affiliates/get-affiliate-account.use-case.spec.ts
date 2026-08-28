import { AffiliateStatusEnum, PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { GetAffiliateAccountUseCase } from './get-affiliate-account.use-case';

describe('GetAffiliateAccountUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let useCase: GetAffiliateAccountUseCase;

  const user = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' });
  const affiliate = buildAffiliate({
    user,
    cpf: '52998224725',
    rg: '12345678X',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'marina.ferraz@email.com',
    status: AffiliateStatusEnum.APPROVED,
    socialNetwork: SocialNetworkEnum.TIKTOK,
    socialHandle: 'marina.ferraz',
  });

  beforeEach(() => {
    userRepository = userRepositoryMock();
    useCase = new GetAffiliateAccountUseCase(userRepository);
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
  });

  it('answers the account of the person behind the token', async () => {
    await expect(useCase.execute(user.publicId)).resolves.toEqual({
      publicId: affiliate.publicId,
      name: 'Marina Ferraz',
      email: 'marina@email.com',
      maskedCpf: '***.***.247-25',
      maskedRg: '*****678X',
      socialNetwork: SocialNetworkEnum.TIKTOK,
      socialHandle: 'marina.ferraz',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      maskedPixKey: 'ma***********@email.com',
      status: AffiliateStatusEnum.APPROVED,
      coupon: null,
      createdAt: new Date('2026-08-17T12:00:00Z'),
    });
  });

  it('never carries the whole cpf, the whole rg or the whole pix key', async () => {
    const account = await useCase.execute(user.publicId);

    expect(JSON.stringify(account)).not.toContain('52998224725');
    expect(JSON.stringify(account)).not.toContain('12345678X');
    expect(JSON.stringify(account)).not.toContain('marina.ferraz@email.com');
  });

  it('refuses a token of a user that is gone', async () => {
    userRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(user.publicId)).rejects.toThrow(UnknownAffiliateError);
  });

  it('refuses a user without an affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(user.publicId)).rejects.toThrow(UnknownAffiliateError);
  });
});
