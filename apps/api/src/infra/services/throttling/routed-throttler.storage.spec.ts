import { ThrottlerStorage } from '@nestjs/throttler';
import { RoutedThrottlerStorage } from './routed-throttler.storage';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

function storageAnswering(totalHits: number): jest.Mocked<ThrottlerStorage> {
  const record: ThrottlerStorageRecord = {
    totalHits,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  };

  return { increment: jest.fn().mockResolvedValue(record) };
}

describe('RoutedThrottlerStorage', () => {
  const memory = storageAnswering(1);
  const persistent = storageAnswering(7);
  const storage = new RoutedThrottlerStorage(memory, persistent, ['sensitive']);

  beforeEach(() => jest.clearAllMocks());

  // A contagem que segura força bruta não pode zerar num deploy.
  it('keeps the counts of a sensitive limit in the persistent storage', async () => {
    await expect(
      storage.increment('key', 900_000, 10, 900_000, 'sensitive'),
    ).resolves.toMatchObject({ totalHits: 7 });
    expect(persistent.increment).toHaveBeenCalledWith('key', 900_000, 10, 900_000, 'sensitive');
    expect(memory.increment).not.toHaveBeenCalled();
  });

  // O limite folgado vale em toda requisição: no banco, viraria uma escrita por
  // requisição para guardar uma conta que perder num deploy não custa nada.
  it('keeps every other limit in memory', async () => {
    await storage.increment('key', 60_000, 300, 60_000, 'default');

    expect(memory.increment).toHaveBeenCalledWith('key', 60_000, 300, 60_000, 'default');
    expect(persistent.increment).not.toHaveBeenCalled();
  });
});
