'use server';

import { redirect } from 'next/navigation';
import { authedApiFetch } from '@/shared/http/api-client';
import { destroySession } from '../session';

export async function signOut(): Promise<void> {
  try {
    // Encerra a sessão na API: só apagar o cookie deixaria o token valendo até
    // vencer, para quem o tivesse copiado antes.
    await authedApiFetch('/admin/auth/logout', { method: 'POST' });
  } catch {
    // Sessão que a API já não reconhece não tem o que encerrar: sair continua.
  }

  await destroySession();

  redirect('/admin/login');
}
