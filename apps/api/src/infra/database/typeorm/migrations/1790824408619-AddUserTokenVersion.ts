import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTokenVersion1790824408619 implements MigrationInterface {
  name = 'AddUserTokenVersion1790824408619';

  /*
    A versão vai no JWT e é conferida a cada requisição. Somar um encerra todas
    as sessões abertas da conta: sair, redefinir a senha pelo link. Começa em
    zero para todo mundo; os tokens emitidos antes desta versão não a carregam e
    deixam de valer, o que custa um login a cada pessoa logada no deploy.
  */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "token_version" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "token_version"`);
  }
}
