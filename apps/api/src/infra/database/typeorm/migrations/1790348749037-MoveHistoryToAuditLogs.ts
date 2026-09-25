import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveHistoryToAuditLogs1790348749037 implements MigrationInterface {
  name = 'MoveHistoryToAuditLogs1790348749037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      As trilhas de status e de cupom passam a morar em `audit_logs`, e a
      auditoria do afiliado sai de uma tabela só. O motivo da reprovação, que
      era `reason`, vira `justification`.
    */
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD COLUMN "justification" text`);

    /*
      O status vai para o `diff` como qualquer outro campo. No cupom, só o que
      mudou — a emissão leva código, status e percentual, a partir do nulo. O
      registro de "confirmou sem alterar", que a trilha antiga aceitava, não
      tem campo que mudou e fica de fora, como a auditoria faz daqui em diante.

      A ordem do SELECT é a ordem dos ids: aprovar gravava status e cupom com o
      mesmo instante, e o `kind` mantém o status antes do cupom — é o `id` que
      desempata a leitura da trilha.
    */
    await queryRunner.query(`
      INSERT INTO "audit_logs"
        ("entity", "entity_id", "actor_user_id", "change_type", "diff", "justification", "created_at")
      SELECT "entity", "entity_id", "actor_user_id", "change_type", "diff", "justification", "created_at"
        FROM (
          SELECT 'AFFILIATE' AS "entity",
                 h."affiliate_id" AS "entity_id",
                 h."actor_user_id",
                 CASE WHEN h."from_status" IS NULL THEN 'CREATE' ELSE 'UPDATE' END AS "change_type",
                 jsonb_build_object(
                   'status', jsonb_build_object('from', h."from_status", 'to', h."to_status")
                 ) AS "diff",
                 h."reason" AS "justification",
                 h."created_at",
                 0 AS "kind",
                 h."id" AS "source_id"
            FROM "affiliate_status_history" h
          UNION ALL
          SELECT 'COUPON',
                 h."coupon_id",
                 h."actor_user_id",
                 CASE WHEN h."from_status" IS NULL THEN 'CREATE' ELSE 'UPDATE' END,
                 CASE
                   WHEN h."from_status" IS NULL THEN jsonb_build_object(
                     'code', jsonb_build_object('from', NULL::text, 'to', c."code"),
                     'status', jsonb_build_object('from', NULL::text, 'to', h."to_status"),
                     'discountPercent',
                       jsonb_build_object('from', NULL::smallint, 'to', h."to_discount_percent")
                   )
                   ELSE jsonb_strip_nulls(jsonb_build_object(
                     'status',
                       CASE WHEN h."from_status" IS DISTINCT FROM h."to_status"
                         THEN jsonb_build_object('from', h."from_status", 'to', h."to_status") END,
                     'discountPercent',
                       CASE WHEN h."from_discount_percent" IS DISTINCT FROM h."to_discount_percent"
                         THEN jsonb_build_object(
                           'from', h."from_discount_percent", 'to', h."to_discount_percent"
                         ) END
                   ))
                 END,
                 NULL,
                 h."created_at",
                 1,
                 h."id"
            FROM "affiliate_coupon_history" h
            JOIN "affiliate_coupons" c ON c."id" = h."coupon_id"
        ) AS "history"
       WHERE "diff" <> '{}'::jsonb
       ORDER BY "created_at", "kind", "source_id"
    `);

    await queryRunner.query(`DROP TABLE "affiliate_coupon_history"`);
    await queryRunner.query(`DROP TABLE "affiliate_status_history"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      CREATE TABLE "affiliate_coupon_history" (
        "id" SERIAL PRIMARY KEY,
        "coupon_id" int NOT NULL,
        "from_status" varchar(20),
        "to_status" varchar(20) NOT NULL,
        "from_discount_percent" smallint,
        "to_discount_percent" smallint NOT NULL,
        "actor_user_id" int,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "affiliate_coupon_history_coupon_id_fkey"
          FOREIGN KEY ("coupon_id") REFERENCES "affiliate_coupons" ("id") ON DELETE CASCADE,
        CONSTRAINT "affiliate_coupon_history_actor_user_id_fkey"
          FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_coupon_history_coupon"
        ON "affiliate_coupon_history" ("coupon_id", "created_at" DESC)`);

    await queryRunner.query(`
      INSERT INTO "affiliate_status_history"
        ("affiliate_id", "from_status", "to_status", "reason", "actor_user_id", "created_at")
      SELECT "entity_id", "diff"->'status'->>'from', "diff"->'status'->>'to',
             "justification", "actor_user_id", "created_at"
        FROM "audit_logs"
       WHERE "entity" = 'AFFILIATE' AND "diff" ? 'status'
       ORDER BY "created_at", "id"
    `);

    /*
      A tabela antiga guarda o estado inteiro do cupom em cada linha, e o
      `diff` só o que mudou. O estado de cada linha é o último valor conhecido
      até ela: `count` sobe a cada linha que traz o campo, e dentro do grupo o
      primeiro valor é o dessa linha.
    */
    await queryRunner.query(`
      WITH "changes" AS (
        SELECT "id", "entity_id", "actor_user_id", "change_type", "created_at",
               "diff"->'status'->>'from' AS "status_from",
               "diff"->'status'->>'to' AS "status_to",
               ("diff"->'discountPercent'->>'from')::smallint AS "discount_from",
               ("diff"->'discountPercent'->>'to')::smallint AS "discount_to"
          FROM "audit_logs"
         WHERE "entity" = 'COUPON'
      ), "grouped" AS (
        SELECT *,
               count("status_to") OVER "w" AS "status_group",
               count("discount_to") OVER "w" AS "discount_group"
          FROM "changes"
        WINDOW "w" AS (PARTITION BY "entity_id" ORDER BY "created_at", "id")
      ), "state" AS (
        SELECT *,
               first_value("status_to") OVER (
                 PARTITION BY "entity_id", "status_group" ORDER BY "created_at", "id"
               ) AS "status_now",
               first_value("discount_to") OVER (
                 PARTITION BY "entity_id", "discount_group" ORDER BY "created_at", "id"
               ) AS "discount_now"
          FROM "grouped"
      )
      INSERT INTO "affiliate_coupon_history"
        ("coupon_id", "from_status", "to_status", "from_discount_percent",
         "to_discount_percent", "actor_user_id", "created_at")
      SELECT "entity_id",
             CASE WHEN "change_type" = 'CREATE' THEN NULL ELSE COALESCE("status_from", "status_now") END,
             "status_now",
             CASE WHEN "change_type" = 'CREATE' THEN NULL ELSE COALESCE("discount_from", "discount_now") END,
             "discount_now",
             "actor_user_id",
             "created_at"
        FROM "state"
       ORDER BY "created_at", "id"
    `);

    await queryRunner.query(`
      DELETE FROM "audit_logs"
       WHERE "entity" = 'COUPON' OR ("entity" = 'AFFILIATE' AND "diff" ? 'status')`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "justification"`);
  }
}
