import { AccessTokenClaims } from '@Domain/auth/access-token';
import { SessionRevokedError } from '@Domain/auth/auth.errors';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

/**
 * A pergunta que a assinatura do JWT não responde: esta sessão ainda vale? Vale
 * enquanto a conta existe, está ativa e não teve as sessões encerradas desde a
 * emissão. Perfil e nome saem do banco, não do token — rebaixar alguém vale na
 * requisição seguinte, e não oito horas depois.
 */
export class ValidateSessionUseCase implements UseCase<AccessTokenClaims, AccessTokenClaims> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(claims: AccessTokenClaims): Promise<AccessTokenClaims> {
    const user = await this.userRepository.findByPublicId(claims.sub);

    if (!user?.isActive || user.tokenVersion !== claims.ver) {
      throw new SessionRevokedError();
    }

    return { ...claims, role: user.role, name: user.name };
  }
}
