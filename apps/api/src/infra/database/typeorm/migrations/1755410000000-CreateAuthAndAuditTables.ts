import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthAndAuditTables1755410000000 implements MigrationInterface {
  name = 'CreateAuthAndAuditTables1755410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "purpose" varchar(20) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE INDEX "ix_password_reset_tokens_user_purpose"
        ON "password_reset_tokens" ("user_id", "purpose") WHERE "used_at" IS NULL`);

    await queryRunner.query(`
      CREATE TABLE "affiliate_status_history" (
        "id" SERIAL PRIMARY KEY,
        "affiliate_id" int NOT NULL REFERENCES "affiliates"("id") ON DELETE CASCADE,
        "from_status" varchar(20),
        "to_status" varchar(20) NOT NULL,
        "reason" text,
        "actor_user_id" int REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_status_history_affiliate"
        ON "affiliate_status_history" ("affiliate_id", "created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "affiliate_status_history"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
