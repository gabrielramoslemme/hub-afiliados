import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface UncompleteTrainingModuleInput {
  userPublicId: string;
  trainingModulePublicId: string;
}

/**
 * O afiliado desfaz a marca de assistido — clicou por engano, ou quer rever o
 * módulo. Como marcar, é a palavra dele; desmarcar o que não estava marcado não
 * é erro.
 */
export class UncompleteTrainingModuleUseCase
  implements UseCase<UncompleteTrainingModuleInput, void>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly trainingModuleRepository: TrainingModuleRepository,
  ) {}

  async execute({
    userPublicId,
    trainingModulePublicId,
  }: UncompleteTrainingModuleInput): Promise<void> {
    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const module = await this.trainingModuleRepository.findByPublicId(trainingModulePublicId);
    if (!module) throw new TrainingModuleNotFoundError();

    await this.trainingModuleRepository.unmarkCompleted(user.affiliate.id, module.id);
  }
}
