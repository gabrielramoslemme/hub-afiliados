import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface CompleteTrainingModuleInput {
  userPublicId: string;
  trainingModulePublicId: string;
}

/**
 * O afiliado marca um módulo como assistido. É a palavra dele: o Hub não sabe o
 * que o player de outro domínio tocou. Marcar de novo não é erro — o botão pode
 * ser clicado duas vezes, e a data que fica é a da primeira.
 */
export class CompleteTrainingModuleUseCase implements UseCase<CompleteTrainingModuleInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly trainingModuleRepository: TrainingModuleRepository,
    private readonly clock: Clock,
  ) {}

  async execute({
    userPublicId,
    trainingModulePublicId,
  }: CompleteTrainingModuleInput): Promise<void> {
    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const module = await this.trainingModuleRepository.findByPublicId(trainingModulePublicId);
    if (!module) throw new TrainingModuleNotFoundError();

    await this.trainingModuleRepository.markCompleted(
      user.affiliate.id,
      module.id,
      this.clock.now(),
    );
  }
}
