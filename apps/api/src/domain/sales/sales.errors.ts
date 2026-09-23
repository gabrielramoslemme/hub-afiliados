import { IncentiveErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

/*
  Quem lê estas mensagens é o suporte da Porto Serviços, olhando para uma
  notificação que falhou. Cada uma diz o que aconteceu e, onde há, o que fazer.
*/

/**
 * Toda recusa do webhook tem código: é ele que vai para a trilha, e é por ele
 * que o suporte da Porto decide o que fazer.
 */
export abstract class IncentiveRefusalError extends DomainError {
  abstract override readonly code: IncentiveErrorCodeEnum;
}

export class UnknownSaleCouponError extends IncentiveRefusalError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;
  readonly code = IncentiveErrorCodeEnum.UNKNOWN_COUPON;

  constructor() {
    super('O cupom da venda não pertence a nenhum afiliado do programa.');
  }
}

export class SaleNotRegisteredError extends IncentiveRefusalError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = IncentiveErrorCodeEnum.SALE_NOT_REGISTERED;

  constructor() {
    super('A venda não foi registrada. Reenvie o evento VENDA_REGISTRADA antes deste.');
  }
}

export class SaleAlreadySettledError extends IncentiveRefusalError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = IncentiveErrorCodeEnum.SALE_ALREADY_SETTLED;

  constructor() {
    super('A venda já foi encerrada com outro desfecho e não pode ser reaberta.');
  }
}

export class InconsistentIncentiveEventError extends IncentiveRefusalError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = IncentiveErrorCodeEnum.INCONSISTENT_EVENT;

  constructor() {
    super('O tipo do evento não corresponde ao status do incentivo.');
  }
}

export class SaleCouponMismatchError extends IncentiveRefusalError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = IncentiveErrorCodeEnum.SALE_COUPON_MISMATCH;

  constructor() {
    super('A venda já foi registrada com outro cupom.');
  }
}
