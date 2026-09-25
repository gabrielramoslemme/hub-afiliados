import { MailTemplateEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { InvalidPixKeyError, PixKeyMismatchError } from '@Domain/affiliates/affiliates.errors';
import { isValidPixKey, maskPixKey, normalizePixKey } from '@Domain/affiliates/pix-key.util';
import { UnknownAffiliateError, WrongPasswordError } from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { Mailer } from '@Domain/notifications/mailer';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface ChangePixKeyInput {
  /** O `sub` do token: a chave trocada é sempre a de quem assinou a sessão. */
  userPublicId: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  currentPassword: string;
}

/**
 * A chave é o destino do pagamento, e por isso a troca pede a senha atual — uma
 * sessão esquecida aberta não basta para desviá-lo — e avisa o dono por e-mail,
 * para que uma troca que ele não fez não passe despercebida até o dinheiro cair
 * em outra conta.
 */
export class ChangePixKeyUseCase implements UseCase<ChangePixKeyInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly affiliateRepository: AffiliateRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly mailer: Mailer,
  ) {}

  async execute(input: ChangePixKeyInput): Promise<void> {
    const user = await this.userRepository.findByPublicId(input.userPublicId);

    if (!user?.affiliate) throw new UnknownAffiliateError();

    const { affiliate } = user;

    // Só a forma, que não depende de nada gravado: pode vir antes da senha.
    if (!isValidPixKey(input.pixKeyType, input.pixKey)) throw new InvalidPixKeyError();

    const matches =
      user.password !== null &&
      (await this.passwordHasher.compare(input.currentPassword, user.password));
    if (!matches) throw new WrongPasswordError();

    // Depois da senha, e não antes: comparar com o CPF do cadastro responde "é"
    // ou "não é", e sem a senha serviria a quem pegou a sessão aberta para
    // descobrir o CPF inteiro a partir do mascarado que a tela mostra.
    const pixKey = normalizePixKey(input.pixKeyType, input.pixKey);
    if (input.pixKeyType === PixKeyTypeEnum.CPF && pixKey !== affiliate.cpf) {
      throw new PixKeyMismatchError();
    }

    await this.affiliateRepository.updateWithAudit({
      affiliateId: affiliate.id,
      changes: { pixKeyType: input.pixKeyType, pixKey },
      actorUserId: user.id,
    });

    await this.mailer.send({
      template: MailTemplateEnum.PIX_KEY_CHANGED,
      to: user.email,
      toName: user.name,
      variables: {
        name: user.name.split(' ')[0],
        pixKeyType: input.pixKeyType,
        maskedPixKey: maskPixKey(input.pixKeyType, pixKey),
      },
    });
  }
}
