'use server';

import { revalidatePath } from 'next/cache';
import { changeCouponSchema } from '@porto/contracts';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type ChangeCouponResult = { ok: true } | { ok: false; message: string };

const UNEXPECTED_FAILURE = 'Não foi possível alterar o cupom. Tente novamente.';

/**
 * Manda só o que mudou: o INT-01 trata campo ausente como "não mexe", e o
 * diálogo já descarta o que a analista não tocou. O schema é o do formulário —
 * é ele que impede um PATCH vazio, montado à mão, de virar volta de rede.
 */
export async function changeCoupon(publicId: string, input: unknown): Promise<ChangeCouponResult> {
  const parsed = changeCouponSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Altere o status ou o percentual de desconto.',
    };
  }

  try {
    await authedApiFetch(`/admin/affiliates/${publicId}/coupon`, {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    return { ok: false, message: error instanceof ApiError ? error.message : UNEXPECTED_FAILURE };
  }

  // O detalhe mostra o cupom e a trilha, e os dois acabaram de mudar.
  revalidatePath(`${QUEUE_PATH}/${publicId}`);

  return { ok: true };
}
