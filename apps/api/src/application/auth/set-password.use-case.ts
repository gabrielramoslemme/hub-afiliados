import { TokenPurposeEnum } from '@porto/contracts';
import { InvalidResetTokenError } from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { TokenGenerator } from '@Domain/auth/token-generator';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface SetPasswordInput {
  /** O valor em claro, como veio no link do e-mail. */
  token: string;
  password: string;
}

/**
 * O fim do caminho que a aprovação abriu: o afiliado troca o link de uso único
 * pela senha dele. O token é procurado pelo **hash** — o banco nunca guardou o
 * valor em claro, e é isso que faz um vazamento da tabela não virar uma lista de
 * links válidos.
 */
export class SetPasswordUseCase implements UseCase<SetPasswordInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: SetPasswordInput): Promise<void> {
    // Usado, vencido e adulterado devolvem o mesmo `null` do repositório, e o
    // mesmo erro daqui: distinguir contaria a quem tentou qual metade acertou.
    const token = await this.passwordResetTokenRepository.findUsable(
      this.tokenGenerator.hash(input.token),
      TokenPurposeEnum.SET_PASSWORD,
    );

    if (!token) throw new InvalidResetTokenError();

    await this.userRepository.save({
      id: token.userId,
      password: await this.passwordHasher.hash(input.password),
      passwordSetAt: this.clock.now(),
      shouldChangePassword: false,
    });

    // Queimar depois da escrita: falhar entre as duas com o token já gasto
    // deixaria a pessoa sem senha e sem link.
    await this.passwordResetTokenRepository.markUsed(token.id);
  }
}
