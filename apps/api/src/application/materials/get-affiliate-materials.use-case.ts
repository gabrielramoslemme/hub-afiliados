import { MaterialFileFormatEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

/** Um módulo da trilha como o afiliado o vê: sem a posição, com o progresso dele. */
export interface AffiliateTrainingModuleOutput {
  publicId: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
  completed: boolean;
}

/** Um material para download como o afiliado o vê. */
export interface AffiliatePromotionalMaterialOutput {
  publicId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileFormat: MaterialFileFormatEnum;
  fileSizeBytes: number;
}

export interface AffiliateMaterialsOutput {
  trainingModules: AffiliateTrainingModuleOutput[];
  promotionalMaterials: AffiliatePromotionalMaterialOutput[];
}

/** A aba Materiais: a trilha com o progresso de quem pediu, e os arquivos para baixar. */
export class GetAffiliateMaterialsUseCase implements UseCase<string, AffiliateMaterialsOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly trainingModuleRepository: TrainingModuleRepository,
    private readonly promotionalMaterialRepository: PromotionalMaterialRepository,
  ) {}

  async execute(userPublicId: string): Promise<AffiliateMaterialsOutput> {
    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const [modules, completedIds, materials] = await Promise.all([
      this.trainingModuleRepository.list(),
      this.trainingModuleRepository.listCompletedIds(user.affiliate.id),
      this.promotionalMaterialRepository.list(),
    ]);
    const completed = new Set(completedIds);

    return {
      trainingModules: modules.map((module) => ({
        publicId: module.publicId,
        title: module.title,
        description: module.description,
        videoUrl: module.videoUrl,
        durationMinutes: module.durationMinutes,
        completed: completed.has(module.id),
      })),
      promotionalMaterials: materials.map((material) => ({
        publicId: material.publicId,
        title: material.title,
        description: material.description,
        fileUrl: material.fileUrl,
        fileFormat: material.fileFormat,
        fileSizeBytes: material.fileSizeBytes,
      })),
    };
  }
}
