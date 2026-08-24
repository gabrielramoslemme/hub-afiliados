import { RegistrationErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

export class InvalidCpfError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = RegistrationErrorCodeEnum.INVALID_CPF;

  constructor() {
    super('Informe um CPF válido.');
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

export class EmailAlreadyRegisteredError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED;

  constructor() {
    super('Este e-mail já está cadastrado.');
  }
}

export class CpfAlreadyRegisteredError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED;

  constructor() {
    super('Este CPF já está cadastrado.');
  }
}
