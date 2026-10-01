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

  const NOW = new Date('2026-08-25T12:00:00.000Z');
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
      clockMock(NOW),
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

  it('redeems the link into the new password, hashed and stamped', async () => {
    await useCase.execute(input);

    expect(passwordHasher.hash).toHaveBeenCalledWith('SenhaNova!2026');
    expect(passwordResetTokenRepository.redeem).toHaveBeenCalledWith({
      tokenId: 7,
      userId: affiliate.id,
      passwordHash: '$2b$10$hashed',
      passwordSetAt: NOW,
    });
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
    expect(passwordResetTokenRepository.redeem).not.toHaveBeenCalled();
  });

  /*
    Mesma resposta de um link vencido, de propósito: dizer "este link é do outro
    canal" confirmaria que o e-mail tem conta de operador.
  */
  it('refuses an operator token on the affiliate channel', async () => {
    passwordResetTokenRepository.findUsable.mockResolvedValue(usableToken(buildAdminUser()));

    await expect(useCase.execute(input)).rejects.toThrow(InvalidResetTokenError);
    expect(passwordResetTokenRepository.redeem).not.toHaveBeenCalled();
  });

  it('refuses an affiliate token on the panel channel', async () => {
    await expect(useCase.execute({ ...input, audience: AuthAudienceEnum.ADMIN })).rejects.toThrow(
      InvalidResetTokenError,
    );
    expect(passwordResetTokenRepository.redeem).not.toHaveBeenCalled();
  });

  it('accepts an operator token on the panel channel', async () => {
    const admin = buildAdminUser();
    passwordResetTokenRepository.findUsable.mockResolvedValue(usableToken(admin));

    await useCase.execute({ ...input, audience: AuthAudienceEnum.ADMIN });

    expect(passwordResetTokenRepository.redeem).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.id }),
    );
  });

  // Dois pedidos com o mesmo link chegam juntos: só o resgate, no banco, decide
  // qual grava a senha — e o perdedor não encerra sessão nem mata link nenhum.
  it('refuses a link another request redeemed first, touching nothing else', async () => {
    passwordResetTokenRepository.redeem.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidResetTokenError);
    expect(userRepository.revokeSessions).not.toHaveBeenCalled();
    expect(passwordResetTokenRepository.invalidateAllFor).not.toHaveBeenCalled();
  });

  // O link pode ter sido pedido por quem desconfia que a conta foi tomada: a
  // senha nova encerra as sessões abertas com a antiga.
  it('ends every session open with the previous password', async () => {
    await useCase.execute(input);

    expect(userRepository.revokeSessions).toHaveBeenCalledWith(affiliate.id);
  });
});
