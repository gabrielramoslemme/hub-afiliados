import { AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { AccessTokenIssuer } from '@Domain/auth/access-token';
import {
  AccountInactiveError,
  InvalidCredentialsError,
  PasswordNotSetError,
} from '@Domain/auth/auth.errors';
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
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || user.type !== UserTypeEnum.ADMIN || !user.role) {
      throw new InvalidCredentialsError();
    }

    if (!user.password) throw new PasswordNotSetError();

    const matches = await this.passwordHasher.compare(input.password, user.password);
    if (!matches) throw new InvalidCredentialsError();

    // A conta inativa só se revela depois de a senha conferir: antes disso,
    // a resposta contaria a quem tentou que aquele e-mail existe.
    if (!user.isActive) throw new AccountInactiveError();

    await this.userRepository.save({ id: user.id, lastLoginAt: this.clock.now() });

    const accessToken = await this.accessTokenIssuer.issue({
      sub: user.publicId,
      aud: AuthAudienceEnum.ADMIN,
      role: user.role,
      name: user.name,
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
