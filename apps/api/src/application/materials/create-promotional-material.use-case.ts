import { PromotionalMaterialInput } from '@Domain/materials/promotional-material.entity';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { UseCase } from '../use-case';
import { PromotionalMaterialOutput } from './list-promotional-materials.use-case';

/** Cria o material no fim da lista. */
export class CreatePromotionalMaterialUseCase
  implements UseCase<PromotionalMaterialInput, PromotionalMaterialOutput>
{
  constructor(private readonly promotionalMaterialRepository: PromotionalMaterialRepository) {}

  async execute(input: PromotionalMaterialInput): Promise<PromotionalMaterialOutput> {
    const material = await this.promotionalMaterialRepository.create(input);

    return {
      publicId: material.publicId,
      title: material.title,
      description: material.description,
      fileUrl: material.fileUrl,
      fileFormat: material.fileFormat,
      fileSizeBytes: material.fileSizeBytes,
      position: material.position,
    };
  }
}
