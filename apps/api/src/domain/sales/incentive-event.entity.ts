import { IncentiveErrorCodeEnum } from '@porto/contracts';

/**
 * A ação de negócio que a Porto Serviços pede. O nome do fio (`VENDA_REGISTRADA`,
 * ...) é traduzido na borda HTTP; o domínio só conhece este vocabulário, e por
 * isso ele não sai para `@porto/contracts` — a web nunca o lê.
 */
export enum IncentiveEventTypeEnum {
  SALE_REGISTERED = 'SALE_REGISTERED',
  SALE_COMPLETED = 'SALE_COMPLETED',
  SALE_NOT_COMPLETED = 'SALE_NOT_COMPLETED',
}

/** O que a chamada fez com a venda. */
export enum IncentiveEventOutcomeEnum {
  APPLIED = 'APPLIED',
  /** A mesma ação já tinha sido aplicada: respondemos 2xx sem mexer em nada. */
  DUPLICATE = 'DUPLICATE',
  REJECTED = 'REJECTED',
}

/**
 * Uma chamada recebida do webhook de incentivos, aplicada ou não. Append-only:
 * é o que responde ao suporte "por que esta venda não apareceu" sem pedir nada à
 * Porto, e o `payload` guardado inteiro é o que permite reprocessar.
 */
export interface IncentiveEventEntity {
  id: number;
  publicId: string;
  /** O `idEvento` da Porto — um por tentativa de envio, e por isso não é único. */
  eventId: string;
  /** Nulo quando a chamada foi recusada antes de a venda existir. */
  saleId: number | null;
  externalSaleId: string;
  eventType: IncentiveEventTypeEnum;
  outcome: IncentiveEventOutcomeEnum;
  rejectionCode: IncentiveErrorCodeEnum | null;
  payload: Record<string, unknown>;
  /** O `dataHoraEvento`: hora do envio pela Porto, não a da venda. */
  sentAt: Date;
  receivedAt: Date;
}
