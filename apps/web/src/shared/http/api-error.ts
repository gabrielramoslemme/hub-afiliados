import type { ApiErrorCode } from '@porto/contracts';

/** Corpo de erro que o `HttpExceptionFilter` da API devolve, sempre nesta forma. */
export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode | null;
  message: string | string[];
  path: string;
  timestamp: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode | null;
  /** O `Retry-After` da recusa por excesso de tentativas, em segundos. */
  readonly retryAfterSeconds: number | null;

  constructor(
    statusCode: number,
    code: ApiErrorCode | null,
    message: string,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** A API já junta lista de validação numa frase só; o resto é defesa. */
export function messageOf(body: ApiErrorBody): string {
  return Array.isArray(body.message) ? body.message.join(' ') : body.message;
}
