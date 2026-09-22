import { IncentiveStatusEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';
import { IncentiveEventEntity } from './incentive-event.entity';
import { SaleEntity } from './sale.entity';

export const SALE_REPOSITORY = createToken<SaleRepository>('SALE_REPOSITORY');

/** O evento que acompanha a escrita da venda, gravado como aplicado na mesma transação. */
export type AppliedIncentiveEvent = Pick<
  IncentiveEventEntity,
  'eventId' | 'externalSaleId' | 'eventType' | 'payload' | 'sentAt' | 'receivedAt'
>;

export interface RegisterSaleInput {
  couponId: number;
  externalId: string;
  amountCents: number;
  item: string;
  registeredAt: Date;
  event: AppliedIncentiveEvent;
}

export interface SettleSaleInput {
  saleId: number;
  toStatus: IncentiveStatusEnum.RELEASED | IncentiveStatusEnum.CANCELED;
  settledAt: Date;
  event: AppliedIncentiveEvent;
}

/**
 * A venda e o evento que a mudou são gravados juntos: venda sem trilha seria
 * dinheiro no extrato sem explicação, e trilha sem venda, uma chamada aplicada
 * que não aplicou nada.
 */
export interface SaleRepository {
  findByExternalId(externalId: string): Promise<SaleEntity | null>;
  /**
   * Cria a venda pendente. Nulo quando outra chamada criou a mesma venda antes —
   * é o índice único que decide, porque a leitura do use case não segura nada.
   */
  register(input: RegisterSaleInput): Promise<SaleEntity | null>;
  /**
   * Encerra a venda, conferindo debaixo do lock que ela ainda está pendente.
   * Nulo quando outra chamada a encerrou primeiro.
   */
  settle(input: SettleSaleInput): Promise<SaleEntity | null>;
}
