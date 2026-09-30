import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { UseCase } from '../use-case';
import { PromotionalMaterialOutput, toPromotionalMaterialOutput } from './material.output';

export class ListPromotionalMaterialsUseCase implements UseCase<void, PromotionalMaterialOutput[]> {
  constructor(private readonly promotionalMaterialRepository: PromotionalMaterialRepository) {}

  async execute(): Promise<PromotionalMaterialOutput[]> {
    return (await this.promotionalMaterialRepository.list()).map(toPromotionalMaterialOutput);
  }
}
