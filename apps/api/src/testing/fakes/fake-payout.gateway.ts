import {
  PayoutGateway,
  PayoutRequestResult,
  PayoutUpdate,
  RequestPayoutInput,
} from '@Domain/withdrawals/payout-gateway';
import {
  PayoutProviderUnavailableError,
  PayoutRefusedError,
  PayoutsDisabledError,
} from '@Domain/withdrawals/withdrawals.errors';

export type FakePayoutResponse = 'accept' | 'refuse' | 'unavailable' | 'repeated';

/**
 * A Transfeera do e2e: registra em memória e responde o que o teste mandar.
 * Entra pelo `createE2eTestingModule` no lugar do `TransfeeraPayoutGateway` —
 * sem ela, o `AppModule` cru ficaria sem credencial e responderia WDR-003 a
 * todo saque. Sem pedido de resposta, aceita.
 */
export class FakePayoutGateway implements PayoutGateway {
  readonly requests: RequestPayoutInput[] = [];
  enabled = true;
  private responses: FakePayoutResponse[] = [];
  private readonly updates = new Map<string, PayoutUpdate>();
  private batches = 0;

  isEnabled(): boolean {
    return this.enabled;
  }

  /** As próximas respostas, na ordem. Depois delas, volta a aceitar. */
  respondNext(...responses: FakePayoutResponse[]): void {
    this.responses.push(...responses);
  }

  /** O que a consulta do lote devolve a partir de agora. */
  settleBatch(batchId: string, update: PayoutUpdate): void {
    this.updates.set(batchId, update);
  }

  async requestPayout(input: RequestPayoutInput): Promise<PayoutRequestResult> {
    if (!this.enabled) throw new PayoutsDisabledError();

    this.requests.push(input);
    const response = this.responses.shift() ?? 'accept';

    if (response === 'refuse') throw new PayoutRefusedError('Chave PIX não encontrada (fake)');
    if (response === 'unavailable') throw new PayoutProviderUnavailableError();
    if (response === 'repeated') return { batchId: null };

    this.batches += 1;
    return { batchId: `fake-batch-${this.batches}` };
  }

  async findPayout(batchId: string): Promise<PayoutUpdate | null> {
    return this.updates.get(batchId) ?? null;
  }

  reset(): void {
    this.requests.length = 0;
    this.responses = [];
    this.updates.clear();
    this.enabled = true;
  }
}
