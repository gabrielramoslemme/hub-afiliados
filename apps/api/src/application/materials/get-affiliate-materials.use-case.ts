import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';
import {
  PromotionalMaterialOutput,
  TrainingModuleOutput,
  toPromotionalMaterialOutput,
  toTrainingModuleOutput,
} from './material.output';

export interface AffiliateTrainingModuleOutput extends TrainingModuleOutput {
  completed: boolean;
}

export interface AffiliateMaterialsOutput {
  trainingModules: AffiliateTrainingModuleOutput[];
  promotionalMaterials: PromotionalMaterialOutput[];
}

/** A aba Materiais: a trilha com o progresso de quem pediu, e os arquivos para baixar. */
export class GetAffiliateMaterialsUseCase implements UseCase<string, AffiliateMaterialsOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly trainingModuleRepository: TrainingModuleRepository,
    private readonly promotionalMaterialRepository: PromotionalMaterialRepository,
  ) {}

  async execute(userPublicId: string): Promise<AffiliateMaterialsOutput> {
    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const [modules, completedIds, materials] = await Promise.all([
      this.trainingModuleRepository.list(),
      this.trainingModuleRepository.listCompletedIds(user.affiliate.id),
      this.promotionalMaterialRepository.list(),
    ]);
    const completed = new Set(completedIds);

    return {
      trainingModules: modules.map((module) => ({
        ...toTrainingModuleOutput(module),
        completed: completed.has(module.id),
      })),
      promotionalMaterials: materials.map(toPromotionalMaterialOutput),
    };
  }
}
