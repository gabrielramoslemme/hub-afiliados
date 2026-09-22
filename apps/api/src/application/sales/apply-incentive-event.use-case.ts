import { IncentiveStatusEnum } from '@porto/contracts';
import { UseCase } from '@Application/use-case';
import { CouponEntity } from '@Domain/coupons/coupon.entity';
import { CouponRepository } from '@Domain/coupons/coupon.repository';
import { sanitizeCouponCode } from '@Domain/coupons/coupon-code.util';
import {
  IncentiveEventOutcomeEnum,
  IncentiveEventTypeEnum,
} from '@Domain/sales/incentive-event.entity';
import { IncentiveEventRepository } from '@Domain/sales/incentive-event.repository';
import { SaleEntity } from '@Domain/sales/sale.entity';
import { AppliedIncentiveEvent, SaleRepository } from '@Domain/sales/sale.repository';
import {
  IncentiveRefusalError,
  InconsistentIncentiveEventError,
  SaleAlreadySettledError,
  SaleCouponMismatchError,
  SaleNotRegisteredError,
  UnknownSaleCouponError,
} from '@Domain/sales/sales.errors';
import { Clock } from '@Domain/shared/clock';

export interface ApplyIncentiveEventInput {
  eventId: string;
  sentAt: Date;
  eventType: IncentiveEventTypeEnum;
  incentiveStatus: IncentiveStatusEnum;
  externalSaleId: string;
  couponCode: string;
  amountCents: number;
  item: string;
  /** A chamada como chegou, para a trilha. */
  payload: Record<string, unknown>;
}

export interface ApplyIncentiveEventOutput {
  /** Falso quando a mesma ação já tinha sido aplicada: a venda não mudou. */
  applied: boolean;
  salePublicId: string;
}

/**
 * O status que cada evento promete. A Porto já decidiu tudo antes de enviar;
 * um par que não bate é defeito de integração, e aplicar metade dele seria
 * adivinhar qual das duas metades estava certa.
 */
const STATUS_BY_EVENT: Record<IncentiveEventTypeEnum, IncentiveStatusEnum> = {
  [IncentiveEventTypeEnum.SALE_REGISTERED]: IncentiveStatusEnum.PENDING,
  [IncentiveEventTypeEnum.SALE_COMPLETED]: IncentiveStatusEnum.RELEASED,
  [IncentiveEventTypeEnum.SALE_NOT_COMPLETED]: IncentiveStatusEnum.CANCELED,
};

type Decision =
  | { kind: 'register' }
  | { kind: 'settle'; sale: SaleEntity; toStatus: SettledStatus }
  | { kind: 'repeat'; sale: SaleEntity }
  | { kind: 'refuse'; error: IncentiveRefusalError; sale: SaleEntity | null };

type SettledStatus = IncentiveStatusEnum.RELEASED | IncentiveStatusEnum.CANCELED;

/**
 * Aplica uma notificação de incentivo da Porto Serviços. A Porto decide se a
 * venda comissiona; aqui só se aplica o que chegou decidido, uma vez por venda e
 * tipo de evento — é a chave de idempotência que o contrato deles fixa, porque
 * o `idEvento` muda a cada reenvio.
 *
 * Toda chamada que chega ao use case entra na trilha, inclusive a recusada.
 */
