import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';
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
 * reconhecer o caso. O `Retry-After` o guard original já escreve.
 */
@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  protected getTracker(request: Request): Promise<string> {
    return Promise.resolve(clientAddress(request.headers, request.ip ?? ''));
  }

  protected throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        code: RateLimitErrorCodeEnum.TOO_MANY_REQUESTS,
        message: retryMessage(detail.timeToBlockExpire),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
