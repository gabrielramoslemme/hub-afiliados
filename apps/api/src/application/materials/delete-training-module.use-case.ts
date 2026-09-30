import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UseCase } from '../use-case';

/**
 * Tira o módulo da trilha, e com ele o registro de quem o assistiu: o progresso
 * do afiliado é contado sobre a trilha que existe, e um módulo apagado que
 * continuasse contando deixaria a barra passar de 100%.
 */
export class DeleteTrainingModuleUseCase implements UseCase<string, void> {
  constructor(private readonly trainingModuleRepository: TrainingModuleRepository) {}

  async execute(publicId: string): Promise<void> {
    if (!(await this.trainingModuleRepository.delete(publicId))) {
      throw new TrainingModuleNotFoundError();
    }
  }
}
