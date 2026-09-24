import { MailTemplateEnum } from '@porto/contracts';
import { EmailAlreadyRegisteredError } from '@Domain/affiliates/affiliates.errors';
import { UnknownAffiliateError, WrongPasswordError } from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { Mailer } from '@Domain/notifications/mailer';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface ChangeEmailInput {
  /** O `sub` do token: o e-mail trocado é sempre o de quem assinou a sessão. */
  userPublicId: string;
  email: string;
  currentPassword: string;
}

/**
 * O e-mail é o login e o endereço de todo aviso da conta. Por isso a troca pede
 * a senha atual — uma sessão esquecida aberta não basta para tomar a conta — e
 * avisa o endereço antigo, que é onde o dono ainda está olhando.
 *
 * A sessão aberta continua valendo: o token carrega o `publicId`, não o e-mail.
 */
export class ChangeEmailUseCase implements UseCase<ChangeEmailInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly mailer: Mailer,
  ) {}

  async execute(input: ChangeEmailInput): Promise<void> {
    const user = await this.userRepository.findByPublicId(input.userPublicId);

    if (!user?.affiliate) throw new UnknownAffiliateError();

    const matches =
      user.password !== null &&
      (await this.passwordHasher.compare(input.currentPassword, user.password));
    if (!matches) throw new WrongPasswordError();

    const email = input.email.trim().toLowerCase();
    if (email === user.email.toLowerCase()) return;

    // Depois da senha, e não antes: "já cadastrado" diz se o e-mail tem conta, e
    // sem a senha a rota serviria a quem pegou a sessão aberta para sondar e-mails.
    const owner = await this.userRepository.findByEmail(email);
    if (owner) throw new EmailAlreadyRegisteredError();

    await this.userRepository.save({ id: user.id, email });

    await this.mailer.send({
      template: MailTemplateEnum.EMAIL_CHANGED,
      to: user.email,
      toName: user.name,
      variables: { name: user.name.split(' ')[0], newEmail: email },
    });
  }
}
