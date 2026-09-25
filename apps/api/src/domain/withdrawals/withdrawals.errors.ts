import { WithdrawalErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

export class NoBalanceToWithdrawError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = WithdrawalErrorCodeEnum.NO_BALANCE;

  constructor() {
    super('Você não tem saldo para sacar.');
  }
}

/**
 * O fornecedor recusou o PIX de vez — chave inexistente, de outro titular. O
 * saque é encerrado e o valor volta ao saldo; `reason` é o motivo dele, já sem
 * chave nem CPF, para o painel.
 */
export class PayoutRefusedError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = WithdrawalErrorCodeEnum.REFUSED;

  constructor(readonly reason: string) {
    super('O PIX foi recusado. Confira sua chave PIX no perfil e tente de novo.');
  }
}

/** Sem credencial no ambiente: nem se tenta, para não reservar saldo que não sai. */
export class PayoutsDisabledError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAVAILABLE;
  readonly code = WithdrawalErrorCodeEnum.UNAVAILABLE;

  constructor() {
    super('O saque está indisponível no momento. Tente mais tarde.');
  }
}

/**
 * O fornecedor não respondeu — timeout, rede, 5xx. Não se sabe se o pedido
 * entrou: o saque fica `REQUESTED`, e a reconciliação repete com a mesma
 * referência. Nunca chega ao afiliado como erro.
 */
export class PayoutProviderUnavailableError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAVAILABLE;

  constructor() {
    super('O serviço de pagamento não respondeu.');
  }
}

/**
 * O fornecedor recusou a credencial da integração. Tratado como a queda —
 * repetir mais tarde, quando alguém corrigir o ambiente —, e separado dela
 * para o log dizer a quem avisar.
 */
export class PayoutProviderAccessDeniedError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAVAILABLE;

  constructor() {
    super('O serviço de pagamento recusou a credencial da integração.');
  }
}

export class WithdrawalNotFoundError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;

  constructor() {
    super('Saque não encontrado.');
  }
}

/**
 * O fornecedor citou uma referência que não é de saque nosso. 404, e não 200:
 * se foi o webhook chegando antes do commit do pedido, a próxima tentativa dele
 * encontra o saque.
 */
export class UnknownPayoutReferenceError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;

  constructor() {
    super('Saque não encontrado.');
  }
}
