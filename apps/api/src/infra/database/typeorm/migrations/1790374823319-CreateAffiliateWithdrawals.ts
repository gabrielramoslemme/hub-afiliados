import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAffiliateWithdrawals1790374823319 implements MigrationInterface {
  name = 'CreateAffiliateWithdrawals1790374823319';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      O saque via PIX do saldo inteiro do afiliado. Não há livro-razão: o saldo
      é a soma das vendas liberadas que nenhum saque reservou, e reservar é a
      venda apontar para o saque (`affiliate_sales.withdrawal_id`). Falha e
      devolução soltam as vendas, e o valor volta ao saldo — o saque guarda o
      valor e continua no histórico.

      A chave PIX é copiada no pedido: trocá-la no perfil não desvia um saque
      que já saiu. `public_id` é também a referência e a chave de idempotência
      no fornecedor de pagamento, e por isso único.

      As datas andam amarradas ao status. `paid_at` sobrevive à devolução: o
      PIX caiu, e depois voltou.
    */
    await queryRunner.query(`
      CREATE TABLE "affiliate_withdrawals" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "affiliate_id" int NOT NULL,
        "amount_cents" int NOT NULL,
        "status" varchar(20) NOT NULL,
        "pix_key_type" varchar(10) NOT NULL,
        "pix_key" varchar(140) NOT NULL,
        "provider_batch_id" varchar(50),
        "provider_transfer_id" varchar(50),
        "end_to_end_id" varchar(100),
        "receipt_url" text,
        "failure_reason" text,
        "requested_at" timestamptz NOT NULL,
        "paid_at" timestamptz,
        "failed_at" timestamptz,
        "returned_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "affiliate_withdrawals_affiliate_id_fkey"
          FOREIGN KEY ("affiliate_id") REFERENCES "affiliates" ("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_affiliate_withdrawals_amount_cents" CHECK ("amount_cents" > 0),
        CONSTRAINT "ck_affiliate_withdrawals_paid_at"
          CHECK (("status" <> 'PAID' OR "paid_at" IS NOT NULL)
             AND ("paid_at" IS NULL OR "status" IN ('PAID', 'RETURNED'))),
        CONSTRAINT "ck_affiliate_withdrawals_failed_at"
          CHECK (("status" = 'FAILED') = ("failed_at" IS NOT NULL)),
        CONSTRAINT "ck_affiliate_withdrawals_returned_at"
          CHECK (("status" = 'RETURNED') = ("returned_at" IS NOT NULL))
      )
    `);

    // O extrato do afiliado lista os saques dele, do mais recente para o mais antigo.
    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_withdrawals_affiliate"
        ON "affiliate_withdrawals" ("affiliate_id", "requested_at" DESC)`);

    // A reconciliação só procura os abertos, e procura a cada dez minutos.
    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_withdrawals_open"
        ON "affiliate_withdrawals" ("status", "updated_at")
        WHERE "status" IN ('REQUESTED', 'PROCESSING')`);

    // O painel lista todos, do pedido mais recente para o mais antigo.
    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_withdrawals_requested"
        ON "affiliate_withdrawals" ("requested_at" DESC)`);

    await queryRunner.query(`ALTER TABLE "affiliate_sales" ADD COLUMN "withdrawal_id" int`);
    await queryRunner.query(`
      ALTER TABLE "affiliate_sales"
        ADD CONSTRAINT "affiliate_sales_withdrawal_id_fkey"
        FOREIGN KEY ("withdrawal_id") REFERENCES "affiliate_withdrawals" ("id") ON DELETE RESTRICT`);
    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_sales_withdrawal" ON "affiliate_sales" ("withdrawal_id")`);

    /*
      Toda notificação e consulta do fornecedor de pagamento que passou pela
      assinatura, aplicada ou não. Append-only. O `payload` entra sem chave PIX
      e sem CPF: quem grava remove os dois antes.

      `reference` é o que o fornecedor citou — texto, não uuid: um lote criado
      à mão no painel dele chega com referência que não é nossa, e a trilha tem
      de guardá-la mesmo assim.
    */
    await queryRunner.query(`
      CREATE TABLE "payout_events" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "source" varchar(20) NOT NULL,
        "event_id" varchar(100),
        "withdrawal_id" int,
        "reference" varchar(255),
        "provider_status" varchar(30),
        "outcome" varchar(20) NOT NULL,
        "payload" jsonb NOT NULL,
        "received_at" timestamptz NOT NULL,
        CONSTRAINT "payout_events_withdrawal_id_fkey"
          FOREIGN KEY ("withdrawal_id") REFERENCES "affiliate_withdrawals" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_payout_events_withdrawal"
        ON "payout_events" ("withdrawal_id", "received_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payout_events"`);
    await queryRunner.query(`DROP INDEX "ix_affiliate_sales_withdrawal"`);
    await queryRunner.query(
      `ALTER TABLE "affiliate_sales" DROP CONSTRAINT "affiliate_sales_withdrawal_id_fkey"`,
    );
    await queryRunner.query(`ALTER TABLE "affiliate_sales" DROP COLUMN "withdrawal_id"`);
    await queryRunner.query(`DROP TABLE "affiliate_withdrawals"`);
  }
}
