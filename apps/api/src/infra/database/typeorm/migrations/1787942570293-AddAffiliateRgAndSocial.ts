import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffiliateRgAndSocial1787942570293 implements MigrationInterface {
  name = 'AddAffiliateRgAndSocial1787942570293';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      O RG entra obrigatório e único num cadastro que já pode ter linhas. O
      `DEFAULT` temporário preenche as antigas com um valor derivado do `id` —
      único por construção, e reconhecível como preenchimento de migration, não
      como documento informado por alguém.
    */
    await queryRunner.query(`ALTER TABLE "affiliates" ADD COLUMN "rg" varchar(20)`);
    await queryRunner.query(
      `UPDATE "affiliates" SET "rg" = 'MIGR' || lpad("id"::text, 8, '0') WHERE "rg" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "affiliates" ALTER COLUMN "rg" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_rg_key" UNIQUE ("rg")`,
    );

    await queryRunner.query(`ALTER TABLE "affiliates" ADD COLUMN "social_network" varchar(20)`);
    await queryRunner.query(`ALTER TABLE "affiliates" ADD COLUMN "social_handle" varchar(30)`);
    await queryRunner.query(`
      ALTER TABLE "affiliates" ADD CONSTRAINT "ck_affiliates_social_pair"
        CHECK (("social_network" IS NULL) = ("social_handle" IS NULL))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "affiliates" DROP CONSTRAINT "ck_affiliates_social_pair"`);
    await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "social_handle"`);
    await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "social_network"`);
    await queryRunner.query(`ALTER TABLE "affiliates" DROP CONSTRAINT "affiliates_rg_key"`);
    await queryRunner.query(`ALTER TABLE "affiliates" DROP COLUMN "rg"`);
  }
}
