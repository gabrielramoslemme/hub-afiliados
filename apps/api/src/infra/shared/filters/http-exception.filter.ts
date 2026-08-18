import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : { message: 'Erro interno' };
    const body = typeof payload === 'string' ? { message: payload } : (payload as Record<string, unknown>);

    if (status >= 500) this.logger.error(`${request.method} ${request.url}`, (exception as Error)?.stack);

    response.status(status).json({
      statusCode: status,
      code: body.code ?? null,
      message: body.message ?? 'Erro',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
