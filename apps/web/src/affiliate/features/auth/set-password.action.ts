'use server';

import { resetPasswordSchema } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { signInMessageFor } from './errors';

export type SetPasswordResult = { ok: true } | { ok: false; message: string };

const UNEXPECTED_FAILURE = 'Não foi possível criar sua senha agora. Tente novamente em instantes.';

/**
 * Revalida com o mesmo schema do formulário — é o que impede um POST montado à
 * mão de contornar a tela. A confirmação de senha morre aqui: ela existe para a
 * pessoa não errar a digitação, e a API não tem o que fazer com ela.
 */
export async function setPassword(input: unknown): Promise<SetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Revise os campos.' };
  }

  try {
    await publicApiFetch('/affiliate/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ token: parsed.data.token, password: parsed.data.password }),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) return { ok: false, message: UNEXPECTED_FAILURE };

    return { ok: false, message: signInMessageFor(error.code, error.message) };
  }

  return { ok: true };
}
