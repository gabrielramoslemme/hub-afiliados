import { createToken } from '@Domain/shared/token';
import { PayoutEventEntity } from './payout-event.entity';

export const PAYOUT_EVENT_REPOSITORY =
  createToken<PayoutEventRepository>('PAYOUT_EVENT_REPOSITORY');

export type RecordStandalonePayoutEventInput = Omit<PayoutEventEntity, 'id' | 'publicId'>;

/**
 * A trilha do fornecedor. O evento que muda um saque é gravado junto com a
 * mudança, dentro do `WithdrawalRepository`; aqui entra só o que não muda saque
 * nenhum — o objeto que não é transferência, o corpo que não se lê.
 */
export interface PayoutEventRepository {
  record(input: RecordStandalonePayoutEventInput): Promise<void>;
  /** Da mais antiga para a mais recente. */
  listByWithdrawal(withdrawalId: number): Promise<PayoutEventEntity[]>;
}
