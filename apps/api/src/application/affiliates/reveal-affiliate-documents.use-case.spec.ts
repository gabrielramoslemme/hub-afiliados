import { PixKeyTypeEnum } from '@porto/contracts';
import { UnknownAffiliateError, WrongPasswordError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { RevealAffiliateDocumentsUseCase } from './reveal-affiliate-documents.use-case';

describe('RevealAffiliateDocumentsUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let useCase: RevealAffiliateDocumentsUseCase;

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
    useCase = new RevealAffiliateDocumentsUseCase(userRepository, passwordHasher);
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

  it('refuses a wrong password', async () => {
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toThrow(WrongPasswordError);
  });

  it('refuses an account that has no password to confirm with', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, password: null, affiliate });

    await expect(useCase.execute(input)).rejects.toThrow(WrongPasswordError);
  });

  it('refuses a token of a user without an affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(input)).rejects.toThrow(UnknownAffiliateError);
  });
});
