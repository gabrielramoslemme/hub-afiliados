import {
  AffiliateStatusEnum,
  AuthAudienceEnum,
  UserRoleEnum,
  UserTypeEnum,
} from '@porto/contracts';
import {
  AccountInactiveError,
  InvalidCredentialsError,
  PasswordNotSetError,
  RegistrationRejectedError,
  RegistrationUnderReviewError,
  TooManyAttemptsError,
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

  const NOW = new Date('2026-08-25T12:00:00.000Z');
  const credentials = { email: 'marina@email.com', password: 'SenhaNova!2026' };

  function signedUp(status: AffiliateStatusEnum) {
    const user = buildUser({
      name: 'Marina Ferraz',
      email: credentials.email,
      password: '$2b$10$hashed',
      type: UserTypeEnum.AFFILIATE,
      role: UserRoleEnum.AFFILIATE,
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
    clock = clockMock(NOW);
    useCase = new AffiliateLoginUseCase(userRepository, passwordHasher, accessTokenIssuer, clock);
  });

  it('issues a token with the audience and the role of the affiliate portal', async () => {
    const account = signedUp(AffiliateStatusEnum.APPROVED);
    userRepository.findByEmail.mockResolvedValue(account);

    const result = await useCase.execute(credentials);

    expect(accessTokenIssuer.issue).toHaveBeenCalledWith({
      sub: account.publicId,
      aud: AuthAudienceEnum.AFFILIATE,
      role: UserRoleEnum.AFFILIATE,
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

  // Situação do cadastro e conta desativada só aparecem para quem acertou a
  // senha: antes disso, a resposta contaria que aquele e-mail tem conta.
  it.each([
    ['a rejected registration', signedUp(AffiliateStatusEnum.REJECTED)],
    ['a deactivated account', { ...signedUp(AffiliateStatusEnum.APPROVED), isActive: false }],
  ])('does not reveal %s to a wrong password', async (_label, account) => {
    userRepository.findByEmail.mockResolvedValue(account);
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

    expect(userRepository.save).toHaveBeenCalledWith({ id: account.id, lastLoginAt: NOW });
  });

  it('does not record the login of a registration it holds back', async () => {
    userRepository.findByEmail.mockResolvedValue(signedUp(AffiliateStatusEnum.PENDING_APPROVAL));

    await expect(useCase.execute(credentials)).rejects.toThrow(RegistrationUnderReviewError);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  describe('lockout after repeated wrong passwords', () => {
    const FIFTEEN_MINUTES_LATER = new Date('2026-08-25T12:15:00.000Z');

    it('refuses a locked account before looking at the password, even the right one', async () => {
      const account = signedUp(AffiliateStatusEnum.APPROVED);
      userRepository.findByEmail.mockResolvedValue({
        ...account,
        passwordLockedUntil: new Date('2026-08-25T12:00:01.000Z'),
      });

      await expect(useCase.execute(credentials)).rejects.toThrow(TooManyAttemptsError);
      expect(passwordHasher.compare).not.toHaveBeenCalled();
      expect(accessTokenIssuer.issue).not.toHaveBeenCalled();
    });

    it('lets the right password in once the lock has run out', async () => {
      const account = signedUp(AffiliateStatusEnum.APPROVED);
      userRepository.findByEmail.mockResolvedValue({ ...account, passwordLockedUntil: NOW });

      await expect(useCase.execute(credentials)).resolves.toMatchObject({
        accessToken: 'signed.access.token',
      });
    });

    it('counts a wrong password toward a fifteen-minute lock at the fifth one', async () => {
      const account = signedUp(AffiliateStatusEnum.APPROVED);
      userRepository.findByEmail.mockResolvedValue(account);
      passwordHasher.compare.mockResolvedValue(false);

      await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
      expect(userRepository.registerFailedPasswordAttempt).toHaveBeenCalledWith({
        userId: account.id,
        maxAttempts: 5,
        lockedUntil: FIFTEEN_MINUTES_LATER,
      });
    });

    it('clears the count of wrong passwords when the right one comes', async () => {
      const account = signedUp(AffiliateStatusEnum.APPROVED);
      userRepository.findByEmail.mockResolvedValue({ ...account, failedPasswordAttempts: 3 });

      await useCase.execute(credentials);

      expect(userRepository.save).toHaveBeenCalledWith({
        id: account.id,
        failedPasswordAttempts: 0,
        passwordLockedUntil: null,
      });
      expect(userRepository.registerFailedPasswordAttempt).not.toHaveBeenCalled();
    });
  });
});
