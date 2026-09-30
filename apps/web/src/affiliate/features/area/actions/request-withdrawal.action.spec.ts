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
  // O valor não escolhe quanto sai: só faz a API recusar se o saldo mudou
  // desde que a pessoa o viu na tela.
  it('asks the affiliate channel for the withdrawal of the balance the affiliate confirmed', async () => {
    await requestWithdrawal(4000);

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/me/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ expectedCents: 4000 }),
    });
  });

  it('tells the pix was sent and refreshes the wallet', async () => {
    await expect(requestWithdrawal(4000)).resolves.toEqual({
      status: 'sent',
      message: 'PIX enviado. Assim que ele cair, o comprovante aparece no extrato.',
    });
    expect(revalidate).toHaveBeenCalledWith('/minha-conta/carteira');
  });

  it('tells a request still without answer is being processed, not that it failed', async () => {
    apiFetch.mockResolvedValue(withdrawal(WithdrawalStatusEnum.REQUESTED));

    await expect(requestWithdrawal(4000)).resolves.toEqual({
      status: 'processing',
      message: 'Recebemos seu pedido. O PIX está em processamento.',
    });
  });

  // A recusa devolveu o saldo: a tela tem de mostrar o valor de volta.
  it('explains a refused pix and still refreshes the wallet', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, WithdrawalErrorCodeEnum.REFUSED, 'x'));

    await expect(requestWithdrawal(4000)).resolves.toEqual({
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
    [
      WithdrawalErrorCodeEnum.BALANCE_CHANGED,
      'Seu saldo mudou. Confira o novo valor e confirme o saque de novo.',
    ],
  ])('translates %s', async (code, message) => {
    apiFetch.mockRejectedValue(new ApiError(409, code, 'texto da api'));

    await expect(requestWithdrawal(4000)).resolves.toEqual({ status: 'failed', message });
  });

  // O texto da API fala com o painel tanto quanto com a pessoa: fora do mapa,
  // a tela mostra a mensagem genérica, nunca o que a API escreveu.
  it.each([
    ['an unknown code', new ApiError(409, null, 'texto interno da api')],
    ['a failure that is no api error', new Error('socket hang up')],
  ])('falls back to a generic message on %s', async (_case, error) => {
    apiFetch.mockRejectedValue(error);

    await expect(requestWithdrawal(4000)).resolves.toEqual({
      status: 'failed',
      message: 'Não foi possível pedir o saque agora. Tente novamente em instantes.',
    });
  });

  it.each([401, 403])('sends a %s session to sign in again', async (status) => {
    apiFetch.mockRejectedValue(new ApiError(status, null, 'x'));

    await expect(requestWithdrawal(4000)).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/minha-conta/sessao-expirada');
  });
});
