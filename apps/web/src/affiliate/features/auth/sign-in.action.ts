'use server';

import { redirect } from 'next/navigation';
import { type AffiliateLoginResponse, affiliateLoginSchema } from '@porto/contracts';
import { AFFILIATE_AREA_PATH } from '@/affiliate/shared/routes';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { signInMessageFor } from './errors';
import { createSession } from './session';

const UNEXPECTED_FAILURE = 'Não foi possível entrar agora. Tente novamente em instantes.';

export async function signIn(input: unknown): Promise<{ message: string } | never> {
  const parsed = affiliateLoginSchema.safeParse(input);

  if (!parsed.success) return { message: 'Informe e-mail e senha.' };

  try {
    const login = await publicApiFetch<AffiliateLoginResponse>('/affiliate/auth/login', {
      method: 'POST',
      // O schema já normalizou o e-mail; o action não repete a regra.
      body: JSON.stringify(parsed.data),
    });

    await createSession(login);
  } catch (error) {
    if (!(error instanceof ApiError)) return { message: UNEXPECTED_FAILURE };

    return { message: signInMessageFor(error.code, error.message) };
  }

  // Fora do try: o `redirect` do Next sinaliza por exceção, e um catch em volta
  // dele transformaria a navegação bem-sucedida numa falha de login.
  redirect(AFFILIATE_AREA_PATH);
}
