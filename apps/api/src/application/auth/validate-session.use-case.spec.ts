import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { SessionRevokedError } from '@Domain/auth/auth.errors';
import { buildAdminUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { ValidateSessionUseCase } from './validate-session.use-case';

describe('ValidateSessionUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let useCase: ValidateSessionUseCase;

  const operator = buildAdminUser({
    name: 'Analista Porto',
    role: UserRoleEnum.PORTO_ADMIN,
    tokenVersion: 3,
  });
  const claims = {
    sub: operator.publicId,
    aud: AuthAudienceEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    name: 'Nome antigo',
    ver: 3,
  };

  beforeEach(() => {
    userRepository = userRepositoryMock();
    useCase = new ValidateSessionUseCase(userRepository);
    userRepository.findByPublicId.mockResolvedValue({ ...operator, affiliate: null });
  });

  // Perfil e nome valem o que está gravado agora: rebaixar alguém não espera o
  // token dele vencer.
  it('answers the claims with the role and the name stored now', async () => {
    await expect(useCase.execute(claims)).resolves.toEqual({
      ...claims,
      role: UserRoleEnum.PORTO_ADMIN,
      name: 'Analista Porto',
    });
  });

  it('refuses a token issued before the sessions of the account were revoked', async () => {
    await expect(useCase.execute({ ...claims, ver: 2 })).rejects.toThrow(SessionRevokedError);
  });

  it('refuses the token of a deactivated account at once', async () => {
    userRepository.findByPublicId.mockResolvedValue({
      ...operator,
      isActive: false,
      affiliate: null,
    });

    await expect(useCase.execute(claims)).rejects.toThrow(SessionRevokedError);
  });

  it('refuses the token of a user that is gone', async () => {
    userRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(claims)).rejects.toThrow(SessionRevokedError);
  });
});
