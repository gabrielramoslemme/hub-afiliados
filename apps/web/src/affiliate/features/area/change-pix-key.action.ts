'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  type ApiErrorCode,
  AuthErrorCodeEnum,
  type ChangePixKeyRequest,
  changePixKeySchema,
  RegistrationErrorCodeEnum,
} from '@porto/contracts';
import { AFFILIATE_AREA_PATH, AFFILIATE_SESSION_EXPIRED_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type ChangePixKeyFieldErrors = Partial<Record<keyof ChangePixKeyRequest, string>>;

export type ChangePixKeyResult =
  | { status: 'success' }
  | { status: 'invalid'; fieldErrors: ChangePixKeyFieldErrors }
  | { status: 'failed'; message: string };

const UNEXPECTED_FAILURE =
  'Não foi possível alterar sua chave PIX agora. Tente novamente em instantes.';

/**
 * A mensagem sai daqui, pelo `code`, e não do texto da API: o erro de chave CPF
 * é o mesmo do cadastro, e lá ele fala do "CPF informado" — no perfil ninguém
 * digitou CPF nenhum além da própria chave.
 */
const FIELD_ERROR_BY_CODE: Partial<
  Record<ApiErrorCode, { field: keyof ChangePixKeyRequest; message: string }>
> = {
  [AuthErrorCodeEnum.WRONG_PASSWORD]: {
    field: 'currentPassword',
    message: 'Senha incorreta. Confira e tente de novo.',
  },
  [RegistrationErrorCodeEnum.PIX_KEY_INVALID]: {
    field: 'pixKey',
    message: 'Informe uma chave PIX válida para o tipo escolhido.',
  },
  [RegistrationErrorCodeEnum.PIX_KEY_MISMATCH]: {
    field: 'pixKey',
    message: 'A chave do tipo CPF precisa ser o CPF do seu cadastro.',
  },
};

export async function changePixKey(input: unknown): Promise<ChangePixKeyResult> {
  const parsed = changePixKeySchema.safeParse(input);

  // Revalidar com o schema do formulário é o que impede um PATCH montado à mão
  // de contornar a tela.
  if (!parsed.success) {
    const fieldErrors: ChangePixKeyFieldErrors = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof ChangePixKeyRequest;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }

    return { status: 'invalid', fieldErrors };
  }

  try {
    await affiliateApiFetch('/affiliate/me/pix-key', {
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
