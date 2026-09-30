import {
  type AdminPromotionalMaterial,
  type AdminTrainingModule,
  BYTES_PER_MEGABYTE,
  type PromotionalMaterialFormValues,
  type TrainingModuleFormValues,
} from '@porto/contracts';

/** Item novo entra depois do último, que é onde a trilha costuma crescer. */
export function nextPosition(items: ReadonlyArray<{ position: number }>): number {
  return items.reduce((highest, item) => Math.max(highest, item.position), 0) + 1;
}

export function trainingModuleFormDefaults(
  module: AdminTrainingModule | null,
  position: number,
): TrainingModuleFormValues {
  if (!module) return { title: '', description: '', videoUrl: '', durationMinutes: '', position };

  const { id: _id, ...values } = module;
  return values;
}

/** O formulário edita o tamanho em MB; a API devolve em bytes. */
export function promotionalMaterialFormDefaults(
  material: AdminPromotionalMaterial | null,
  position = 1,
): PromotionalMaterialFormValues {
  if (!material) {
    return {
      title: '',
      description: '',
      fileUrl: '',
      fileFormat: '' as PromotionalMaterialFormValues['fileFormat'],
      fileSizeMegabytes: '',
      position,
    };
  }

  const { id: _id, fileSizeBytes, ...values } = material;
  return { ...values, fileSizeMegabytes: fileSizeBytes / BYTES_PER_MEGABYTE };
}
