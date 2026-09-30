import { MaterialFileFormatEnum } from '@porto/contracts';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { UseCase } from '../use-case';

/** Um material para download como o painel o edita. Criar e alterar devolvem a mesma forma. */
export interface PromotionalMaterialOutput {
  publicId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileFormat: MaterialFileFormatEnum;
  fileSizeBytes: number;
  position: number;
}

/** Os downloads como o painel os edita, na ordem em que o afiliado os vê. */
export class ListPromotionalMaterialsUseCase implements UseCase<void, PromotionalMaterialOutput[]> {
  constructor(private readonly promotionalMaterialRepository: PromotionalMaterialRepository) {}

  async execute(): Promise<PromotionalMaterialOutput[]> {
    const materials = await this.promotionalMaterialRepository.list();

    return materials.map((material) => ({
      publicId: material.publicId,
      title: material.title,
      description: material.description,
      fileUrl: material.fileUrl,
      fileFormat: material.fileFormat,
      fileSizeBytes: material.fileSizeBytes,
      position: material.position,
    }));
  }
}
