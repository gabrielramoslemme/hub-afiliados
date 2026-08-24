'use server';

import { type CreateAffiliateResponse, createAffiliateSchema } from '@porto/contracts';
import { publicApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { fieldForErrorCode } from './errors';
import type { RegistrationFieldErrors, RegistrationResult } from './result';

const UNEXPECTED_FAILURE =
  'Não foi possível enviar seu cadastro agora. Tente novamente em instantes.';

export async function registerAffiliate(input: unknown): Promise<RegistrationResult> {
  const parsed = createAffiliateSchema.safeParse(input);

  // O cliente já validou com este mesmo schema; revalidar aqui é o que impede
  // que um POST montado à mão contorne o formulário.
  if (!parsed.success) {
    const fieldErrors: RegistrationFieldErrors = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof RegistrationFieldErrors;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }

    return { status: 'invalid', fieldErrors };
  }

  try {
    await publicApiFetch<CreateAffiliateResponse>('/affiliates', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });

    return { status: 'success' };
  } catch (error) {
    if (!(error instanceof ApiError)) return { status: 'failed', message: UNEXPECTED_FAILURE };

    const field = fieldForErrorCode(error.code);

    return field
      ? { status: 'invalid', fieldErrors: { [field]: error.message } }
      : { status: 'failed', message: error.message };
  }
}
