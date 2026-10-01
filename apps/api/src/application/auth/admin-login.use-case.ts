import { AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { AccessTokenIssuer } from '@Domain/auth/access-token';
import { AccountInactiveError, InvalidCredentialsError } from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginOutput {
  accessToken: string;
  user: {
    publicId: string;
    name: string;
    email: string;
    role: UserRoleEnum;
    shouldChangePassword: boolean;
  };
}

export class AdminLoginUseCase implements UseCase<AdminLoginInput, AdminLoginOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(input: AdminLoginInput): Promise<AdminLoginOutput> {
    const found = await this.userRepository.findByEmail(input.email);
    const user = found?.type === UserTypeEnum.ADMIN && found.role ? found : null;

    // Toda tentativa compara uma senha, com ou sem conta: a resposta e o tempo
    // dela são os mesmos para e-mail desconhecido, conta sem senha e senha
    // errada. Distinguir os três entregaria a lista de quem opera o painel.
    const matches = await this.passwordHasher.compare(input.password, user?.password ?? null);
    if (!user?.role || !user.password || !matches) throw new InvalidCredentialsError();

    // A conta inativa só se revela depois de a senha conferir: antes disso,
    // a resposta contaria a quem tentou que aquele e-mail existe.
    if (!user.isActive) throw new AccountInactiveError();

    await this.userRepository.save({ id: user.id, lastLoginAt: this.clock.now() });

    const accessToken = await this.accessTokenIssuer.issue({
      sub: user.publicId,
      aud: AuthAudienceEnum.ADMIN,
      role: user.role,
      name: user.name,
      ver: user.tokenVersion,
    });

    return {
      accessToken,
      user: {
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        role: user.role,
        shouldChangePassword: user.shouldChangePassword,
      },
    };
  }
}
