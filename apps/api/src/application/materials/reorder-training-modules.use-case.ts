import { MaterialOrderOutdatedError } from '@Domain/materials/materials.errors';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UseCase } from '../use-case';

/**
 * A ordem nova da trilha, inteira. Quem confere que a lista é a dos módulos que
 * existem é o repositório, debaixo do lock: a leitura daqui não seguraria nada.
 */
export class ReorderTrainingModulesUseCase implements UseCase<string[], void> {
  constructor(private readonly trainingModuleRepository: TrainingModuleRepository) {}

  async execute(publicIds: string[]): Promise<void> {
    if (!(await this.trainingModuleRepository.reorder(publicIds))) {
      throw new MaterialOrderOutdatedError();
    }
  }
}
