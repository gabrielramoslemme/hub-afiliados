import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1790345128689 implements MigrationInterface {
  name = 'CreateAuditLogs1790345128689';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      A trilha de edições de qualquer entidade, no molde da do Lemme: o par
      `entity` + `entity_id` diz de quem é a linha, e o `diff` guarda o antes e o
      depois de cada campo. Por isso `entity_id` não tem FK — ele aponta para a
      tabela que `entity` nomeia, e o Postgres não expressa isso.

      Append-only, gravada na mesma transação da mudança. As trilhas de status e
      de cupom continuam nas tabelas delas por ora.
    */
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL PRIMARY KEY,
        "entity" varchar(30) NOT NULL,
        "entity_id" int NOT NULL,
        "actor_user_id" int,
        "change_type" varchar(20) NOT NULL,
        "diff" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "audit_logs_actor_user_id_fkey"
          FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION,
        CONSTRAINT "ck_audit_logs_diff_object" CHECK (jsonb_typeof("diff") = 'object')
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_audit_logs_entity_entity_id"
        ON "audit_logs" ("entity", "entity_id", "created_at" DESC)`);

    await queryRunner.query(`
      CREATE INDEX "ix_audit_logs_actor_user_id" ON "audit_logs" ("actor_user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
