'use server';

import { forgotPasswordSchema } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';

export type ForgotPasswordResult = { ok: true } | { ok: false; message: string };

const UNEXPECTED_FAILURE = 'Não foi possível enviar o link agora. Tente novamente em instantes.';

/**
 * A API responde igual exista ou não conta com aquele e-mail, e a tela repete
 * isso: o resultado daqui nunca conta se havia alguém do outro lado. Só falha
 * de verdade — rede fora, 500 — vira mensagem de erro.
 */
export async function requestPasswordReset(input: unknown): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Revise o e-mail.' };
  }

  try {
    await publicApiFetch('/affiliate/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return { ok: false, message: UNEXPECTED_FAILURE };
  }

  return { ok: true };
}
