import { AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import {
  AccountInactiveError,
  InvalidCredentialsError,
  PasswordNotSetError,
} from '@Domain/auth/auth.errors';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { accessTokenIssuerMock } from '@Testing/mocks/services/access-token-issuer.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { AdminLoginUseCase } from './admin-login.use-case';

describe('AdminLoginUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let accessTokenIssuer: ReturnType<typeof accessTokenIssuerMock>;
  let clock: ReturnType<typeof clockMock>;
  let useCase: AdminLoginUseCase;

  const NOW = new Date('2026-08-25T12:00:00.000Z');
  const credentials = { email: 'analista@porto.example', password: 'MudarAgora!2026' };

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordHasher = passwordHasherMock();
    accessTokenIssuer = accessTokenIssuerMock();
    clock = clockMock(NOW);
    useCase = new AdminLoginUseCase(userRepository, passwordHasher, accessTokenIssuer, clock);
  });

  it('issues a token with the audience of the panel', async () => {
    const operator = buildAdminUser({ name: 'Analista Porto', email: credentials.email });
    userRepository.findByEmail.mockResolvedValue({ ...operator, affiliate: null });

    const result = await useCase.execute(credentials);

    expect(accessTokenIssuer.issue).toHaveBeenCalledWith({
      sub: operator.publicId,
      aud: AuthAudienceEnum.ADMIN,
      role: UserRoleEnum.PORTO_ANALYST,
      name: 'Analista Porto',
    });
    expect(result).toEqual({
      accessToken: 'signed.access.token',
      user: {
        publicId: operator.publicId,
        name: 'Analista Porto',
        email: credentials.email,
        role: UserRoleEnum.PORTO_ANALYST,
        shouldChangePassword: false,
      },
    });
  });

  it('records the login instant', async () => {
    const operator = buildAdminUser();
    userRepository.findByEmail.mockResolvedValue({ ...operator, affiliate: null });

    await useCase.execute(credentials);

    expect(userRepository.save).toHaveBeenCalledWith({
      id: operator.id,
      lastLoginAt: NOW,
    });
  });

  it('rejects an unknown email', async () => {
    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('answers the same error for an affiliate trying the panel', async () => {
    const affiliateUser = buildUser({ type: UserTypeEnum.AFFILIATE, password: '$2b$10$hashed' });
    userRepository.findByEmail.mockResolvedValue({ ...affiliateUser, affiliate: null });

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects a wrong password', async () => {
    userRepository.findByEmail.mockResolvedValue({ ...buildAdminUser(), affiliate: null });
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('reports an operator without a password', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...buildAdminUser({ password: null }),
      affiliate: null,
    });

    await expect(useCase.execute(credentials)).rejects.toThrow(PasswordNotSetError);
  });

  it('reports an inactive operator whose password checks out', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...buildAdminUser({ isActive: false }),
      affiliate: null,
    });

    await expect(useCase.execute(credentials)).rejects.toThrow(AccountInactiveError);
  });

  // Quem erra a senha não descobre que a conta existe e está desativada.
  it('does not reveal an inactive operator to a wrong password', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...buildAdminUser({ isActive: false }),
      affiliate: null,
    });
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  // O perfil é o que o painel autoriza: sem ele, o operador não tem o que fazer lá dentro.
  it('refuses an operator without a role', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...buildAdminUser({ role: null }),
      affiliate: null,
    });

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
    expect(accessTokenIssuer.issue).not.toHaveBeenCalled();
  });

  it('does not record a login that failed', async () => {
    userRepository.findByEmail.mockResolvedValue({ ...buildAdminUser(), affiliate: null });
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
    expect(userRepository.save).not.toHaveBeenCalled();
  });
});
