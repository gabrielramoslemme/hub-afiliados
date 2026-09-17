import { TokenPurposeEnum } from '@porto/contracts';
import { InvalidResetTokenError } from '@Domain/auth/auth.errors';
import { buildUser } from '@Testing/factories/user.factory';
import { passwordResetTokenRepositoryMock } from '@Testing/mocks/repositories/password-reset-token.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { tokenGeneratorMock } from '@Testing/mocks/services/token-generator.mock';
import { SetPasswordUseCase } from './set-password.use-case';

describe('SetPasswordUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordResetTokenRepository: ReturnType<typeof passwordResetTokenRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let tokenGenerator: ReturnType<typeof tokenGeneratorMock>;
  let clock: ReturnType<typeof clockMock>;
  let useCase: SetPasswordUseCase;

  const NOW = new Date('2026-08-25T12:00:00.000Z');
  const user = buildUser({ password: null });
  const input = { token: 'plain-token', password: 'SenhaNova!2026' };

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordResetTokenRepository = passwordResetTokenRepositoryMock();
    passwordHasher = passwordHasherMock();
    tokenGenerator = tokenGeneratorMock();
    clock = clockMock(NOW);
    useCase = new SetPasswordUseCase(
      userRepository,
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

  it('stores the password hashed and stamps when it was set', async () => {
    await useCase.execute(input);

    expect(passwordHasher.hash).toHaveBeenCalledWith('SenhaNova!2026');
    expect(userRepository.save).toHaveBeenCalledWith({
      id: user.id,
      password: '$2b$10$hashed',
      passwordSetAt: NOW,
      shouldChangePassword: false,
    });
  });

  it('burns the token so the link works exactly once', async () => {
    await useCase.execute(input);

    expect(passwordResetTokenRepository.markUsed).toHaveBeenCalledWith(7);
  });

  it('refuses a token that is used, expired or forged', async () => {
    passwordResetTokenRepository.findUsable.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidResetTokenError);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('does not burn the token when the password write fails', async () => {
    userRepository.save.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(input)).rejects.toThrow('boom');
    expect(passwordResetTokenRepository.markUsed).not.toHaveBeenCalled();
  });
});
