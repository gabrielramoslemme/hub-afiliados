import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UseCase } from '../use-case';
import { TrainingModuleOutput, toTrainingModuleOutput } from './material.output';

/** A trilha como o painel a edita, na ordem em que o afiliado a percorre. */
export class ListTrainingModulesUseCase implements UseCase<void, TrainingModuleOutput[]> {
  constructor(private readonly trainingModuleRepository: TrainingModuleRepository) {}

  async execute(): Promise<TrainingModuleOutput[]> {
    return (await this.trainingModuleRepository.list()).map(toTrainingModuleOutput);
  }
}
