import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreTables1755400000000 implements MigrationInterface {
  name = 'CreateCoreTables1755400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "email" citext NOT NULL UNIQUE,
        "password" varchar(255),
        "password_set_at" timestamptz,
        "should_change_password" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "type" varchar(20) NOT NULL,
        "role" varchar(30),
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "ck_users_role_required_for_admin"
          CHECK (("type" = 'ADMIN' AND "role" IS NOT NULL) OR ("type" = 'AFFILIATE' AND "role" IS NULL))
      )`);

    await queryRunner.query(`
      CREATE TABLE "affiliates" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        "user_id" int NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "cpf" varchar(11) NOT NULL UNIQUE,
        "pix_key_type" varchar(10) NOT NULL,
        "pix_key" varchar(140) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING_APPROVAL',
        "approved_at" timestamptz,
        "approved_by_user_id" int REFERENCES "users"("id"),
        "rejection_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_affiliates_rejection_reason"
          CHECK ("status" <> 'REJECTED' OR "rejection_reason" IS NOT NULL)
      )`);

    await queryRunner.query(`CREATE INDEX "ix_affiliates_status" ON "affiliates" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "ix_affiliates_created_at" ON "affiliates" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "affiliates"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
