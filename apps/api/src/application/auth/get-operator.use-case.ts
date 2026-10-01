import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface OperatorOutput {
  publicId: string;
  name: string;
  email: string;
  role: UserRoleEnum;
  shouldChangePassword: boolean;
}

/**
 * Quem está logado no painel, lido da conta a cada página. O painel guardava
 * isso num cookie escrito no login, que ninguém conferia — bastava forjá-lo
 * para a tela mostrar outro nome e outro perfil.
 */
export class GetOperatorUseCase implements UseCase<string, OperatorOutput> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userPublicId: string): Promise<OperatorOutput> {
    const user = await this.userRepository.findByPublicId(userPublicId);

    if (!user || user.type !== UserTypeEnum.ADMIN || !user.role) throw new UnknownOperatorError();

    return {
      publicId: user.publicId,
      name: user.name,
      email: user.email,
      role: user.role,
      shouldChangePassword: user.shouldChangePassword,
    };
  }
}
