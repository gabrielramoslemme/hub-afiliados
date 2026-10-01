import { TokenPurposeEnum } from '@porto/contracts';
import { InvalidResetTokenError } from '@Domain/auth/auth.errors';
import { buildUser } from '@Testing/factories/user.factory';
import { passwordResetTokenRepositoryMock } from '@Testing/mocks/repositories/password-reset-token.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { tokenGeneratorMock } from '@Testing/mocks/services/token-generator.mock';
import { SetPasswordUseCase } from './set-password.use-case';

describe('SetPasswordUseCase', () => {
  let passwordResetTokenRepository: ReturnType<typeof passwordResetTokenRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let tokenGenerator: ReturnType<typeof tokenGeneratorMock>;
  let clock: ReturnType<typeof clockMock>;
  let useCase: SetPasswordUseCase;

  const NOW = new Date('2026-08-25T12:00:00.000Z');
  const user = buildUser({ password: null });
  const input = { token: 'plain-token', password: 'SenhaNova!2026' };

  beforeEach(() => {
    passwordResetTokenRepository = passwordResetTokenRepositoryMock();
    passwordHasher = passwordHasherMock();
    tokenGenerator = tokenGeneratorMock();
    clock = clockMock(NOW);
    useCase = new SetPasswordUseCase(
      passwordResetTokenRepository,
      passwordHasher,
      tokenGenerator,
      clock,
    );

    passwordResetTokenRepository.findUsable.mockResolvedValue({
      id: 7,
      userId: user.id,
      tokenHash: 'hashed-token',
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: new Date('2026-08-27T12:00:00.000Z'),
      usedAt: null,
      createdAt: new Date('2026-08-25T12:00:00.000Z'),
      user,
    });
  });

  it('looks the token up by its hash, never by the value in the link', async () => {
    await useCase.execute(input);

    expect(tokenGenerator.hash).toHaveBeenCalledWith('plain-token');
    expect(passwordResetTokenRepository.findUsable).toHaveBeenCalledWith(
      'hashed-token',
      TokenPurposeEnum.SET_PASSWORD,
    );
  });

  it('redeems the link into the password, hashed and stamped', async () => {
    await useCase.execute(input);

    expect(passwordHasher.hash).toHaveBeenCalledWith('SenhaNova!2026');
    expect(passwordResetTokenRepository.redeem).toHaveBeenCalledWith({
      tokenId: 7,
      userId: user.id,
      passwordHash: '$2b$10$hashed',
      passwordSetAt: NOW,
    });
  });

  it('refuses a token that is used, expired or forged', async () => {
    passwordResetTokenRepository.findUsable.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidResetTokenError);
    expect(passwordResetTokenRepository.redeem).not.toHaveBeenCalled();
  });

  // Dois pedidos com o mesmo link chegam juntos: os dois acham o token usável, e
  // só o resgate, no banco, decide qual grava a senha.
  it('refuses a link another request redeemed first', async () => {
    passwordResetTokenRepository.redeem.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidResetTokenError);
  });
});
