import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffiliateRole1790800000000 implements MigrationInterface {
  name = 'AddAffiliateRole1790800000000';

  /*
    O afiliado ganha perfil próprio: toda rota autenticada passa a declarar os
    perfis que alcança, e a da área do afiliado aceita só o dele. A constraint
    antiga exigia `role` nulo para o afiliado; a nova amarra cada tipo aos seus
    perfis, e um operador também não pode mais receber o perfil de afiliado.
  */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "ck_users_role_required_for_admin"`,
    );
    await queryRunner.query(`UPDATE "users" SET "role" = 'AFFILIATE' WHERE "type" = 'AFFILIATE'`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "ck_users_role_matches_type" CHECK (
        ("type" = 'ADMIN' AND "role" IN ('PORTO_ANALYST', 'PORTO_ADMIN', 'MESA_ADMIN'))
        OR ("type" = 'AFFILIATE' AND "role" = 'AFFILIATE')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "ck_users_role_matches_type"`);
    await queryRunner.query(`UPDATE "users" SET "role" = NULL WHERE "type" = 'AFFILIATE'`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "ck_users_role_required_for_admin" CHECK (
        ("type" = 'ADMIN' AND "role" IS NOT NULL) OR ("type" = 'AFFILIATE' AND "role" IS NULL)
      )
    `);
  }
}
