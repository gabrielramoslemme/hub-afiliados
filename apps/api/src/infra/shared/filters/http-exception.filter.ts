import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorCode } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

const STATUS_BY_KIND: Record<DomainErrorKindEnum, HttpStatus> = {
  [DomainErrorKindEnum.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [DomainErrorKindEnum.CONFLICT]: HttpStatus.CONFLICT,
  [DomainErrorKindEnum.INVALID_INPUT]: HttpStatus.BAD_REQUEST,
  [DomainErrorKindEnum.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [DomainErrorKindEnum.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [DomainErrorKindEnum.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
};

/**
 * O `ValidationPipe` manda uma lista com um item por campo inválido; um
 * `DomainError` manda uma frase só. Juntar os dois num texto único obrigaria
 * o cliente a separar de novo — melhor preservar a forma: array quando há
 * vários problemas para listar, string quando é uma sentença só.
 */
function normalizeMessage(message: unknown): string | string[] | undefined {
  if (Array.isArray(message)) return message;
  return typeof message === 'string' ? message : undefined;
}

interface ErrorDescription {
  status: number;
  code: ApiErrorCode | null;
  message: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, code, message } = this.describe(exception);

    if (status >= 500)
      this.logger.error(`${request.method} ${request.url}`, (exception as Error)?.stack);

    response.status(status).json({
      statusCode: status,
      code,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private describe(exception: unknown): ErrorDescription {
    if (exception instanceof DomainError) {
      return {
        status: STATUS_BY_KIND[exception.kind],
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const body =
        typeof payload === 'string' ? { message: payload } : (payload as Record<string, unknown>);
      return {
        status: exception.getStatus(),
        code: (body.code as ApiErrorCode | undefined) ?? null,
        message: normalizeMessage(body.message) ?? 'Erro',
      };
    }

    // Mensagem de erro inesperado não vai para o cliente: pode carregar detalhe de schema.
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: null, message: 'Erro interno' };
  }
}
