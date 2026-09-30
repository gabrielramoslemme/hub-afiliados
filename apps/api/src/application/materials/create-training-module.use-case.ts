import { TrainingModuleInput } from '@Domain/materials/training-module.entity';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UseCase } from '../use-case';
import { TrainingModuleOutput, toTrainingModuleOutput } from './material.output';

export class CreateTrainingModuleUseCase
  implements UseCase<TrainingModuleInput, TrainingModuleOutput>
{
  constructor(private readonly trainingModuleRepository: TrainingModuleRepository) {}

  async execute(input: TrainingModuleInput): Promise<TrainingModuleOutput> {
    return toTrainingModuleOutput(await this.trainingModuleRepository.create(input));
  }
}
