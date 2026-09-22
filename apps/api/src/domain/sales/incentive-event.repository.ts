import { createToken } from '@Domain/shared/token';
import { IncentiveEventEntity } from './incentive-event.entity';

export const INCENTIVE_EVENT_REPOSITORY = createToken<IncentiveEventRepository>(
  'INCENTIVE_EVENT_REPOSITORY',
);

export type RecordIncentiveEventInput = Omit<IncentiveEventEntity, 'id' | 'publicId'>;

/**
 * Grava a chamada que **não** mudou a venda — repetida ou recusada. A aplicada é
 * gravada pelo `SaleRepository`, na transação da própria venda.
 */
export interface IncentiveEventRepository {
  record(input: RecordIncentiveEventInput): Promise<void>;
}
