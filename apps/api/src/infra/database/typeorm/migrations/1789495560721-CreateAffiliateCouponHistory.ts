import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAffiliateCouponHistory1789495560721 implements MigrationInterface {
  name = 'CreateAffiliateCouponHistory1789495560721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      A trilha do cupom, que o RF-33 pede para criação e inativação. Tabela
      própria, e não colunas novas em `affiliate_status_history`: lá o antes e o
      depois são status de cadastro, aqui são status e percentual de cupom — e
      misturar os dois deixaria toda linha com metade das colunas vazia.

      Append-only como a do cadastro: gravada na mesma transação da mudança,
      nunca editada nem apagada.
    */
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "affiliate_coupon_history"`);
  }
}
