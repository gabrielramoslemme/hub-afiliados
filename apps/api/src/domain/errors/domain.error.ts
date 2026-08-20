import { ApiErrorCode } from '@porto/contracts';

/**
 * Semântica da falha, não status HTTP: o mesmo use case pode ser chamado por
 * um webhook ou por um job, onde 403 não significa nada. Traduzir para o
 * protocolo é trabalho do `HttpExceptionFilter`.
 */
export enum DomainErrorKindEnum {
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
}

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKindEnum;

  /** Preenchido só quando o cliente precisa distinguir o caso para escolher a mensagem. */
  readonly code: ApiErrorCode | null = null;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
