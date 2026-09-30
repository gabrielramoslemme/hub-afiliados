import 'server-only';

import { redirect } from 'next/navigation';
import type { AdminPromotionalMaterial, AdminTrainingModule } from '@porto/contracts';
import { SESSION_EXPIRED_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

/** Outro operador pode ter mexido na trilha entre uma abertura e outra. */
const FRESH: RequestInit = { cache: 'no-store' };

/** Mesma regra da fila: sessão recusada vira login, não tela quebrada. */
async function readOrSignIn<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      redirect(SESSION_EXPIRED_PATH);
    }

    throw error;
  }
}

export function fetchTrainingModules(): Promise<AdminTrainingModule[]> {
  return readOrSignIn(() =>
    authedApiFetch<AdminTrainingModule[]>('/admin/training-modules', FRESH),
  );
}

export function fetchPromotionalMaterials(): Promise<AdminPromotionalMaterial[]> {
  return readOrSignIn(() =>
    authedApiFetch<AdminPromotionalMaterial[]>('/admin/promotional-materials', FRESH),
  );
}
