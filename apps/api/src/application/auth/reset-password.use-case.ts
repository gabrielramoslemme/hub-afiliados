import { AuthAudienceEnum, TokenPurposeEnum } from '@porto/contracts';
import { USER_TYPE_BY_AUDIENCE } from '@Domain/auth/audience';
import { InvalidResetTokenError } from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { TokenGenerator } from '@Domain/auth/token-generator';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface ResetPasswordInput {
  /** O valor em claro, como veio no link do e-mail. */
  token: string;
  password: string;
  audience: AuthAudienceEnum;
}

/**
 * O outro lado da recuperação: o link vira senha nova. Irmão do
 * `SetPasswordUseCase` e separado dele de propósito — aqui o token é de outro
 * propósito, o canal que recebeu precisa ser o canal que pediu, e a senha
 * trocada apaga o link da aprovação que ainda estivesse de pé.
 */
export class ResetPasswordUseCase implements UseCase<ResetPasswordInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    // Usado, vencido e adulterado devolvem o mesmo `null` do repositório, e o
    // mesmo erro daqui: distinguir contaria a quem tentou qual metade acertou.
    const token = await this.passwordResetTokenRepository.findUsable(
      this.tokenGenerator.hash(input.token),
      TokenPurposeEnum.RESET_PASSWORD,
    );

    // O link do painel não redefine a senha na tela do afiliado, e vice-versa.
    // É o mesmo erro de um link vencido: dizer "este é do outro canal"
    // confirmaria que aquele e-mail tem conta de operador.
    if (!token || token.user.type !== USER_TYPE_BY_AUDIENCE[input.audience]) {
      throw new InvalidResetTokenError();
    }

    await this.userRepository.save({
      id: token.userId,
      password: await this.passwordHasher.hash(input.password),
      passwordSetAt: this.clock.now(),
      shouldChangePassword: false,
    });

    // Queimar depois da escrita: falhar entre as duas com o token já gasto
    // deixaria a pessoa sem senha e sem link.
    await this.passwordResetTokenRepository.markUsed(token.id);

    // O link da aprovação escreve senha sem pedir a atual. Vivo, ele devolveria
    // a quem alcançasse aquele e-mail o poder de sobrescrever a senha nova.
    await this.passwordResetTokenRepository.invalidateAllFor(
      token.userId,
      TokenPurposeEnum.SET_PASSWORD,
    );
  }
}
