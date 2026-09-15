import { CouponErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

export class InvalidCouponCodeError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;

  constructor() {
    super('Use de 4 a 20 caracteres, apenas letras e números.');
  }
}

export class CouponCodeUnavailableError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = CouponErrorCodeEnum.CODE_UNAVAILABLE;

  constructor() {
    super('Este código de cupom já está em uso. Escolha outro.');
  }
}

/**
 * O fornecedor não respondeu — timeout, rede ou 5xx. Separado do conflito de
 * propósito: aqui a analista tenta de novo com o mesmo código, lá ela precisa
 * de outro. O corpo cru da resposta deles fica no log, nunca na tela.
 */
export class CouponProviderUnavailableError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAVAILABLE;
  readonly code = CouponErrorCodeEnum.PROVIDER_UNAVAILABLE;

  constructor() {
    super('A Porto Serviços não respondeu. Tente novamente em instantes.');
  }
}

/**
 * O fornecedor recusou a credencial da integração. Separado de
 * `CouponProviderUnavailableError` de propósito: lá a analista tenta de novo,
 * aqui repetir não muda nada — credencial errada, revogada ou sem permissão é
 * configuração do ambiente, e dizer "tente novamente" a mandaria insistir no que
 * não depende dela. O corpo cru da recusa fica no log.
 */
export class CouponProviderAccessDeniedError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAVAILABLE;
  readonly code = CouponErrorCodeEnum.PROVIDER_ACCESS_DENIED;

  constructor() {
    super(
      'A Porto Serviços recusou o acesso da integração. Avise o suporte técnico: tentar de novo não resolve.',
    );
  }
}

/**
 * Sem `code`: como em `AffiliateNotFoundError`, o painel não escolhe mensagem
 * por ele. Cobre os dois desencontros — o afiliado que ainda não tem cupom
 * porque não foi aprovado, e o cupom que existe aqui e não existe lá.
 */
export class CouponNotFoundError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;

  constructor() {
    super('Cupom não encontrado.');
  }
}

/**
 * A Porto recusou os dados — o 400 do INT-01, na emissão, na consulta ou na
 * alteração. Separado de `CouponProviderUnavailableError` de propósito: aqui
 * repetir não resolve, e a analista precisa mudar o que pediu. Separado também
 * de `CouponCodeUnavailableError`: trocar o código pode não ser o caso. O corpo
 * cru deles fica no log.
 */
export class CouponRefusedError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = CouponErrorCodeEnum.REFUSED;

  constructor() {
    super('A Porto Serviços recusou os dados do cupom. Revise o código e o percentual.');
  }
}

/** O PATCH chegou sem nada para mudar: recusado antes de virar volta de rede. */
export class EmptyCouponChangeError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;

  constructor() {
    super('Altere o status ou o percentual de desconto.');
  }
}
