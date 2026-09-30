import {
  type AdminPromotionalMaterial,
  type AdminTrainingModule,
  BYTES_PER_MEGABYTE,
  type PromotionalMaterialFormValues,
  type TrainingModuleFormValues,
} from '@porto/contracts';

/*
  A posição fica de fora dos dois formulários: item novo entra no fim, e a
  ordem muda arrastando a lista. Mandá-la no PUT seria campo fora do DTO, e 400.
*/

export function trainingModuleFormDefaults(
  module: AdminTrainingModule | null,
): TrainingModuleFormValues {
  if (!module) return { title: '', description: '', videoUrl: '', durationMinutes: '' };

  const { id: _id, position: _position, ...values } = module;
  return values;
}

/** O formulário edita o tamanho em MB; a API devolve em bytes. */
export function promotionalMaterialFormDefaults(
  material: AdminPromotionalMaterial | null,
): PromotionalMaterialFormValues {
  if (!material) {
    return {
      title: '',
      description: '',
      fileUrl: '',
      fileFormat: '' as PromotionalMaterialFormValues['fileFormat'],
      fileSizeMegabytes: '',
    };
  }

  const { id: _id, position: _position, fileSizeBytes, ...values } = material;
  return { ...values, fileSizeMegabytes: fileSizeBytes / BYTES_PER_MEGABYTE };
}
