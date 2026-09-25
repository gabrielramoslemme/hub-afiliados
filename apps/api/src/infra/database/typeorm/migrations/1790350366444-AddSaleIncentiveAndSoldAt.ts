import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleIncentiveAndSoldAt1790350366444 implements MigrationInterface {
  name = 'AddSaleIncentiveAndSoldAt1790350366444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      A Porto passou a mandar o valor do incentivo (`incentivo.valor`) e a data
      real da venda (`venda.dataVenda`). `registered_at` era o `dataHoraEvento` do
      registro — a hora do envio, o melhor que o contrato oferecia — e vira
      `sold_at`, com a data da venda no lugar.

      As vendas que já existem são preenchidas pelo corpo guardado na trilha: é
      para isso que ela guarda o payload inteiro. O incentivo vem do último evento
      aplicado, a data da venda do registro.
    */
    await queryRunner.query(
      `ALTER TABLE "affiliate_sales" RENAME COLUMN "registered_at" TO "sold_at"`,
    );
    await queryRunner.query(`ALTER TABLE "affiliate_sales" ADD COLUMN "incentive_cents" int`);

    await queryRunner.query(`
      UPDATE "affiliate_sales" s
         SET "sold_at" = (e."payload" -> 'venda' ->> 'dataVenda')::timestamptz
        FROM "porto_incentive_events" e
       WHERE e."sale_id" = s."id"
         AND e."event_type" = 'SALE_REGISTERED'
         AND e."outcome" = 'APPLIED'
         AND e."payload" -> 'venda' ->> 'dataVenda' ~ '^\\d{4}-\\d{2}-\\d{2}T'`);

    await queryRunner.query(`
      UPDATE "affiliate_sales" s
         SET "incentive_cents" = round((latest."payload" -> 'incentivo' ->> 'valor')::numeric * 100)
        FROM (
          SELECT DISTINCT ON ("sale_id") "sale_id", "payload"
            FROM "porto_incentive_events"
           WHERE "outcome" = 'APPLIED'
           ORDER BY "sale_id", "id" DESC
        ) latest
       WHERE latest."sale_id" = s."id"
         AND jsonb_typeof(latest."payload" -> 'incentivo' -> 'valor') = 'number'`);

    // Venda sem valor no payload não tem de onde tirar o incentivo, e zero seria
    // mentira no extrato. Falhar aqui, dizendo por quê, é melhor do que o
    // `SET NOT NULL` recusando sem contexto.
    const [{ missing }] = await queryRunner.query(
      `SELECT count(*)::int AS "missing" FROM "affiliate_sales" WHERE "incentive_cents" IS NULL`,
    );
    if (missing > 0) {
      throw new Error(
        `${missing} venda(s) sem incentivo.valor na trilha. Preencha affiliate_sales.incentive_cents à mão antes de migrar.`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "affiliate_sales" ALTER COLUMN "incentive_cents" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "affiliate_sales"
        ADD CONSTRAINT "ck_affiliate_sales_incentive_cents" CHECK ("incentive_cents" >= 0)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "affiliate_sales" DROP COLUMN "incentive_cents"`);
    await queryRunner.query(
      `ALTER TABLE "affiliate_sales" RENAME COLUMN "sold_at" TO "registered_at"`,
    );

    // De volta ao que a coluna era: o `dataHoraEvento` do registro.
    await queryRunner.query(`
      UPDATE "affiliate_sales" s
         SET "registered_at" = e."sent_at"
        FROM "porto_incentive_events" e
       WHERE e."sale_id" = s."id"
         AND e."event_type" = 'SALE_REGISTERED'
         AND e."outcome" = 'APPLIED'`);
  }
}
