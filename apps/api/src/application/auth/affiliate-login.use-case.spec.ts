import { AffiliateStatusEnum, AuthAudienceEnum, UserTypeEnum } from '@porto/contracts';
import {
  AccountInactiveError,
  InvalidCredentialsError,
  PasswordNotSetError,
  RegistrationRejectedError,
  RegistrationUnderReviewError,
} from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { accessTokenIssuerMock } from '@Testing/mocks/services/access-token-issuer.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { AffiliateLoginUseCase } from './affiliate-login.use-case';

describe('AffiliateLoginUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let accessTokenIssuer: ReturnType<typeof accessTokenIssuerMock>;
  let clock: ReturnType<typeof clockMock>;
  let useCase: AffiliateLoginUseCase;

  const credentials = { email: 'marina@email.com', password: 'SenhaNova!2026' };

  function signedUp(status: AffiliateStatusEnum) {
    const user = buildUser({
      name: 'Marina Ferraz',
      email: credentials.email,
      password: '$2b$10$hashed',
      type: UserTypeEnum.AFFILIATE,
    });

    return {
      ...user,
      affiliate: buildAffiliate({
        user,
        status,
        coupon: status === AffiliateStatusEnum.APPROVED ? buildCoupon({ code: 'MARINA25' }) : null,
      }),
    };
  }

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordHasher = passwordHasherMock();
    accessTokenIssuer = accessTokenIssuerMock();
    clock = clockMock();
    useCase = new AffiliateLoginUseCase(userRepository, passwordHasher, accessTokenIssuer, clock);
  });

  it('issues a token with the audience of the affiliate portal', async () => {
    const account = signedUp(AffiliateStatusEnum.APPROVED);
    userRepository.findByEmail.mockResolvedValue(account);

    const result = await useCase.execute(credentials);

    expect(accessTokenIssuer.issue).toHaveBeenCalledWith({
      sub: account.publicId,
      aud: AuthAudienceEnum.AFFILIATE,
      role: null,
      name: 'Marina Ferraz',
    });
    expect(result).toEqual({
      accessToken: 'signed.access.token',
      user: {
        publicId: account.affiliate.publicId,
        name: 'Marina Ferraz',
        email: credentials.email,
        status: AffiliateStatusEnum.APPROVED,
        coupon: 'MARINA25',
      },
    });
  });

  it('holds back a registration still under review', async () => {
    userRepository.findByEmail.mockResolvedValue(signedUp(AffiliateStatusEnum.PENDING_APPROVAL));

    await expect(useCase.execute(credentials)).rejects.toThrow(RegistrationUnderReviewError);
  });

  it('holds back a rejected registration', async () => {
    userRepository.findByEmail.mockResolvedValue(signedUp(AffiliateStatusEnum.REJECTED));

    await expect(useCase.execute(credentials)).rejects.toThrow(RegistrationRejectedError);
  });

  it('holds back an account that was deactivated', async () => {
    const account = signedUp(AffiliateStatusEnum.APPROVED);
    userRepository.findByEmail.mockResolvedValue({ ...account, isActive: false });

    await expect(useCase.execute(credentials)).rejects.toThrow(AccountInactiveError);
  });

  it('reveals the status only after the password checks out', async () => {
    userRepository.findByEmail.mockResolvedValue(signedUp(AffiliateStatusEnum.REJECTED));
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('reports an affiliate that has not created a password yet', async () => {
    const account = signedUp(AffiliateStatusEnum.APPROVED);
    userRepository.findByEmail.mockResolvedValue({ ...account, password: null });

    await expect(useCase.execute(credentials)).rejects.toThrow(PasswordNotSetError);
  });

  it('answers the credential error for an operator trying the affiliate portal', async () => {
    userRepository.findByEmail.mockResolvedValue({ ...buildAdminUser(), affiliate: null });

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects an unknown email', async () => {
    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('records the login instant', async () => {
    const account = signedUp(AffiliateStatusEnum.APPROVED);
    userRepository.findByEmail.mockResolvedValue(account);

    await useCase.execute(credentials);

    expect(userRepository.save).toHaveBeenCalledWith({
      id: account.id,
      lastLoginAt: new Date('2026-08-25T12:00:00.000Z'),
    });
  });
});
