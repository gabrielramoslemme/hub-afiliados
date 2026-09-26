import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { WithdrawalErrorCodeEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { requestWithdrawal } from './request-withdrawal.action';

jest.mock('@/shared/http/api-client', () => ({ affiliateApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const apiFetch = affiliateApiFetch as jest.MockedFunction<typeof affiliateApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

function withdrawal(status: WithdrawalStatusEnum) {
  return { id: 'w-1', status, amountCents: 4000, requestedAt: '2026-09-25T12:00:00Z' };
}

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue(withdrawal(WithdrawalStatusEnum.PROCESSING));
});

describe('requestWithdrawal', () => {
  it('asks the affiliate channel for the withdrawal, with no body', async () => {
    await requestWithdrawal();

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/me/withdrawals', { method: 'POST' });
  });

  it('tells the pix was sent and refreshes the wallet', async () => {
    await expect(requestWithdrawal()).resolves.toEqual({
      status: 'sent',
      message: 'PIX enviado. Assim que ele cair, o comprovante aparece no extrato.',
    });
    expect(revalidate).toHaveBeenCalledWith('/minha-conta/carteira');
  });

  it('tells a request still without answer is being processed, not that it failed', async () => {
    apiFetch.mockResolvedValue(withdrawal(WithdrawalStatusEnum.REQUESTED));

    await expect(requestWithdrawal()).resolves.toEqual({
      status: 'processing',
      message: 'Recebemos seu pedido. O PIX está em processamento.',
    });
  });

  // A recusa devolveu o saldo: a tela tem de mostrar o valor de volta.
  it('explains a refused pix and still refreshes the wallet', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, WithdrawalErrorCodeEnum.REFUSED, 'x'));

    await expect(requestWithdrawal()).resolves.toEqual({
      status: 'failed',
      message: 'O PIX foi recusado. Confira sua chave PIX no perfil e tente de novo.',
    });
    expect(revalidate).toHaveBeenCalledWith('/minha-conta/carteira');
  });

  it.each([
    [WithdrawalErrorCodeEnum.NO_BALANCE, 'Você não tem saldo para sacar.'],
    [
      WithdrawalErrorCodeEnum.UNAVAILABLE,
      'O saque está indisponível no momento. Tente mais tarde.',
    ],
  ])('translates %s', async (code, message) => {
    apiFetch.mockRejectedValue(new ApiError(409, code, 'texto da api'));

    await expect(requestWithdrawal()).resolves.toEqual({ status: 'failed', message });
  });

  it('sends a refused session to sign in again', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, null, 'x'));

    await expect(requestWithdrawal()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalled();
  });
});
