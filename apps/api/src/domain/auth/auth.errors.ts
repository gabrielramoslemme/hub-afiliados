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

/**
 * Cadastro ainda em análise não entra. É 403 e não 401 de propósito: a
 * credencial está certa, o que falta é a decisão da Porto — e a tela precisa
 * distinguir "errei a senha" de "espere o e-mail".
 */
export class RegistrationUnderReviewError extends DomainError {
  readonly kind = DomainErrorKindEnum.FORBIDDEN;
  readonly code = AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW;

  constructor() {
    super('Cadastro em análise.');
  }
}

export class RegistrationRejectedError extends DomainError {
  readonly kind = DomainErrorKindEnum.FORBIDDEN;
  readonly code = AuthErrorCodeEnum.REGISTRATION_REJECTED;

  constructor() {
    super('Cadastro não aprovado.');
  }
}

/**
 * Link de definir ou de redefinir senha usado, vencido ou adulterado — os três
 * dão o mesmo, e o do outro canal também.
 */
export class InvalidResetTokenError extends DomainError {
  readonly kind = DomainErrorKindEnum.INVALID_INPUT;
  readonly code = AuthErrorCodeEnum.INVALID_TOKEN;

  constructor() {
    super('Este link não vale mais. Peça um novo em "Esqueci minha senha".');
  }
}

/** Token de afiliado cujo usuário sumiu, ou que nunca teve perfil de afiliado. */
export class UnknownAffiliateError extends DomainError {
  readonly kind = DomainErrorKindEnum.UNAUTHORIZED;
  readonly code = AuthErrorCodeEnum.INVALID_CREDENTIALS;

  constructor() {
    super('Sessão inválida. Entre novamente.');
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
