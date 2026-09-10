import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffiliateTermsAcceptance1788881470364 implements MigrationInterface {
  name = 'AddAffiliateTermsAcceptance1788881470364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      O aceite entra obrigatório numa tabela que já pode ter linhas. Quem se
      cadastrou antes aceitou no envio do formulário, só que sem registro do
      instante — as linhas antigas recebem a data em que a linha nasceu, que é
      o momento em que o envio aconteceu, e não a data desta migration.
    */
    await queryRunner.query(`ALTER TABLE "affiliates" ADD COLUMN "terms_accepted_at" timestamptz`);
    await queryRunner.query(
      `UPDATE "affiliates" SET "terms_accepted_at" = "created_at" WHERE "terms_accepted_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliates" ALTER COLUMN "terms_accepted_at" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "terms_accepted_at"`);
  }
}
