import { AffiliateStatusEnum, MailTemplateEnum, PixKeyTypeEnum } from '@porto/contracts';
import { InvalidPixKeyError, PixKeyMismatchError } from '@Domain/affiliates/affiliates.errors';
import { UnknownAffiliateError, WrongPasswordError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { ChangePixKeyInput, ChangePixKeyUseCase } from './change-pix-key.use-case';

describe('ChangePixKeyUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let useCase: ChangePixKeyUseCase;

  const user = buildUser({
    name: 'Marina Ferraz',
    email: 'marina@email.com',
    password: '$2b$10$stored',
  });
  const affiliate = buildAffiliate({
    user,
    cpf: '52998224725',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'marina@email.com',
    status: AffiliateStatusEnum.APPROVED,
  });

  function input(overrides: Partial<ChangePixKeyInput> = {}): ChangePixKeyInput {
    return {
      userPublicId: user.publicId,
      pixKeyType: PixKeyTypeEnum.PHONE,
      pixKey: '(11) 99999-8888',
      currentPassword: 'SenhaAtual!2026',
      ...overrides,
    };
  }

  beforeEach(() => {
    userRepository = userRepositoryMock();
    affiliateRepository = affiliateRepositoryMock();
    passwordHasher = passwordHasherMock();
    mailer = mailerMock();
    useCase = new ChangePixKeyUseCase(userRepository, affiliateRepository, passwordHasher, mailer);

    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
  });

  it('stores the new key, normalized, on the affiliate behind the token', async () => {
    await useCase.execute(input());

    expect(affiliateRepository.save).toHaveBeenCalledWith({
      id: affiliate.id,
      pixKeyType: PixKeyTypeEnum.PHONE,
      pixKey: '11999998888',
    });
  });

  it('checks the typed password against the stored hash', async () => {
    await useCase.execute(input());

    expect(passwordHasher.compare).toHaveBeenCalledWith('SenhaAtual!2026', '$2b$10$stored');
  });

  it('refuses a wrong password without touching the key', async () => {
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input())).rejects.toThrow(WrongPasswordError);
    expect(affiliateRepository.save).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('refuses an account that never had a password', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, password: null, affiliate });

    await expect(useCase.execute(input())).rejects.toThrow(WrongPasswordError);
    expect(affiliateRepository.save).not.toHaveBeenCalled();
  });

  it('refuses a key that does not fit its type', async () => {
    await expect(
      useCase.execute(input({ pixKeyType: PixKeyTypeEnum.EMAIL, pixKey: 'marina' })),
    ).rejects.toThrow(InvalidPixKeyError);
    expect(affiliateRepository.save).not.toHaveBeenCalled();
  });

  it('refuses a cpf key that is not the cpf of the registration', async () => {
    await expect(
      useCase.execute(input({ pixKeyType: PixKeyTypeEnum.CPF, pixKey: '111.444.777-35' })),
    ).rejects.toThrow(PixKeyMismatchError);
    expect(affiliateRepository.save).not.toHaveBeenCalled();
  });

  /*
    A comparação com o CPF do cadastro responde "é" ou "não é". Antes da senha,
    ela serviria a quem pegou a sessão aberta para descobrir o CPF inteiro a
    partir do mascarado que a tela mostra.
  */
  it('checks the password before comparing a cpf key with the registration', async () => {
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(input({ pixKeyType: PixKeyTypeEnum.CPF, pixKey: '111.444.777-35' })),
    ).rejects.toThrow(WrongPasswordError);
  });

  it('accepts the cpf of the registration as the key', async () => {
    await useCase.execute(input({ pixKeyType: PixKeyTypeEnum.CPF, pixKey: '529.982.247-25' }));

    expect(affiliateRepository.save).toHaveBeenCalledWith({
      id: affiliate.id,
      pixKeyType: PixKeyTypeEnum.CPF,
      pixKey: '52998224725',
    });
  });

  it('warns the owner by email, showing the new key masked', async () => {
    await useCase.execute(input());

    expect(mailer.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.PIX_KEY_CHANGED,
      to: 'marina@email.com',
      toName: 'Marina Ferraz',
      variables: {
        name: 'Marina',
        pixKeyType: PixKeyTypeEnum.PHONE,
        maskedPixKey: '(11) *****-8888',
      },
    });
  });

  it('refuses a token of a user that is gone', async () => {
    userRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(UnknownAffiliateError);
  });

  it('refuses a user without an affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(input())).rejects.toThrow(UnknownAffiliateError);
  });
});
