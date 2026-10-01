import 'server-only';

import { redirect } from 'next/navigation';
import type { AdminMeResponse } from '@porto/contracts';
import { SESSION_EXPIRED_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

/**
 * Quem está logado no painel, lido da API a cada página: sessão encerrada,
 * conta desativada ou perfil mudado aparecem na próxima navegação. Recusa de
 * sessão vira login pela sessão expirada, que apaga o cookie antes.
 */
export async function fetchOperator(): Promise<AdminMeResponse> {
  try {
    return await authedApiFetch<AdminMeResponse>('/admin/me', { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      redirect(SESSION_EXPIRED_PATH);
    }

    throw error;
  }
}
