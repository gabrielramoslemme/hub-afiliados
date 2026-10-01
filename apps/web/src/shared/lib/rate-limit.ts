interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimiter {
  /** Conta uma tentativa da chave e diz se ela ainda cabe na janela. */
  consume(key: string, now: number): boolean;
}

/** Acima disto, a próxima contagem varre as janelas que já fecharam. */
const PRUNE_ABOVE = 10_000;

/**
 * Janela fixa por chave, em memória. Vale para um processo só — é o que a
 * produção roda, um contêiner da web —, e reiniciar zera a contagem. É a
 * primeira barreira, não a única: a trava por conta da API continua valendo.
 */
export function createRateLimiter({ limit, windowMs }: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, { count: number; endsAt: number }>();

  function prune(now: number) {
    for (const [key, window] of windows) {
      if (window.endsAt <= now) windows.delete(key);
    }
  }

  return {
    consume(key, now) {
      const window = windows.get(key);

      if (!window || window.endsAt <= now) {
        if (windows.size > PRUNE_ABOVE) prune(now);
        windows.set(key, { count: 1, endsAt: now + windowMs });
        return true;
      }

      if (window.count >= limit) return false;

      window.count += 1;
      return true;
    },
  };
}
