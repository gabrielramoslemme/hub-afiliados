import { RegistrationErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

export class InvalidCpfError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = RegistrationErrorCodeEnum.INVALID_CPF;

  constructor() {
    super('Informe um CPF válido.');
  }
}

export class InvalidRgError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = RegistrationErrorCodeEnum.INVALID_RG;

  constructor() {
    super('Informe um RG válido.');
  }
}

export class InvalidPixKeyError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = RegistrationErrorCodeEnum.PIX_KEY_INVALID;

  constructor() {
    super('Informe uma chave PIX válida para o tipo escolhido.');
  }
}

export class PixKeyMismatchError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = RegistrationErrorCodeEnum.PIX_KEY_MISMATCH;

  constructor() {
    super('A chave PIX do tipo CPF precisa ser igual ao CPF informado.');
  }
}

export class TermsNotAcceptedError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = RegistrationErrorCodeEnum.TERMS_NOT_ACCEPTED;

  constructor() {
    super('É preciso aceitar o Regulamento do programa.');
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED;

  constructor() {
    super('Este e-mail já está cadastrado.');
  }
}

/** Sem `code`: o painel não escolhe mensagem por ele, só mostra a que veio. */
export class AffiliateNotFoundError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;

  constructor() {
    super('Afiliado não encontrado.');
  }
}

export class AffiliateAlreadyDecidedError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;

  constructor() {
    super('Este cadastro já foi decidido e não pode ser decidido de novo.');
  }
}

export class CpfAlreadyRegisteredError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED;

  constructor() {
    super('Este CPF já está cadastrado.');
  }
}

export class RgAlreadyRegisteredError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = RegistrationErrorCodeEnum.RG_ALREADY_REGISTERED;

  constructor() {
    super('Este RG já está cadastrado.');
  }
}
