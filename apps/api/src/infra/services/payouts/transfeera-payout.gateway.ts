import { Logger } from '@nestjs/common';
import { PixKeyTypeEnum } from '@porto/contracts';
import {
  PayoutGateway,
  PayoutRequestResult,
  PayoutUpdate,
  RequestPayoutInput,
} from '@Domain/withdrawals/payout-gateway';
import {
  PayoutProviderAccessDeniedError,
  PayoutProviderUnavailableError,
  PayoutRefusedError,
  PayoutsDisabledError,
} from '@Domain/withdrawals/withdrawals.errors';
import { AccessTokenProvider } from '../coupons/access-token-provider.interface';
import { TransfeeraTransfer, toPayoutUpdate } from './transfeera-transfer';

export interface TransfeeraGatewayConfig {
  apiBaseUrl: string;
  userAgent: string;
  timeoutMs: number;
  /** Falso sem credencial no ambiente. */
  enabled: boolean;
}

const PIX_KEY_TYPES: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'EMAIL',
  [PixKeyTypeEnum.CPF]: 'CPF',
  [PixKeyTypeEnum.PHONE]: 'TELEFONE',
};

/* 400 e 422 são a Transfeera recusando os dados — em geral a chave. Repetir não resolve. */
const REFUSALS = new Set([400, 422]);

const FALLBACK_REASON = 'Recusado pela Transfeera';

/** A chave de telefone é guardada só com dígitos; com DDD e sem país, ganha o +55. */
function toTransfeeraPixKey(type: PixKeyTypeEnum, key: string): string {
  if (type !== PixKeyTypeEnum.PHONE) return key;

  return key.length <= 11 ? `+55${key}` : `+${key}`;
}

/** Centavos inteiros divididos por 100 dão no máximo duas casas; o `toFixed` tira a sobra do float. */
function toReais(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * A Transfeera responde a idempotência repetida com erro, e o formato dele não
 * está documentado. O que se sabe: é recusa do pedido, e o texto fala da chave
 * de idempotência. Conferir no sandbox antes de produção.
 */
function isRepeatedRequest(status: number, text: string): boolean {
  return status === 409 || (REFUSALS.has(status) && /idempot/i.test(text));
}

/** O motivo da recusa, sem a chave nem o CPF que a Transfeera às vezes cita. */
function scrubbedReason(text: string, secrets: string[]): string {
  let reason = FALLBACK_REASON;

  try {
    const body = JSON.parse(text) as { message?: unknown; error?: unknown };
    const candidate = body.message ?? body.error;
    if (typeof candidate === 'string' && candidate.trim()) reason = candidate.trim();
  } catch {
    // Corpo que não é JSON: fica o motivo genérico, e o status vai para o log.
  }

  return secrets
    .filter(Boolean)
    .reduce((clean, secret) => clean.split(secret).join('[removido]'), reason);
}

/**
 * O pagamento por PIX na Transfeera: um lote por saque, fechado na criação,
 * com uma transferência só. `integration_id` e `idempotency_key` são o
 * `publicId` do saque — a referência pela qual o webhook e a reconciliação o
 * encontram, e a garantia de que repetir o pedido não paga duas vezes.
 */
export class TransfeeraPayoutGateway implements PayoutGateway {
  private readonly logger = new Logger(TransfeeraPayoutGateway.name);

  constructor(
    private readonly config: TransfeeraGatewayConfig,
    private readonly tokenProvider: AccessTokenProvider,
  ) {}

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async requestPayout(input: RequestPayoutInput): Promise<PayoutRequestResult> {
    if (!this.config.enabled) throw new PayoutsDisabledError();

    const response = await this.request('POST', '/batch', {
      type: 'TRANSFERENCIA',
      name: `Saque ${input.reference}`,
      auto_close: true,
      transfers: [
        {
          value: toReais(input.amountCents),
          integration_id: input.reference,
          idempotency_key: input.reference,
          pix_description: 'Incentivo Porto Hub de Afiliados',
          destination_bank_account: {
            pix_key_type: PIX_KEY_TYPES[input.pixKeyType],
            pix_key: toTransfeeraPixKey(input.pixKeyType, input.pixKey),
          },
          // O CPF do afiliado em toda chave, não só na do tipo CPF: é assim que
          // a Transfeera recusa a chave de e-mail ou telefone de outra pessoa.
          pix_key_validation: { cpf_cnpj: input.holderCpf },
        },
      ],
    });

    if (response.ok) {
      const body = (await response.json().catch(() => null)) as { id?: unknown } | null;

      if (typeof body?.id !== 'string' && typeof body?.id !== 'number') {
        this.logger.error(`Lote criado sem id na resposta da Transfeera (${response.status})`);
        throw new PayoutProviderUnavailableError();
      }

      return { batchId: String(body.id) };
    }

    const text = await response.text().catch(() => '');

    if (isRepeatedRequest(response.status, text)) {
      this.logger.warn(`A Transfeera já tinha o saque ${input.reference}; seguindo como aceito`);
      return { batchId: null };
    }

    const reason = scrubbedReason(text, [input.pixKey, input.holderCpf]);
    this.logger.error(
      `Recusa da Transfeera ao criar o lote do saque ${input.reference}: ${response.status} ${reason}`,
    );

    if (REFUSALS.has(response.status)) throw new PayoutRefusedError(reason);
    throw new PayoutProviderUnavailableError();
  }

  async findPayout(batchId: string): Promise<PayoutUpdate | null> {
    const response = await this.request('GET', `/batch/${encodeURIComponent(batchId)}/transfer`);

    if (response.status === 404) return null;
    if (!response.ok) {
      this.logger.error(`Falha ao consultar o lote ${batchId} na Transfeera: ${response.status}`);
      throw new PayoutProviderUnavailableError();
    }

    const body = (await response.json().catch(() => null)) as unknown;
    const transfers = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown } | null)?.data)
        ? (body as { data: unknown[] }).data
        : null;

    if (!transfers) {
      this.logger.error(`Consulta do lote ${batchId} fora do formato da Transfeera`);
      throw new PayoutProviderUnavailableError();
    }

    // Um lote por saque, uma transferência por lote.
    const [transfer] = transfers as TransfeeraTransfer[];

    return transfer ? toPayoutUpdate(transfer, transfer as Record<string, unknown>) : null;
  }

  private async request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
    const first = await this.send(method, path, body);
    if (first.status !== 401) return this.refuseForbidden(first);

    // Token revogado ou vencido antes da hora: descarta e tenta uma vez.
    this.tokenProvider.invalidate();
    const second = await this.send(method, path, body);

    if (second.status === 401) {
      this.logger.error('A Transfeera recusou o token recém-emitido');
      throw new PayoutProviderAccessDeniedError();
    }

    return this.refuseForbidden(second);
  }

  private refuseForbidden(response: Response): Response {
    if (response.status !== 403) return response;

    this.logger.error('A Transfeera recusou o acesso da integração (403)');
    throw new PayoutProviderAccessDeniedError();
  }

  private async send(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Response> {
    const token = await this.tokenProvider.getAccessToken();

    try {
      return await fetch(`${this.config.apiBaseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': this.config.userAgent,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const cause = (error as Error)?.cause;
      const reason = cause instanceof Error ? `: ${cause.message}` : '';
      this.logger.error(`Falha de rede com a Transfeera em ${method} ${path}${reason}`);
      throw new PayoutProviderUnavailableError();
    }
  }
}
