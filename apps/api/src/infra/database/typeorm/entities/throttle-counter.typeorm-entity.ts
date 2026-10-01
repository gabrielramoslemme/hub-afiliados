import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * A contagem do limite de tentativas curto, por visitante e rota. Não é dado
 * de negócio: nenhum use case lê esta tabela, só o `PostgresThrottlerStorage`.
 * Mora no banco para sobreviver a deploy e reinício, e para valer entre
 * instâncias da API.
 */
@Entity('throttle_counters')
@Index('ix_throttle_counters_window_ends_at', ['windowEndsAt'])
export class ThrottleCounterTypeormEntity {
  /** O hash que o throttler gera de rota e visitante: o IP não fica gravado. */
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    primaryKeyConstraintName: 'throttle_counters_pkey',
  })
  key: string;

  @PrimaryColumn({
    type: 'varchar',
    length: 32,
    primaryKeyConstraintName: 'throttle_counters_pkey',
  })
  throttler: string;

  @Column({ type: 'integer' })
  hits: number;

  @Column({ name: 'window_ends_at', type: 'timestamptz' })
  windowEndsAt: Date;

  @Column({ name: 'blocked_until', type: 'timestamptz', nullable: true })
  blockedUntil: Date | null;
}
