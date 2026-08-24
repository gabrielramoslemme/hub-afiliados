'use server';

import { revalidatePath } from 'next/cache';
import { rejectAffiliateSchema } from '@porto/contracts';
import { QUEUE_PATH } from '@/core/admin-routes';
import { authedApiFetch } from '@/core/http/api-client';
import { ApiError } from '@/core/http/api-error';

export type DecisionResult = { ok: true } | { ok: false; message: string };

const UNEXPECTED_FAILURE = 'Não foi possível registrar a decisão. Tente novamente.';

async function decide(publicId: string, path: string, body?: string): Promise<DecisionResult> {
  try {
    await authedApiFetch(`/admin/affiliates/${publicId}/${path}`, { method: 'POST', body });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof ApiError ? error.message : UNEXPECTED_FAILURE,
    };
  }

  // A decisão muda a fila e o detalhe. Sem invalidar os dois, a analista volta
  // para a lista e vê o cadastro que acabou de decidir ainda em análise.
  revalidatePath(QUEUE_PATH);
  revalidatePath(`${QUEUE_PATH}/${publicId}`);

  return { ok: true };
}

export async function approveAffiliate(publicId: string): Promise<DecisionResult> {
  return decide(publicId, 'approve');
}

export async function rejectAffiliate(publicId: string, input: unknown): Promise<DecisionResult> {
  const parsed = rejectAffiliateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Informe o motivo.' };
  }

  return decide(publicId, 'reject', JSON.stringify(parsed.data));
}
