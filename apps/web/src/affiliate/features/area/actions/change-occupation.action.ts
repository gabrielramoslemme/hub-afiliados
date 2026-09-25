'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ChangeOccupationRequest, changeOccupationSchema } from '@porto/contracts';
import { AFFILIATE_AREA_PATH, AFFILIATE_SESSION_EXPIRED_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type ChangeOccupationResult =
  | { status: 'success' }
  | {
      status: 'invalid';
      fieldErrors: Partial<Record<keyof ChangeOccupationRequest, string>>;
    }
  | { status: 'failed'; message: string };

const UNEXPECTED_FAILURE =
  'Não foi possível alterar sua ocupação agora. Tente novamente em instantes.';

export async function changeOccupation(input: unknown): Promise<ChangeOccupationResult> {
  const parsed = changeOccupationSchema.safeParse(input);

  // Revalidar com o schema do formulário é o que impede um PATCH montado à mão
  // de contornar a tela.
  if (!parsed.success) {
    return {
      status: 'invalid',
      fieldErrors: { occupation: parsed.error.issues[0]?.message },
    };
  }

  try {
    await affiliateApiFetch('/affiliate/me/occupation', {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) return { status: 'failed', message: UNEXPECTED_FAILURE };

    // Mesma regra da leitura em `data.ts`: sessão recusada vira login.
    if (error.statusCode === 401 || error.statusCode === 403) {
      redirect(AFFILIATE_SESSION_EXPIRED_PATH);
    }

    return { status: 'failed', message: error.message };
  }

  revalidatePath(`${AFFILIATE_AREA_PATH}/perfil`);

  return { status: 'success' };
}
