'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  type PromotionalMaterialFormValues,
  promotionalMaterialFormSchema,
} from '@porto/contracts';
import { MATERIALS_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { fieldErrorsOf, type SaveMaterialResult } from '../lib/save-result';

export type SavePromotionalMaterialResult = SaveMaterialResult<keyof PromotionalMaterialFormValues>;

const MATERIAL_GONE = 'Material não encontrado. Atualize a página e tente de novo.';

const idSchema = z.uuid();

function failure(error: unknown, fallback: string): { status: 'failed'; message: string } {
  return { status: 'failed', message: error instanceof ApiError ? error.message : fallback };
}

/**
 * Cria o material, ou troca o material inteiro quando vem com id. Recebe o que o
 * formulário tem — tamanho em MB — e o schema entrega à API em bytes.
 */
export async function savePromotionalMaterial(
  publicId: string | null,
  input: unknown,
): Promise<SavePromotionalMaterialResult> {
  if (publicId !== null && !idSchema.safeParse(publicId).success) {
    return { status: 'failed', message: MATERIAL_GONE };
  }

  const parsed = promotionalMaterialFormSchema.safeParse(input);
  if (!parsed.success) return { status: 'invalid', fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await authedApiFetch(
      publicId ? `/admin/promotional-materials/${publicId}` : '/admin/promotional-materials',
      { method: publicId ? 'PUT' : 'POST', body: JSON.stringify(parsed.data) },
    );
  } catch (error) {
    return failure(error, 'Não foi possível salvar o material. Tente novamente.');
  }

  revalidatePath(MATERIALS_PATH);

  return { status: 'success' };
}

export async function deletePromotionalMaterial(
  publicId: string,
): Promise<SaveMaterialResult<never>> {
  if (!idSchema.safeParse(publicId).success) return { status: 'failed', message: MATERIAL_GONE };

  try {
    await authedApiFetch(`/admin/promotional-materials/${publicId}`, { method: 'DELETE' });
  } catch (error) {
    return failure(error, 'Não foi possível apagar o material. Tente novamente.');
  }

  revalidatePath(MATERIALS_PATH);

  return { status: 'success' };
}
