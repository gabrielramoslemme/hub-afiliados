import { PromotionalMaterialEntity } from '@Domain/materials/promotional-material.entity';
import { TrainingModuleEntity } from '@Domain/materials/training-module.entity';

/*
  A saída dos use cases dos materiais, sem o `id` serial nem as datas da linha.
  Mora num arquivo só porque o painel e a área do afiliado leem o mesmo módulo e
  o mesmo material: dois mapeamentos divergiriam no primeiro campo novo.
*/

export type TrainingModuleOutput = Omit<TrainingModuleEntity, 'id' | 'createdAt' | 'updatedAt'>;

export type PromotionalMaterialOutput = Omit<
  PromotionalMaterialEntity,
  'id' | 'createdAt' | 'updatedAt'
>;

export function toTrainingModuleOutput({
  publicId,
  title,
  description,
  videoUrl,
  durationMinutes,
  position,
}: TrainingModuleEntity): TrainingModuleOutput {
  return { publicId, title, description, videoUrl, durationMinutes, position };
}

export function toPromotionalMaterialOutput({
  publicId,
  title,
  description,
  fileUrl,
  fileFormat,
  fileSizeBytes,
  position,
}: PromotionalMaterialEntity): PromotionalMaterialOutput {
  return { publicId, title, description, fileUrl, fileFormat, fileSizeBytes, position };
}
