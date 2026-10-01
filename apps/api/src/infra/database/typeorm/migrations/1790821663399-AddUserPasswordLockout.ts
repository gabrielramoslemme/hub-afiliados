import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPasswordLockout1790821663399 implements MigrationInterface {
  name = 'AddUserPasswordLockout1790821663399';

  /*
    Senha errada vezes demais seguidas trava a conta por alguns minutos. A
    contagem mora na linha do usuário, e não em memória, porque é por conta que
    a força bruta se mede — e porque a API pode subir em mais de um processo.
  */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "failed_password_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN "password_locked_until" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "password_locked_until",
        DROP COLUMN "failed_password_attempts"
    `);
  }
}
