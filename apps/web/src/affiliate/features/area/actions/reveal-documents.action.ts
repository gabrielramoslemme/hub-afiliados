'use server';

import { redirect } from 'next/navigation';
import {
  type AffiliateDocumentsResponse,
  AuthErrorCodeEnum,
  type RevealDocumentsRequest,
  revealDocumentsSchema,
} from '@porto/contracts';
import { AFFILIATE_SESSION_EXPIRED_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { rateLimitOf } from '@/shared/lib/retry-after';

export type RevealDocumentsFieldErrors = Partial<Record<keyof RevealDocumentsRequest, string>>;

export type RevealDocumentsResult =
  | { status: 'success'; documents: AffiliateDocumentsResponse }
  | { status: 'invalid'; fieldErrors: RevealDocumentsFieldErrors }
  | { status: 'failed'; message: string; retryAfterSeconds?: number };

const UNEXPECTED_FAILURE =
  'Não foi possível mostrar seus documentos agora. Tente novamente em instantes.';

/**
 * CPF, RG e chave PIX inteiros, a pedido da própria pessoa e com a senha atual.
 * É uma ação, e não parte da leitura do perfil, para o valor inteiro só chegar ao
 * navegador depois do clique — na página ele não está, nem escondido.
 */
export async function revealDocuments(input: unknown): Promise<RevealDocumentsResult> {
  const parsed = revealDocumentsSchema.safeParse(input);

  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: { currentPassword: parsed.error.issues[0]?.message } };
  }

  try {
    const documents = await affiliateApiFetch<AffiliateDocumentsResponse>(
      '/affiliate/me/documents',
      { method: 'POST', body: JSON.stringify(parsed.data) },
    );

    return { status: 'success', documents };
  } catch (error) {
    const limited = rateLimitOf(error);
    if (limited) return { status: 'failed', ...limited };

    if (!(error instanceof ApiError)) return { status: 'failed', message: UNEXPECTED_FAILURE };

    if (error.statusCode === 401 || error.statusCode === 403) {
      redirect(AFFILIATE_SESSION_EXPIRED_PATH);
    }

    if (error.code === AuthErrorCodeEnum.WRONG_PASSWORD) {
      return {
        status: 'invalid',
        fieldErrors: { currentPassword: 'Senha incorreta. Confira e tente de novo.' },
      };
    }

    return { status: 'failed', message: error.message };
  }
}
