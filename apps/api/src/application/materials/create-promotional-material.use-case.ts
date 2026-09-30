import { PromotionalMaterialInput } from '@Domain/materials/promotional-material.entity';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { UseCase } from '../use-case';
import { PromotionalMaterialOutput, toPromotionalMaterialOutput } from './material.output';

export class CreatePromotionalMaterialUseCase
  implements UseCase<PromotionalMaterialInput, PromotionalMaterialOutput>
{
  constructor(private readonly promotionalMaterialRepository: PromotionalMaterialRepository) {}

  async execute(input: PromotionalMaterialInput): Promise<PromotionalMaterialOutput> {
    return toPromotionalMaterialOutput(await this.promotionalMaterialRepository.create(input));
  }
}
