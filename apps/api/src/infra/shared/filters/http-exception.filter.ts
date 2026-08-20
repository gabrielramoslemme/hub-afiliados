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
};

/**
 * O contrato declara `message` como texto, e o `ValidationPipe` manda uma lista
 * com um item por campo. Sem juntar aqui, a mesma rota responderia ora string,
 * ora array, e o app teria de adivinhar qual das duas chegou.
 */
function joinMessages(message: unknown): string | undefined {
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' ? message : undefined;
}

interface ErrorDescription {
  status: number;
  code: ApiErrorCode | null;
  message: string;
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
        message: joinMessages(body.message) ?? 'Erro',
      };
    }

    // Mensagem de erro inesperado não vai para o cliente: pode carregar detalhe de schema.
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: null, message: 'Erro interno' };
  }
}
