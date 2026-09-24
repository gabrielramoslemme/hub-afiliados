import { MailTemplateEnum } from '@porto/contracts';
import { EmailAlreadyRegisteredError } from '@Domain/affiliates/affiliates.errors';
import { UnknownAffiliateError, WrongPasswordError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { ChangeEmailInput, ChangeEmailUseCase } from './change-email.use-case';

describe('ChangeEmailUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let useCase: ChangeEmailUseCase;

  const user = buildUser({
    name: 'Marina Ferraz',
    email: 'marina@email.com',
    password: '$2b$10$stored',
  });
  const affiliate = buildAffiliate({ user });

  function input(overrides: Partial<ChangeEmailInput> = {}): ChangeEmailInput {
    return {
      userPublicId: user.publicId,
      email: 'marina.nova@email.com',
      currentPassword: 'SenhaAtual!2026',
      ...overrides,
    };
  }

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordHasher = passwordHasherMock();
    mailer = mailerMock();
    useCase = new ChangeEmailUseCase(userRepository, passwordHasher, mailer);

    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
    userRepository.findByEmail.mockResolvedValue(null);
  });

  it('stores the new email on the user behind the token', async () => {
    await useCase.execute(input());

    expect(userRepository.save).toHaveBeenCalledWith({
      id: user.id,
      email: 'marina.nova@email.com',
    });
  });

  it('checks the typed password against the stored hash', async () => {
    await useCase.execute(input());

    expect(passwordHasher.compare).toHaveBeenCalledWith('SenhaAtual!2026', '$2b$10$stored');
  });

  it('refuses a wrong password without touching the email', async () => {
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input())).rejects.toThrow(WrongPasswordError);
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('refuses an account that never had a password', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, password: null, affiliate });

    await expect(useCase.execute(input())).rejects.toThrow(WrongPasswordError);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('refuses an email that already belongs to another account', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...buildUser({ email: 'marina.nova@email.com' }),
      affiliate: null,
    });

    await expect(useCase.execute(input())).rejects.toThrow(EmailAlreadyRegisteredError);
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  /*
    "Já cadastrado" ou não responde se o e-mail tem conta. Antes da senha, a
    rota serviria a quem pegou a sessão aberta para sondar e-mails à vontade.
  */
  it('checks the password before looking the new email up', async () => {
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input())).rejects.toThrow(WrongPasswordError);
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('neither saves nor warns when the email is the one already there', async () => {
    await useCase.execute(input({ email: 'marina@email.com' }));

    expect(userRepository.save).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  /* O aviso vai para o endereço antigo: é o dono que precisa saber, não quem trocou. */
  it('warns the previous address, naming the new one', async () => {
    await useCase.execute(input());

    expect(mailer.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.EMAIL_CHANGED,
      to: 'marina@email.com',
      toName: 'Marina Ferraz',
      variables: { name: 'Marina', newEmail: 'marina.nova@email.com' },
    });
  });

  it('refuses a token whose user is not an affiliate', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(input())).rejects.toThrow(UnknownAffiliateError);
    expect(userRepository.save).not.toHaveBeenCalled();
  });
});
