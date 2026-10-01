import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/**
 * A parte em memória do limite, zerável entre testes. O e2e inteiro conecta do
 * mesmo 127.0.0.1, e sem zerar a conta de um teste passaria para o seguinte.
 * Troca a instância em vez de esvaziar o mapa: o serviço guarda timers que
 * apontam para as chaves, e apagá-las por baixo quebraria o timer.
 */
export class ResettableThrottlerStorage implements ThrottlerStorage {
  private inner = new ThrottlerStorageService();

  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    return this.inner.increment(key, ttl, limit, blockDuration, throttlerName);
  }

  reset(): void {
    this.inner.onApplicationShutdown();
    this.inner = new ThrottlerStorageService();
  }
}
