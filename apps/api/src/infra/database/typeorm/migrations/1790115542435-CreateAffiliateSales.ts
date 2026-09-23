import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAffiliateSales1790115542435 implements MigrationInterface {
  name = 'CreateAffiliateSales1790115542435';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      As vendas feitas com o cupom de um afiliado, como a Porto Serviços as
      notifica pelo webhook de incentivos (INT-03). É a fonte da tela de Vendas
      do painel e das entradas do extrato — por isso guarda o estado atual da
      venda, e não só a trilha: "venda encerrada não reabre" vira uma linha lida
      com lock, e não uma agregação a cada leitura.

      `external_id` é o `venda.id` da Porto, e único: é o que faz duas chamadas
      simultâneas do mesmo registro criarem uma venda só. Valor em centavos,
      nunca em float. Nenhum dado do cliente final.

      A FK para o cupom não cascateia: apagar cupom não pode levar venda junto.
    */
    await queryRunner.query(`
      CREATE TABLE "affiliate_sales" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "coupon_id" int NOT NULL,
        "external_id" varchar(100) NOT NULL UNIQUE,
        "amount_cents" int NOT NULL,
        "item" text NOT NULL,
        "incentive_status" varchar(20) NOT NULL,
        "registered_at" timestamptz NOT NULL,
        "settled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "affiliate_sales_coupon_id_fkey"
          FOREIGN KEY ("coupon_id") REFERENCES "affiliate_coupons" ("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_affiliate_sales_amount_cents" CHECK ("amount_cents" >= 0),
        CONSTRAINT "ck_affiliate_sales_settled_at"
          CHECK (("incentive_status" = 'PENDING') = ("settled_at" IS NULL))
      )
    `);

    // O extrato e a tela de Vendas listam por cupom, da mais recente para a mais antiga.
    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_sales_coupon"
        ON "affiliate_sales" ("coupon_id", "registered_at" DESC)`);

    /*
      Toda chamada recebida, aplicada ou não — o que o contrato da Porto pede
      para auditoria e suporte. Append-only. O `event_id` (o `idEvento`) não é
      único: a Porto gera um por tentativa, e o mesmo reenvio chegando duas vezes
      vira duas linhas, a segunda como repetição.

      O índice único parcial é a chave de idempotência do contrato — venda e tipo
      de evento — sobre as chamadas que de fato mudaram a venda.

      Os campos lidos do payload só ficam nulos na recusa por corpo fora do
      contrato (INC-006): a chamada é gravada mesmo assim, com o que tiver, e o
      corpo inteiro vai em `payload`.
    */
    await queryRunner.query(`
      CREATE TABLE "porto_incentive_events" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "event_id" varchar(100),
        "sale_id" int,
        "external_sale_id" varchar(100),
        "event_type" varchar(30),
        "outcome" varchar(20) NOT NULL,
        "rejection_code" varchar(20),
        "payload" jsonb NOT NULL,
        "sent_at" timestamptz,
        "received_at" timestamptz NOT NULL,
        CONSTRAINT "porto_incentive_events_sale_id_fkey"
          FOREIGN KEY ("sale_id") REFERENCES "affiliate_sales" ("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_porto_incentive_events_rejection_code"
          CHECK (("outcome" = 'REJECTED') = ("rejection_code" IS NOT NULL)),
        CONSTRAINT "ck_porto_incentive_events_readable"
          CHECK ("rejection_code" IS NOT DISTINCT FROM 'INC-006' OR (
            "event_id" IS NOT NULL AND "external_sale_id" IS NOT NULL
            AND "event_type" IS NOT NULL AND "sent_at" IS NOT NULL))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_porto_incentive_events_applied"
        ON "porto_incentive_events" ("external_sale_id", "event_type")
        WHERE "outcome" = 'APPLIED'`);

    // O suporte procura pela venda da Porto ou pelo `idEvento` que ela registrou.
    await queryRunner.query(`
      CREATE INDEX "ix_porto_incentive_events_external_sale"
        ON "porto_incentive_events" ("external_sale_id", "received_at" DESC)`);
    await queryRunner.query(`
      CREATE INDEX "ix_porto_incentive_events_event"
        ON "porto_incentive_events" ("event_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "porto_incentive_events"`);
    await queryRunner.query(`DROP TABLE "affiliate_sales"`);
  }
}
