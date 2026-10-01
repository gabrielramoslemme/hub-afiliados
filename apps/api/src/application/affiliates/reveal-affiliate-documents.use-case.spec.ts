import { PixKeyTypeEnum } from '@porto/contracts';
import {
  TooManyAttemptsError,
  UnknownAffiliateError,
  WrongPasswordError,
} from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { RevealAffiliateDocumentsUseCase } from './reveal-affiliate-documents.use-case';

describe('RevealAffiliateDocumentsUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let useCase: RevealAffiliateDocumentsUseCase;

  const NOW = new Date('2026-08-25T12:00:00.000Z');
  const user = buildUser({ password: '$2b$10$hashed' });
  const affiliate = buildAffiliate({
    user,
    cpf: '52998224725',
    rg: '12345678X',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'marina.ferraz@email.com',
  });
  const input = { userPublicId: user.publicId, currentPassword: 'SenhaNova!2026' };

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordHasher = passwordHasherMock();
    useCase = new RevealAffiliateDocumentsUseCase(userRepository, passwordHasher, clockMock(NOW));
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
  });

  it('answers the whole cpf, rg and pix key once the password confirms it', async () => {
    await expect(useCase.execute(input)).resolves.toEqual({
      cpf: '52998224725',
      rg: '12345678X',
      pixKey: 'marina.ferraz@email.com',
    });
    expect(passwordHasher.compare).toHaveBeenCalledWith('SenhaNova!2026', '$2b$10$hashed');
  });

  it('refuses a wrong password and counts it toward the lock', async () => {
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toThrow(WrongPasswordError);
    expect(userRepository.registerFailedPasswordAttempt).toHaveBeenCalledWith({
      userId: user.id,
      maxAttempts: 5,
      lockedUntil: new Date('2026-08-25T12:15:00.000Z'),
    });
  });

  // Sem a trava aqui, a rota viraria o caminho para adivinhar a senha de quem
  // deixou a sessão aberta, sem o limite que o login impõe.
  it('refuses a locked account before looking at the password', async () => {
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      passwordLockedUntil: new Date('2026-08-25T12:05:00.000Z'),
      affiliate,
    });

    await expect(useCase.execute(input)).rejects.toThrow(TooManyAttemptsError);
    expect(passwordHasher.compare).not.toHaveBeenCalled();
  });

  it('refuses an account that has no password to confirm with', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, password: null, affiliate });

    await expect(useCase.execute(input)).rejects.toThrow(WrongPasswordError);
    expect(passwordHasher.compare).not.toHaveBeenCalled();
  });

  it('refuses a token of a user without an affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(input)).rejects.toThrow(UnknownAffiliateError);
  });
});
