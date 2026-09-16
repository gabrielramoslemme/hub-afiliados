import { AuthAudienceEnum, TokenPurposeEnum } from '@porto/contracts';
import { InvalidResetTokenError } from '@Domain/auth/auth.errors';
import { UserEntity } from '@Domain/users/user.entity';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { passwordResetTokenRepositoryMock } from '@Testing/mocks/repositories/password-reset-token.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { tokenGeneratorMock } from '@Testing/mocks/services/token-generator.mock';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordResetTokenRepository: ReturnType<typeof passwordResetTokenRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let tokenGenerator: ReturnType<typeof tokenGeneratorMock>;
  let useCase: ResetPasswordUseCase;

  const affiliate = buildUser({ password: '$2b$10$antiga' });
  const input = {
    token: 'plain-token',
    password: 'SenhaNova!2026',
    audience: AuthAudienceEnum.AFFILIATE,
  };

  function usableToken(user: UserEntity) {
    return {
      id: 7,
      userId: user.id,
      tokenHash: 'hashed-token',
      purpose: TokenPurposeEnum.RESET_PASSWORD,
      expiresAt: new Date('2026-08-25T14:00:00.000Z'),
      usedAt: null,
      createdAt: new Date('2026-08-25T12:00:00.000Z'),
      user,
    };
  }

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordResetTokenRepository = passwordResetTokenRepositoryMock();
    passwordHasher = passwordHasherMock();
    tokenGenerator = tokenGeneratorMock();
    useCase = new ResetPasswordUseCase(
      userRepository,
      passwordResetTokenRepository,
      passwordHasher,
      tokenGenerator,
      clockMock(),
    );

    passwordResetTokenRepository.findUsable.mockResolvedValue(usableToken(affiliate));
  });

  it('looks the token up by its hash, and only among recovery ones', async () => {
    await useCase.execute(input);

    expect(tokenGenerator.hash).toHaveBeenCalledWith('plain-token');
    expect(passwordResetTokenRepository.findUsable).toHaveBeenCalledWith(
      'hashed-token',
      TokenPurposeEnum.RESET_PASSWORD,
    );
  });

  it('stores the new password hashed and stamps when it was set', async () => {
    await useCase.execute(input);

    expect(passwordHasher.hash).toHaveBeenCalledWith('SenhaNova!2026');
    expect(userRepository.save).toHaveBeenCalledWith({
      id: affiliate.id,
      password: '$2b$10$hashed',
      passwordSetAt: new Date('2026-08-25T12:00:00.000Z'),
      shouldChangePassword: false,
    });
  });

  it('burns the token so the link works exactly once', async () => {
    await useCase.execute(input);

    expect(passwordResetTokenRepository.markUsed).toHaveBeenCalledWith(7);
  });

  /*
    O link da aprovação ainda pode estar valendo, e ele escreve senha sem pedir
    a atual: deixá-lo vivo daria a quem alcançasse aquele e-mail antigo o poder
    de sobrescrever a senha que acabou de nascer.
  */
  it('kills a set-password link still outstanding', async () => {
    await useCase.execute(input);

    expect(passwordResetTokenRepository.invalidateAllFor).toHaveBeenCalledWith(
      affiliate.id,
      TokenPurposeEnum.SET_PASSWORD,
    );
  });

  it('refuses a token that is used, expired or forged', async () => {
    passwordResetTokenRepository.findUsable.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidResetTokenError);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  /*
    Mesma resposta de um link vencido, de propósito: dizer "este link é do outro
    canal" confirmaria que o e-mail tem conta de operador.
  */
  it('refuses an operator token on the affiliate channel', async () => {
    passwordResetTokenRepository.findUsable.mockResolvedValue(usableToken(buildAdminUser()));

    await expect(useCase.execute(input)).rejects.toThrow(InvalidResetTokenError);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('refuses an affiliate token on the panel channel', async () => {
    await expect(useCase.execute({ ...input, audience: AuthAudienceEnum.ADMIN })).rejects.toThrow(
      InvalidResetTokenError,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('accepts an operator token on the panel channel', async () => {
    const admin = buildAdminUser();
    passwordResetTokenRepository.findUsable.mockResolvedValue(usableToken(admin));

    await useCase.execute({ ...input, audience: AuthAudienceEnum.ADMIN });

    expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: admin.id }));
  });

  it('does not burn the token when the password write fails', async () => {
    userRepository.save.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(input)).rejects.toThrow('boom');
    expect(passwordResetTokenRepository.markUsed).not.toHaveBeenCalled();
  });
});
