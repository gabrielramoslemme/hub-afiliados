import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

/**
 * Sair encerra a sessão no servidor, e não só o cookie no navegador: um token
 * copiado antes — de um log, de uma máquina compartilhada — para de valer junto.
 * Encerra todas as sessões da conta, porque o token não carrega uma identidade
 * própria a revogar sozinha.
 */
export class RevokeSessionsUseCase implements UseCase<string, void> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userPublicId: string): Promise<void> {
    const user = await this.userRepository.findByPublicId(userPublicId);

    if (!user) return;

    await this.userRepository.revokeSessions(user.id);
  }
}
