import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffiliateOccupation1790347937762 implements MigrationInterface {
  name = 'AddAffiliateOccupation1790347937762';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      A ocupação entra obrigatória num cadastro que já tem linhas. As antigas
      recebem PROMOTION_SHARING, a mais genérica da lista — decisão de produto,
      e não um dado que a pessoa informou. O afiliado corrige pelo perfil, e a
      troca fica na trilha de auditoria.
    */
    await queryRunner.query(`ALTER TABLE "affiliates" ADD COLUMN "occupation" varchar(40)`);
    await queryRunner.query(
      `UPDATE "affiliates" SET "occupation" = 'PROMOTION_SHARING' WHERE "occupation" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "affiliates" ALTER COLUMN "occupation" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "occupation"`);
  }
}
