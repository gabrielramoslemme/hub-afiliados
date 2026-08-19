import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

const STATUS_BY_KIND: Record<DomainErrorKindEnum, HttpStatus> = {
  [DomainErrorKindEnum.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [DomainErrorKindEnum.CONFLICT]: HttpStatus.CONFLICT,
  [DomainErrorKindEnum.INVALID_INPUT]: HttpStatus.BAD_REQUEST,
  [DomainErrorKindEnum.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [DomainErrorKindEnum.FORBIDDEN]: HttpStatus.FORBIDDEN,
};

interface ErrorDescription {
  status: number;
  code: AuthErrorCodeEnum | null;
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
        code: (body.code as AuthErrorCodeEnum | undefined) ?? null,
        message: (body.message as string | undefined) ?? 'Erro',
      };
    }

    // Mensagem de erro inesperado não vai para o cliente: pode carregar detalhe de schema.
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: null, message: 'Erro interno' };
  }
}
