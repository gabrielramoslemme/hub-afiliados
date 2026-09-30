import { TrainingModuleInput } from '@Domain/materials/training-module.entity';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UseCase } from '../use-case';
import { TrainingModuleOutput } from './list-training-modules.use-case';

/** Cria o módulo no fim da trilha. */
export class CreateTrainingModuleUseCase
  implements UseCase<TrainingModuleInput, TrainingModuleOutput>
{
  constructor(private readonly trainingModuleRepository: TrainingModuleRepository) {}

  async execute(input: TrainingModuleInput): Promise<TrainingModuleOutput> {
    const module = await this.trainingModuleRepository.create(input);

    return {
      publicId: module.publicId,
      title: module.title,
      description: module.description,
      videoUrl: module.videoUrl,
      durationMinutes: module.durationMinutes,
      position: module.position,
    };
  }
}
