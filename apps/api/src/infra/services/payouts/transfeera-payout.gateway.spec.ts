import { Logger } from '@nestjs/common';
import { PixKeyTypeEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { RequestPayoutInput } from '@Domain/withdrawals/payout-gateway';
import {
  PayoutProviderAccessDeniedError,
  PayoutProviderUnavailableError,
  PayoutRefusedError,
} from '@Domain/withdrawals/withdrawals.errors';
import { AccessTokenProvider } from '../coupons/access-token-provider.interface';
import { TransfeeraPayoutGateway } from './transfeera-payout.gateway';

const API = 'https://api-sandbox.transfeera.com';
const REFERENCE = '40000000-0000-4000-8000-000000000001';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const input: RequestPayoutInput = {
  reference: REFERENCE,
  amountCents: 4010,
  pixKeyType: PixKeyTypeEnum.EMAIL,
  pixKey: 'pix.marina@email.com',
  holderCpf: '52998224725',
};

describe('TransfeeraPayoutGateway', () => {
  let fetchMock: jest.Mock;
  let tokenProvider: jest.Mocked<AccessTokenProvider>;
  let logged: jest.SpyInstance;
  let gateway: TransfeeraPayoutGateway;

  function sentBody(call = 0): Record<string, unknown> {
    return JSON.parse(fetchMock.mock.calls[call][1].body);
  }

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(json({ id: 1426 }, 200));
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
    logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    tokenProvider = {
      getAccessToken: jest.fn().mockResolvedValue('the-token'),
      invalidate: jest.fn(),
    };
    gateway = new TransfeeraPayoutGateway(
      {
        apiBaseUrl: API,
        userAgent: 'Porto Hub de Afiliados (afiliados@portoservico.com.br)',
        timeoutMs: 10_000,
        enabled: true,
      },
      tokenProvider,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('requestPayout', () => {
    it('creates an auto-closed batch with one transfer keyed by the withdrawal', async () => {
      await expect(gateway.requestPayout(input)).resolves.toEqual({ batchId: '1426' });

      expect(fetchMock.mock.calls[0][0]).toBe(`${API}/batch`);
      expect(sentBody()).toEqual({
        type: 'TRANSFERENCIA',
        name: `Saque ${REFERENCE}`,
        auto_close: true,
        transfers: [
          {
            value: 40.1,
            integration_id: REFERENCE,
            idempotency_key: REFERENCE,
            pix_description: 'Incentivo Porto Hub de Afiliados',
            destination_bank_account: { pix_key_type: 'EMAIL', pix_key: 'pix.marina@email.com' },
            pix_key_validation: { cpf_cnpj: '52998224725' },
          },
        ],
      });
    });

    it('sends the user agent and the bearer token', async () => {
      await gateway.requestPayout(input);

      const { headers } = fetchMock.mock.calls[0][1];
      expect(headers.Authorization).toBe('Bearer the-token');
      expect(headers['User-Agent']).toBe('Porto Hub de Afiliados (afiliados@portoservico.com.br)');
    });

    // A chave de telefone é guardada só com dígitos, com ou sem o país; a
    // Transfeera quer o formato internacional.
    it.each([
      ['11987654321', '+5511987654321'],
      ['1133334444', '+551133334444'],
      ['5511987654321', '+5511987654321'],
    ])('sends the phone key %s as %s', async (stored, sent) => {
      await gateway.requestPayout({ ...input, pixKeyType: PixKeyTypeEnum.PHONE, pixKey: stored });

      const [transfer] = sentBody().transfers as Array<{ destination_bank_account: unknown }>;
      expect(transfer.destination_bank_account).toEqual({
        pix_key_type: 'TELEFONE',
        pix_key: sent,
      });
    });

    it('confirms a repeated request instead of paying it twice', async () => {
      fetchMock.mockResolvedValue(json({ message: 'idempotency_key já utilizada' }, 409));

      await expect(gateway.requestPayout(input)).resolves.toEqual({ batchId: null });
    });

    // O formato da idempotência repetida não é documentado: se ela vier como
    // 400 falando da chave, lida como recusa devolveria ao saldo um PIX pago.
    it('confirms a repeated request the provider answers with a 400 about idempotency', async () => {
      fetchMock.mockResolvedValue(json({ message: 'Idempotency key already used' }, 400));

      await expect(gateway.requestPayout(input)).resolves.toEqual({ batchId: null });
    });

    // Lido como queda, o 422 deixaria o saque reservado à espera de uma
    // reconciliação que nunca o fecha.
    it('reads a 422 as a refusal', async () => {
      fetchMock.mockResolvedValue(json({ message: 'Chave PIX inválida' }, 422));

      await expect(gateway.requestPayout(input)).rejects.toBeInstanceOf(PayoutRefusedError);
    });

    it('reads a 400 as a refusal, without the key or the cpf in the reason or the log', async () => {
      fetchMock.mockResolvedValue(
        json({ message: 'Chave pix.marina@email.com não pertence ao CPF 52998224725' }, 400),
      );

      const error = (await gateway
        .requestPayout(input)
        .catch((thrown: unknown) => thrown)) as PayoutRefusedError;

      expect(error).toBeInstanceOf(PayoutRefusedError);
      expect(error.reason).not.toContain('pix.marina@email.com');
      expect(error.reason).not.toContain('52998224725');
      expect(JSON.stringify(logged.mock.calls)).not.toContain('pix.marina@email.com');
      expect(JSON.stringify(logged.mock.calls)).not.toContain('52998224725');
    });

    // A Transfeera pode devolver o CPF formatado mesmo quando mandamos só
    // dígitos; a redação não pode depender de bater byte a byte com o que
    // enviamos.
    it('reads a 400 as a refusal, without the formatted cpf in the reason or the log', async () => {
      fetchMock.mockResolvedValue(
        json({ message: 'Chave não pertence ao titular do CPF 529.982.247-25' }, 400),
      );

      const error = (await gateway
        .requestPayout(input)
        .catch((thrown: unknown) => thrown)) as PayoutRefusedError;

      expect(error).toBeInstanceOf(PayoutRefusedError);
      expect(error.reason).not.toContain('529.982.247-25');
      expect(JSON.stringify(logged.mock.calls)).not.toContain('529.982.247-25');
    });

    it('reads a 400 as a refusal, without the phone key in the format we sent it in the reason or the log', async () => {
      fetchMock.mockResolvedValue(
        json({ message: 'Chave +5511987654321 já pertence a outro titular' }, 400),
      );

      const error = (await gateway
        .requestPayout({ ...input, pixKeyType: PixKeyTypeEnum.PHONE, pixKey: '11987654321' })
        .catch((thrown: unknown) => thrown)) as PayoutRefusedError;

      expect(error).toBeInstanceOf(PayoutRefusedError);
      expect(error.reason).not.toContain('+5511987654321');
      expect(JSON.stringify(logged.mock.calls)).not.toContain('+5511987654321');
    });

    it.each([500, 502, 429])('reads a %s as the provider being down', async (status) => {
      fetchMock.mockResolvedValue(new Response('', { status }));

      await expect(gateway.requestPayout(input)).rejects.toThrow(PayoutProviderUnavailableError);
    });

    it('reads a timeout as the provider being down', async () => {
      fetchMock.mockRejectedValue(new DOMException('The operation was aborted', 'TimeoutError'));

      await expect(gateway.requestPayout(input)).rejects.toThrow(PayoutProviderUnavailableError);
    });

    it('renews the token once on a 401 and gives up on the second', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response('', { status: 401 }))
        .mockResolvedValueOnce(json({ id: 1427 }, 200));

      await expect(gateway.requestPayout(input)).resolves.toEqual({ batchId: '1427' });
      expect(tokenProvider.invalidate).toHaveBeenCalledTimes(1);

      fetchMock.mockResolvedValue(new Response('', { status: 401 }));
      await expect(gateway.requestPayout(input)).rejects.toThrow(PayoutProviderAccessDeniedError);
    });
  });

  describe('findPayout', () => {
    it('reads the single transfer of the batch', async () => {
      fetchMock.mockResolvedValue(
        json(
          [
            {
              id: '60040',
              integration_id: REFERENCE,
              status: 'FINALIZADO',
              receipt_url: 'https://r',
            },
          ],
          200,
        ),
      );

      const update = await gateway.findPayout('1426');

      expect(fetchMock.mock.calls[0][0]).toBe(`${API}/batch/1426/transfer`);
      expect(update).toEqual(
        expect.objectContaining({
          reference: REFERENCE,
          status: WithdrawalStatusEnum.PAID,
          receiptUrl: 'https://r',
        }),
      );
    });

    it('answers null for a batch without transfers or unknown to the provider', async () => {
      fetchMock.mockResolvedValueOnce(json([], 200));
      await expect(gateway.findPayout('1426')).resolves.toBeNull();

      fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
      await expect(gateway.findPayout('1426')).resolves.toBeNull();
    });
  });
});
