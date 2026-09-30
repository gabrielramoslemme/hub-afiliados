'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { type TrainingModuleRequest, trainingModuleSchema } from '@porto/contracts';
import { MATERIALS_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { fieldErrorsOf, type SaveMaterialResult } from '../lib/save-result';

export type SaveTrainingModuleResult = SaveMaterialResult<keyof TrainingModuleRequest>;

const MODULE_GONE = 'Módulo não encontrado. Atualize a página e tente de novo.';

/** O id vai para o path da API: só uuid passa, para um valor montado à mão não virar outra rota. */
const idSchema = z.uuid();

function failure(error: unknown, fallback: string): { status: 'failed'; message: string } {
  return { status: 'failed', message: error instanceof ApiError ? error.message : fallback };
}

/**
 * Cria o módulo, ou troca o módulo inteiro quando vem com id. O schema é o do
 * formulário — é ele que impede um corpo montado à mão de contornar a tela.
 */
export async function saveTrainingModule(
  publicId: string | null,
  input: unknown,
): Promise<SaveTrainingModuleResult> {
  if (publicId !== null && !idSchema.safeParse(publicId).success) {
    return { status: 'failed', message: MODULE_GONE };
  }

  const parsed = trainingModuleSchema.safeParse(input);
  if (!parsed.success) return { status: 'invalid', fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await authedApiFetch(
      publicId ? `/admin/training-modules/${publicId}` : '/admin/training-modules',
      { method: publicId ? 'PUT' : 'POST', body: JSON.stringify(parsed.data) },
    );
  } catch (error) {
    return failure(error, 'Não foi possível salvar o módulo. Tente novamente.');
  }

  revalidatePath(MATERIALS_PATH);

  return { status: 'success' };
}

export async function deleteTrainingModule(publicId: string): Promise<SaveMaterialResult<never>> {
  if (!idSchema.safeParse(publicId).success) return { status: 'failed', message: MODULE_GONE };

  try {
    await authedApiFetch(`/admin/training-modules/${publicId}`, { method: 'DELETE' });
  } catch (error) {
    return failure(error, 'Não foi possível apagar o módulo. Tente novamente.');
  }

  revalidatePath(MATERIALS_PATH);

  return { status: 'success' };
}
