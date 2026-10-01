import { ApiError } from '@/shared/http/api-error';

/** Recusado sem dizer quanto esperar: um minuto, para a tela ainda travar o botão. */
const FALLBACK_WAIT_SECONDS = 60;

/**
 * Quanto esperar antes de tentar de novo, quando a API recusou por excesso de
 * tentativas. Nulo para qualquer outra falha. Mora fora do `ApiError` porque o
 * resultado das actions atravessa para o cliente, e a classe não.
 */
export function retryAfterOf(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.statusCode !== 429) return null;

  return error.retryAfterSeconds ?? FALLBACK_WAIT_SECONDS;
}

/** A espera como um relógio, `14:59`: é o que a contagem na tela mostra. */
export function formatWait(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = String(whole % 60).padStart(2, '0');

  return `${minutes}:${rest}`;
}

/** A recusa por excesso de tentativas, pronta para o resultado de uma action. */
export function rateLimitOf(error: unknown): { message: string; retryAfterSeconds: number } | null {
  const retryAfterSeconds = retryAfterOf(error);

  return retryAfterSeconds === null
    ? null
    : { message: (error as Error).message, retryAfterSeconds };
}
