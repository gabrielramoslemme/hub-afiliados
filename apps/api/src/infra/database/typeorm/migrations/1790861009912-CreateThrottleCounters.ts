import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThrottleCounters1790861009912 implements MigrationInterface {
  name = 'CreateThrottleCounters1790861009912';

  /*
    A contagem do limite curto — login, senha, cadastro — saiu da memória da
    API: lá, um deploy ou um contêiner que caísse soltava quem estava bloqueado.
    A chave é o hash de rota e visitante que o throttler gera, então o IP não
    fica gravado. As linhas vencidas são apagadas pelo próprio storage.
  */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "throttle_counters" (
        "key" varchar(64) NOT NULL,
        "throttler" varchar(32) NOT NULL,
        "hits" integer NOT NULL,
        "window_ends_at" timestamptz NOT NULL,
        "blocked_until" timestamptz,
        CONSTRAINT "throttle_counters_pkey" PRIMARY KEY ("key", "throttler")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_throttle_counters_window_ends_at" ON "throttle_counters" ("window_ends_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "ix_throttle_counters_window_ends_at"`);
    await queryRunner.query(`DROP TABLE "throttle_counters"`);
  }
}
