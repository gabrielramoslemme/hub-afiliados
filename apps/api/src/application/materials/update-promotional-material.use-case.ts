import { PromotionalMaterialNotFoundError } from '@Domain/materials/materials.errors';
import { PromotionalMaterialInput } from '@Domain/materials/promotional-material.entity';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { UseCase } from '../use-case';
import { PromotionalMaterialOutput, toPromotionalMaterialOutput } from './material.output';

export interface UpdatePromotionalMaterialInput extends PromotionalMaterialInput {
  publicId: string;
}

export class UpdatePromotionalMaterialUseCase
  implements UseCase<UpdatePromotionalMaterialInput, PromotionalMaterialOutput>
{
  constructor(private readonly promotionalMaterialRepository: PromotionalMaterialRepository) {}

  async execute({
    publicId,
    ...input
  }: UpdatePromotionalMaterialInput): Promise<PromotionalMaterialOutput> {
    const material = await this.promotionalMaterialRepository.update(publicId, input);
    if (!material) throw new PromotionalMaterialNotFoundError();

    return toPromotionalMaterialOutput(material);
  }
}
