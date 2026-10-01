import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { RateLimitErrorCodeEnum } from '@porto/contracts';
import { clientAddress } from './client-address';

/** A espera arredondada para cima, em minutos: "1 minuto" é melhor que "0". */
export function retryMessage(seconds: number): string {
  const waitMinutes = Math.max(1, Math.ceil(seconds / 60));
  const unit = waitMinutes === 1 ? 'minuto' : 'minutos';

  return `Muitas tentativas. Tente de novo em ${waitMinutes} ${unit}.`;
}

/**
 * O `ThrottlerGuard` com duas trocas: a chave é o visitante que o CloudFront
 * viu, e a recusa sai no formato de erro da API, com `code`, para a tela
 * reconhecer o caso, e com o `Retry-After` de onde a tela tira a espera.
 */
@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  protected getTracker(request: Request): Promise<string> {
    return Promise.resolve(clientAddress(request.headers, request.ip ?? ''));
  }

  protected throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    // Com limite nomeado, a biblioteca escreve `Retry-After-<nome>`. A tela lê o
    // `Retry-After` padrão, então ele sai daqui, para qualquer limite.
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Retry-After', String(detail.timeToBlockExpire));

    throw new HttpException(
      {
        code: RateLimitErrorCodeEnum.TOO_MANY_REQUESTS,
        message: retryMessage(detail.timeToBlockExpire),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
