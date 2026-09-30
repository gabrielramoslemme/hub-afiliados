'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  AFFILIATE_MATERIALS_PATH,
  AFFILIATE_SESSION_EXPIRED_PATH,
} from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type CompleteTrainingModuleResult = { ok: true } | { ok: false; message: string };

const MODULE_GONE = 'Módulo não encontrado. Atualize a página e tente de novo.';
const UNEXPECTED_FAILURE = 'Não foi possível marcar o módulo agora. Tente novamente em instantes.';

/** O id vai para o path da API: só uuid passa, para um valor montado à mão não virar outra rota. */
const moduleIdSchema = z.uuid();

export async function completeTrainingModule(
  modulePublicId: string,
): Promise<CompleteTrainingModuleResult> {
  if (!moduleIdSchema.safeParse(modulePublicId).success) return { ok: false, message: MODULE_GONE };

  try {
    await affiliateApiFetch(`/affiliate/me/training-modules/${modulePublicId}/completion`, {
      method: 'PUT',
    });
  } catch (error) {
    if (!(error instanceof ApiError)) return { ok: false, message: UNEXPECTED_FAILURE };

    // Mesma regra da leitura em `data.ts`: sessão recusada vira login.
    if (error.statusCode === 401 || error.statusCode === 403) {
      redirect(AFFILIATE_SESSION_EXPIRED_PATH);
    }

    // O operador pode ter apagado o módulo enquanto a aba estava aberta.
    return { ok: false, message: error.statusCode === 404 ? MODULE_GONE : UNEXPECTED_FAILURE };
  }

  revalidatePath(AFFILIATE_MATERIALS_PATH);

  return { ok: true };
}
