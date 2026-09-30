import { PromotionalMaterialNotFoundError } from '@Domain/materials/materials.errors';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { UseCase } from '../use-case';

export class DeletePromotionalMaterialUseCase implements UseCase<string, void> {
  constructor(private readonly promotionalMaterialRepository: PromotionalMaterialRepository) {}

  async execute(publicId: string): Promise<void> {
    if (!(await this.promotionalMaterialRepository.delete(publicId))) {
      throw new PromotionalMaterialNotFoundError();
    }
  }
}
