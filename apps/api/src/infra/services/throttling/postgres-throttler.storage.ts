import { Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

interface CounterRow {
  hits: number;
  window_seconds: number;
  block_seconds: number | null;
}

/** De quanto em quanto tempo, no máximo, o storage apaga as janelas vencidas. */
const SWEEP_EVERY_MS = 10 * 60 * 1000;

/*
  Uma escrita só decide tudo, com a linha travada pelo próprio UPSERT: somar a
  tentativa, reabrir a janela vencida e bloquear quem passou do limite. Ler,
  somar e gravar pela aplicação perderia as tentativas que chegam juntas.

  As expressões do SET leem a linha de antes. `reset` é janela vencida ou
  bloqueio já cumprido: a contagem recomeça em 1, como no armazenamento em
  memória do throttler. Bloqueio ainda valendo não soma nada.

  Janela fixa por chave, e não a deslizante da memória: o que importa — passou
  do limite, espera o bloqueio inteiro — é igual, e cabe num comando só.
*/
const INCREMENT = `
  INSERT INTO throttle_counters AS c (key, throttler, hits, window_ends_at, blocked_until)
  VALUES (
    $1, $2, 1,
    now() + $3 * interval '1 millisecond',
    CASE WHEN 1 > $4 THEN now() + $5 * interval '1 millisecond' END
  )
  ON CONFLICT (key, throttler) DO UPDATE SET
    hits = CASE
      WHEN c.blocked_until > now() THEN c.hits
      WHEN c.window_ends_at <= now() OR c.blocked_until <= now() THEN 1
      ELSE c.hits + 1
    END,
    window_ends_at = CASE
      WHEN c.blocked_until > now() THEN c.window_ends_at
      WHEN c.window_ends_at <= now() OR c.blocked_until <= now()
        THEN now() + $3 * interval '1 millisecond'
      ELSE c.window_ends_at
    END,
    blocked_until = CASE
      WHEN c.blocked_until > now() THEN c.blocked_until
      WHEN c.window_ends_at > now() AND (c.blocked_until IS NULL) AND c.hits + 1 > $4
        THEN now() + $5 * interval '1 millisecond'
      ELSE NULL
    END
  RETURNING
    hits,
    ceil(extract(epoch FROM window_ends_at - now()))::int AS window_seconds,
    ceil(extract(epoch FROM blocked_until - now()))::int AS block_seconds
`;

/**
 * O `ThrottlerStorage` do limite curto, no Postgres: sobrevive a deploy e
 * reinício, e vale entre instâncias da API. Implementa o contrato da biblioteca
 * porque é ela quem chama — mora em infra, ao lado do resto que fala com o banco.
 */
export class PostgresThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(PostgresThrottlerStorage.name);
  private lastSweepAt = 0;

  constructor(private readonly dataSource: DataSource) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    this.sweepNowAndThen();

    const [row] = (await this.dataSource.query(INCREMENT, [
      key,
      throttlerName,
      ttl,
      limit,
      blockDuration,
    ])) as CounterRow[];

    const blockSeconds = Math.max(0, row.block_seconds ?? 0);

    return {
      totalHits: row.hits,
      timeToExpire: Math.max(0, row.window_seconds),
      isBlocked: blockSeconds > 0,
      timeToBlockExpire: blockSeconds,
    };
  }

  /*
    Sem agendador na API, quem limpa é o próprio storage, de tempos em tempos e
    sem segurar a requisição: uma linha só serve enquanto a janela ou o bloqueio
    valem, e visitante que não volta deixaria a dele para sempre.
  */
  private sweepNowAndThen(): void {
    const now = Date.now();
    if (now - this.lastSweepAt < SWEEP_EVERY_MS) return;
    this.lastSweepAt = now;

    this.dataSource
      .query(
        `DELETE FROM throttle_counters
          WHERE window_ends_at <= now() AND (blocked_until IS NULL OR blocked_until <= now())`,
      )
      .catch((error: Error) => this.logger.warn(`Limpeza da contagem falhou: ${error.message}`));
  }
}
