import { ThrottlerStorage } from '@nestjs/throttler';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/**
 * Manda cada limite para o armazenamento que ele merece. O curto — login,
 * senha, cadastro — vai para o persistente, que sobrevive a deploy. O folgado
 * vale em toda requisição e fica em memória: no banco, seria uma escrita por
 * chamada para guardar uma conta que perder num deploy não custa nada.
 */
export class RoutedThrottlerStorage implements ThrottlerStorage {
  constructor(
    private readonly memory: ThrottlerStorage,
    private readonly persistent: ThrottlerStorage,
    private readonly persistentThrottlers: readonly string[],
  ) {}

  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storage = this.persistentThrottlers.includes(throttlerName)
      ? this.persistent
      : this.memory;

    return storage.increment(key, ttl, limit, blockDuration, throttlerName);
  }
}
