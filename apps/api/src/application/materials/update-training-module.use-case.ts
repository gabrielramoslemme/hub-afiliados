import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { TrainingModuleInput } from '@Domain/materials/training-module.entity';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UseCase } from '../use-case';
import { TrainingModuleOutput, toTrainingModuleOutput } from './material.output';

export interface UpdateTrainingModuleInput extends TrainingModuleInput {
  publicId: string;
}

/**
 * Troca o módulo inteiro. Quem já o marcou como assistido continua marcado:
 * corrigir o título ou trocar o vídeo não desfaz a formação de ninguém.
 */
export class UpdateTrainingModuleUseCase
  implements UseCase<UpdateTrainingModuleInput, TrainingModuleOutput>
{
  constructor(private readonly trainingModuleRepository: TrainingModuleRepository) {}

  async execute({ publicId, ...input }: UpdateTrainingModuleInput): Promise<TrainingModuleOutput> {
    const module = await this.trainingModuleRepository.update(publicId, input);
    if (!module) throw new TrainingModuleNotFoundError();

    return toTrainingModuleOutput(module);
  }
}
