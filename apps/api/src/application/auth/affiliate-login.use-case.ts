import { AffiliateStatusEnum, AuthAudienceEnum, UserTypeEnum } from '@porto/contracts';
import { AccessTokenIssuer } from '@Domain/auth/access-token';
import {
  AccountInactiveError,
  InvalidCredentialsError,
  PasswordNotSetError,
  RegistrationRejectedError,
  RegistrationUnderReviewError,
} from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface AffiliateLoginInput {
  email: string;
  password: string;
}

export interface AffiliateLoginOutput {
  accessToken: string;
  user: {
    publicId: string;
    name: string;
    email: string;
    status: AffiliateStatusEnum;
    /** Nulo enquanto a Porto não emitir o cupom do afiliado aprovado. */
    coupon: string | null;
  };
}

/**
 * Só cadastro aprovado entra. As duas recusas por situação vêm **depois** da
 * senha conferir: antes disso, a resposta contaria a quem tentou que aquele
 * e-mail existe e em que pé está.
 */
const BLOCKED: Record<string, () => never> = {
  [AffiliateStatusEnum.PENDING_APPROVAL]: () => {
    throw new RegistrationUnderReviewError();
  },
  [AffiliateStatusEnum.REJECTED]: () => {
    throw new RegistrationRejectedError();
  },
};

export class AffiliateLoginUseCase implements UseCase<AffiliateLoginInput, AffiliateLoginOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(input: AffiliateLoginInput): Promise<AffiliateLoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || user.type !== UserTypeEnum.AFFILIATE || !user.affiliate) {
      throw new InvalidCredentialsError();
    }

    if (!user.password) throw new PasswordNotSetError();

    const matches = await this.passwordHasher.compare(input.password, user.password);
    if (!matches) throw new InvalidCredentialsError();

    if (!user.isActive) throw new AccountInactiveError();

    BLOCKED[user.affiliate.status]?.();

    await this.userRepository.save({ id: user.id, lastLoginAt: this.clock.now() });

    const accessToken = await this.accessTokenIssuer.issue({
      sub: user.publicId,
      aud: AuthAudienceEnum.AFFILIATE,
      role: null,
      name: user.name,
    });

    return {
      accessToken,
      // O `publicId` que sai é o do afiliado, não o do usuário: é ele que
      // identifica o cadastro em toda a API.
      user: {
        publicId: user.affiliate.publicId,
        name: user.name,
        email: user.email,
        status: user.affiliate.status,
        coupon: null,
      },
    };
  }
}
