'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  type AffiliateWithdrawalResponse,
  type ApiErrorCode,
  type RequestWithdrawalRequest,
  WithdrawalErrorCodeEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { AFFILIATE_SESSION_EXPIRED_PATH, AFFILIATE_WALLET_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';

export type RequestWithdrawalResult =
  | { status: 'sent'; message: string }
  | { status: 'processing'; message: string }
  | { status: 'failed'; message: string };

const UNEXPECTED_FAILURE = 'Não foi possível pedir o saque agora. Tente novamente em instantes.';

/** A mensagem sai daqui, pelo `code`: a da API fala com o painel tanto quanto com a pessoa. */
const MESSAGE_BY_CODE: Partial<Record<ApiErrorCode, string>> = {
  [WithdrawalErrorCodeEnum.NO_BALANCE]: 'Você não tem saldo para sacar.',
  [WithdrawalErrorCodeEnum.REFUSED]:
    'O PIX foi recusado. Confira sua chave PIX no perfil e tente de novo.',
  [WithdrawalErrorCodeEnum.UNAVAILABLE]: 'O saque está indisponível no momento. Tente mais tarde.',
  [WithdrawalErrorCodeEnum.BALANCE_CHANGED]:
    'Seu saldo mudou. Confira o novo valor e confirme o saque de novo.',
};

/**
 * Pede o saque do saldo inteiro. O valor e a chave são decididos pela API, a
 * partir do que está gravado — nada que a tela mande muda quanto sai nem para
 * onde. `expectedCents` é o saldo que a pessoa confirmou: se ele mudou desde que
 * a carteira abriu, a API recusa em vez de sacar um valor que ninguém viu.
 */
export async function requestWithdrawal(expectedCents: number): Promise<RequestWithdrawalResult> {
  const body: RequestWithdrawalRequest = { expectedCents };

  let withdrawal: AffiliateWithdrawalResponse;

  try {
    withdrawal = await affiliateApiFetch<AffiliateWithdrawalResponse>('/affiliate/me/withdrawals', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      redirect(AFFILIATE_SESSION_EXPIRED_PATH);
    }

    // A recusa devolveu o valor ao saldo, e a falha aparece no extrato: a
    // carteira precisa ser lida de novo mesmo quando o saque não saiu.
    revalidatePath(AFFILIATE_WALLET_PATH);

    const code = error instanceof ApiError ? error.code : null;
    return { status: 'failed', message: (code && MESSAGE_BY_CODE[code]) || UNEXPECTED_FAILURE };
  }

  revalidatePath(AFFILIATE_WALLET_PATH);

  return withdrawal.status === WithdrawalStatusEnum.REQUESTED
    ? { status: 'processing', message: 'Recebemos seu pedido. O PIX está em processamento.' }
    : {
        status: 'sent',
        message: 'PIX enviado. Assim que ele cair, o comprovante aparece no extrato.',
      };
}
