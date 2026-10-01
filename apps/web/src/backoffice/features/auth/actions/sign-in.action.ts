'use server';

import { redirect } from 'next/navigation';
import { type AdminLoginResponse, adminLoginSchema } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { rateLimitOf } from '@/shared/lib/retry-after';
import { signInMessageFor } from '../lib/errors';
import { safeAdminTarget } from '../lib/redirect-target';
import { createSession } from '../session';

const UNEXPECTED_FAILURE = 'Não foi possível entrar agora. Tente novamente em instantes.';

export async function signIn(
  input: unknown,
  target?: string,
): Promise<{ message: string; retryAfterSeconds?: number } | never> {
  const parsed = adminLoginSchema.safeParse(input);

  if (!parsed.success) return { message: 'Informe e-mail e senha.' };

  try {
    const login = await publicApiFetch<AdminLoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });

    await createSession(login);
  } catch (error) {
    const limited = rateLimitOf(error);
    if (limited) return limited;

    if (!(error instanceof ApiError)) return { message: UNEXPECTED_FAILURE };

    return { message: signInMessageFor(error.code, error.message) };
  }

  // Fora do try: o `redirect` do Next sinaliza por exceção, e um catch em volta
  // dele transformaria a navegação bem-sucedida numa falha de login.
  redirect(safeAdminTarget(target));
}
