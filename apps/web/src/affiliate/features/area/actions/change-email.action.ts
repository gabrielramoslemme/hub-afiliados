'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  type ApiErrorCode,
  AuthErrorCodeEnum,
  type ChangeEmailRequest,
  changeEmailSchema,
  RegistrationErrorCodeEnum,
} from '@porto/contracts';
import { AFFILIATE_AREA_PATH, AFFILIATE_SESSION_EXPIRED_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type ChangeEmailFieldErrors = Partial<Record<keyof ChangeEmailRequest, string>>;

export type ChangeEmailResult =
  | { status: 'success' }
  | { status: 'invalid'; fieldErrors: ChangeEmailFieldErrors }
  | { status: 'failed'; message: string };

const UNEXPECTED_FAILURE =
  'Não foi possível alterar seu e-mail agora. Tente novamente em instantes.';

/**
 * A mensagem sai daqui, pelo `code`: o "já está cadastrado" da API foi escrito
 * para o cadastro, e no perfil a pessoa já tem conta — o que ela precisa saber é
 * que o endereço é de outra.
 */
const FIELD_ERROR_BY_CODE: Partial<
  Record<ApiErrorCode, { field: keyof ChangeEmailRequest; message: string }>
> = {
  [AuthErrorCodeEnum.WRONG_PASSWORD]: {
    field: 'currentPassword',
    message: 'Senha incorreta. Confira e tente de novo.',
  },
  [RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED]: {
    field: 'email',
    message: 'Este e-mail já está em uso em outra conta.',
  },
};

export async function changeEmail(input: unknown): Promise<ChangeEmailResult> {
  const parsed = changeEmailSchema.safeParse(input);

  // Revalidar com o schema do formulário é o que impede um PATCH montado à mão
  // de contornar a tela.
  if (!parsed.success) {
    const fieldErrors: ChangeEmailFieldErrors = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof ChangeEmailRequest;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }

    return { status: 'invalid', fieldErrors };
  }

  try {
    await affiliateApiFetch('/affiliate/me/email', {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) return { status: 'failed', message: UNEXPECTED_FAILURE };

    // Mesma regra da leitura em `data.ts`: sessão recusada vira login.
    if (error.statusCode === 401 || error.statusCode === 403) {
      redirect(AFFILIATE_SESSION_EXPIRED_PATH);
    }

    const fieldError = error.code ? FIELD_ERROR_BY_CODE[error.code] : undefined;

    return fieldError
      ? { status: 'invalid', fieldErrors: { [fieldError.field]: fieldError.message } }
      : { status: 'failed', message: error.message };
  }

  revalidatePath(`${AFFILIATE_AREA_PATH}/perfil`);

  return { status: 'success' };
}
