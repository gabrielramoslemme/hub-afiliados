'use server';

import { revalidatePath } from 'next/cache';
import {
  approveAffiliateSchema,
  type CouponAvailabilityResponse,
  rejectAffiliateSchema,
} from '@porto/contracts';
import { QUEUE_PATH } from '@/admin/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type DecisionResult = { ok: true } | { ok: false; message: string };

/** O que o campo do cupom precisa saber enquanto a analista digita. */
export type CouponAvailability = { available: boolean; reason: string | null };

const UNEXPECTED_FAILURE = 'Não foi possível registrar a decisão. Tente novamente.';
const AVAILABLE: CouponAvailability = { available: true, reason: null };

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

export async function approveAffiliate(publicId: string, input: unknown): Promise<DecisionResult> {
  const parsed = approveAffiliateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Informe o cupom.' };
  }

  // O schema normaliza: o código sobe em maiúsculas e o percentual como número,
  // que é o que o DTO da API aceita.
  return decide(publicId, 'approve', JSON.stringify(parsed.data));
}

/**
 * Conveniência do formulário, não autoridade: quem decide é a aprovação, que
 * responde 409 se o código tiver sido tomado no meio do caminho. Por isso
 * qualquer falha aqui — rede, 503 da Porto — devolve "disponível": travar o
 * botão de confirmar por causa de uma consulta seria pior que o 409.
 */
export async function checkCouponAvailability(code: string): Promise<CouponAvailability> {
  const parsed = approveAffiliateSchema.shape.couponCode.safeParse(code);

  if (!parsed.success) return AVAILABLE;

  try {
    const response = await authedApiFetch<CouponAvailabilityResponse>(
      `/admin/coupons/availability?code=${encodeURIComponent(parsed.data)}`,
    );

    return { available: response.available, reason: response.reason };
  } catch {
    return AVAILABLE;
  }
}

export async function rejectAffiliate(publicId: string, input: unknown): Promise<DecisionResult> {
  const parsed = rejectAffiliateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Informe o motivo.' };
  }

  return decide(publicId, 'reject', JSON.stringify(parsed.data));
}
