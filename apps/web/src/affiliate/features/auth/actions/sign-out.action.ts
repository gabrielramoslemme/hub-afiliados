'use server';

import { redirect } from 'next/navigation';
import { AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { destroySession } from '../session';

export async function signOut(): Promise<never> {
  try {
    // Encerra a sessão na API: só apagar o cookie deixaria o token valendo até
    // vencer, para quem o tivesse copiado antes.
    await affiliateApiFetch('/affiliate/auth/logout', { method: 'POST' });
  } catch {
    // Sessão que a API já não reconhece não tem o que encerrar: sair continua.
  }

  await destroySession();

  redirect(AFFILIATE_LOGIN_PATH);
}
