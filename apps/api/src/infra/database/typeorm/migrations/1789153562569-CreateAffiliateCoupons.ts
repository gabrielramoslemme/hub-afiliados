import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAffiliateCoupons1789153562569 implements MigrationInterface {
  name = 'CreateAffiliateCoupons1789153562569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      O cupom do afiliado, e a fonte da verdade dele: é aqui que ele é criado e
      gerenciado. A Porto Serviços só o registra pelo INT-01, para ele valer no
      checkout.

      `affiliate_id` é único porque o programa promete um cupom por afiliado, e
      `code` é único porque dois afiliados com o mesmo código tornariam a
      atribuição da venda impossível. O comprimento acompanha o teto do INT-01;
      a regra mais estreita de 4 a 20 caracteres é de produto e mora no código.
    */
    await queryRunner.query(`
      CREATE TABLE "affiliate_coupons" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "affiliate_id" int NOT NULL UNIQUE,
        "code" varchar(200) NOT NULL UNIQUE,
        "discount_percent" smallint NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "affiliate_coupons_affiliate_id_fkey"
          FOREIGN KEY ("affiliate_id") REFERENCES "affiliates" ("id") ON DELETE CASCADE,
        CONSTRAINT "ck_affiliate_coupons_discount_percent"
          CHECK ("discount_percent" > 0 AND "discount_percent" <= 25)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "affiliate_coupons"`);
  }
}
