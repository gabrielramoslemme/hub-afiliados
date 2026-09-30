'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  type PromotionalMaterialFormValues,
  promotionalMaterialFormSchema,
  reorderMaterialsSchema,
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

/**
 * A ordem nova, com todos os itens — é assim que a API confere que ninguém
 * criou ou apagou um item enquanto a tela estava aberta.
 */
export async function reorderPromotionalMaterials(
  ids: string[],
): Promise<SaveMaterialResult<never>> {
  const parsed = reorderMaterialsSchema.safeParse({ ids });
  if (!parsed.success) {
    return {
      status: 'failed',
      message:
        parsed.error.issues[0]?.message ??
        'Não foi possível salvar a nova ordem dos downloads. Tente novamente.',
    };
  }

  try {
    await authedApiFetch('/admin/promotional-materials/order', {
      method: 'PUT',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    return failure(error, 'Não foi possível salvar a nova ordem dos downloads. Tente novamente.');
  }

  revalidatePath(MATERIALS_PATH);

  return { status: 'success' };
}