export class ApplyIncentiveEventUseCase
  implements UseCase<ApplyIncentiveEventInput, ApplyIncentiveEventOutput>
{
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly saleRepository: SaleRepository,
    private readonly incentiveEventRepository: IncentiveEventRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ApplyIncentiveEventInput): Promise<ApplyIncentiveEventOutput> {
    const receivedAt = this.clock.now();

    if (STATUS_BY_EVENT[input.eventType] !== input.incentiveStatus) {
      return this.refuse(input, receivedAt, new InconsistentIncentiveEventError(), null);
    }

    // Cupom inativo continua valendo: a venda aconteceu quando ele estava ativo,
    // e desativar depois não pode tirar do afiliado o incentivo dela.
    const coupon = await this.couponRepository.findByCode(sanitizeCouponCode(input.couponCode));
    if (!coupon) return this.refuse(input, receivedAt, new UnknownSaleCouponError(), null);

    const event: AppliedIncentiveEvent = {
      eventId: input.eventId,
      externalSaleId: input.externalSaleId,
      eventType: input.eventType,
      payload: input.payload,
      sentAt: input.sentAt,
      receivedAt,
    };

    const firstTry = await this.apply(input, coupon, event);
    if (firstTry) return firstTry;

    // Outra chamada escreveu a mesma venda entre a leitura e a escrita. Relida,
    // ela já não pede escrita nenhuma: vira repetição ou conflito.
    const secondTry = await this.apply(input, coupon, event);
    if (secondTry) return secondTry;

    throw new Error(`Incentive event ${input.eventId} lost the race twice`);
  }

  /** Nulo quando a escrita perdeu a corrida para outra chamada da mesma venda. */
  private async apply(
    input: ApplyIncentiveEventInput,
    coupon: CouponEntity,
    event: AppliedIncentiveEvent,
  ): Promise<ApplyIncentiveEventOutput | null> {
    const current = await this.saleRepository.findByExternalId(input.externalSaleId);
    const decision = this.decide(input.eventType, current, coupon);

    switch (decision.kind) {
      case 'refuse':
        return this.refuse(input, event.receivedAt, decision.error, decision.sale);

      case 'repeat':
        await this.record(input, event.receivedAt, decision.sale, null);
        return { applied: false, salePublicId: decision.sale.publicId };

      case 'register': {
        const sale = await this.saleRepository.register({
          couponId: coupon.id,
          externalId: input.externalSaleId,
          amountCents: input.amountCents,
          item: input.item,
          // O melhor instante que o contrato oferece: `dataHoraEvento` é a hora
          // do envio, não a da venda, e a data real foi pedida à Porto.
          registeredAt: input.sentAt,
          event,
        });
        return sale && { applied: true, salePublicId: sale.publicId };
      }

      case 'settle': {
        const sale = await this.saleRepository.settle({
          saleId: decision.sale.id,
          toStatus: decision.toStatus,
          settledAt: input.sentAt,
          event,
        });
        return sale && { applied: true, salePublicId: sale.publicId };
      }
    }
  }

  private decide(
    eventType: IncentiveEventTypeEnum,
    sale: SaleEntity | null,
    coupon: CouponEntity,
  ): Decision {
    if (!sale) {
      return eventType === IncentiveEventTypeEnum.SALE_REGISTERED
        ? { kind: 'register' }
        : { kind: 'refuse', error: new SaleNotRegisteredError(), sale: null };
    }

    if (sale.couponId !== coupon.id) {
      return { kind: 'refuse', error: new SaleCouponMismatchError(), sale };
    }

    // Registro de venda que já existe — pendente ou encerrada — não muda nada:
    // venda encerrada não reabre.
    if (eventType === IncentiveEventTypeEnum.SALE_REGISTERED) return { kind: 'repeat', sale };

    const toStatus = STATUS_BY_EVENT[eventType] as SettledStatus;

    if (sale.incentiveStatus === IncentiveStatusEnum.PENDING) {
      return { kind: 'settle', sale, toStatus };
    }

    return sale.incentiveStatus === toStatus
      ? { kind: 'repeat', sale }
      : { kind: 'refuse', error: new SaleAlreadySettledError(), sale };
  }

  private async refuse(
    input: ApplyIncentiveEventInput,
    receivedAt: Date,
    error: IncentiveRefusalError,
    sale: SaleEntity | null,
  ): Promise<never> {
    await this.record(input, receivedAt, sale, error);
    throw error;
  }

  private record(
    input: ApplyIncentiveEventInput,
    receivedAt: Date,
    sale: SaleEntity | null,
    error: IncentiveRefusalError | null,
  ): Promise<void> {
    return this.incentiveEventRepository.record({
      eventId: input.eventId,
      saleId: sale?.id ?? null,
      externalSaleId: input.externalSaleId,
      eventType: input.eventType,
      outcome: error ? IncentiveEventOutcomeEnum.REJECTED : IncentiveEventOutcomeEnum.DUPLICATE,
      rejectionCode: error?.code ?? null,
      payload: input.payload,
      sentAt: input.sentAt,
      receivedAt,
    });
  }
}
