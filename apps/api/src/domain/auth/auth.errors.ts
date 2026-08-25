import { AuthErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

/**
 * Vale para e-mail desconhecido, senha errada e usuário que não é operador.
 * Distinguir "existe, mas não é do painel" de "não existe" transformaria o
 * login num oráculo de e-mails cadastrados.
 */
export class InvalidCredentialsError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAUTHORIZED;
  readonly code = AuthErrorCodeEnum.INVALID_CREDENTIALS;

  constructor() {
    super('E-mail ou senha inválidos.');
  }
}

export class PasswordNotSetError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAUTHORIZED;
  readonly code = AuthErrorCodeEnum.PASSWORD_NOT_SET;

  constructor() {
    super('Sua senha ainda não foi definida. Use o link enviado por e-mail.');
  }
}

export class AccountInactiveError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAUTHORIZED;
  readonly code = AuthErrorCodeEnum.ACCOUNT_INACTIVE;

  constructor() {
    super('Sua conta está inativa. Fale com o administrador.');
  }
}

/** Token válido de um operador que sumiu do banco: a sessão não vale mais. */
export class UnknownOperatorError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAUTHORIZED;
  readonly code = AuthErrorCodeEnum.INVALID_CREDENTIALS;

  constructor() {
    super('Sessão inválida. Entre novamente.');
  }
}
