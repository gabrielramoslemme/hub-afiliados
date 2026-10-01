'use server';

import { forgotPasswordSchema } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type ForgotPasswordResult = { ok: true } | { ok: false; message: string };

const UNEXPECTED_FAILURE = 'Não foi possível enviar o link agora. Tente novamente em instantes.';

/**
 * Gêmeo do action do portal, e separado dele porque a fatia do painel não
 * alcança a do afiliado: o que muda é o canal da rota, e é ele que decide para
 * qual tela o link do e-mail aponta.
 */
export async function requestPasswordReset(input: unknown): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Revise o e-mail.' };
  }

  try {
    await publicApiFetch('/admin/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    // O limite por visitante do Next não fala da conta, e pode ser repetido.
    if (error instanceof ApiError && error.statusCode === 429) {
      return { ok: false, message: error.message };
    }

    return { ok: false, message: UNEXPECTED_FAILURE };
  }

  return { ok: true };
}
