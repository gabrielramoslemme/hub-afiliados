import { MaterialOrderOutdatedError } from '@Domain/materials/materials.errors';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { UseCase } from '../use-case';

/** A ordem nova dos downloads, inteira. Mesma regra da trilha. */
export class ReorderPromotionalMaterialsUseCase implements UseCase<string[], void> {
  constructor(private readonly promotionalMaterialRepository: PromotionalMaterialRepository) {}

  async execute(publicIds: string[]): Promise<void> {
    if (!(await this.promotionalMaterialRepository.reorder(publicIds))) {
      throw new MaterialOrderOutdatedError();
    }
  }
}
