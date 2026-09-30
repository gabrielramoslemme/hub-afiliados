import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaterials1790777913526 implements MigrationInterface {
  name = 'CreateMaterials1790777913526';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
      A trilha de formação do afiliado. O vídeo mora onde o operador o hospedou:
      aqui fica só o endereço. A posição ordena a trilha e não é única — dois
      módulos na mesma posição desempatam pelo `id`, e reordenar não vira
      malabarismo de troca de valores sob um índice único.
    */
    await queryRunner.query(`
      CREATE TABLE "training_modules" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "title" varchar(120) NOT NULL,
        "description" varchar(500) NOT NULL,
        "video_url" varchar(2048) NOT NULL,
        "duration_minutes" int NOT NULL,
        "position" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_training_modules_duration_minutes" CHECK ("duration_minutes" > 0),
        CONSTRAINT "ck_training_modules_position" CHECK ("position" > 0)
      )
    `);

    /*
      Quem assistiu o quê. A chave é o par: marcar de novo cai no mesmo registro,
      e é isso que torna o "Marcar como assistido" idempotente sem uma leitura
      antes da escrita. Apagar o módulo leva o progresso junto — a barra conta
      sobre a trilha que existe.
    */
    await queryRunner.query(`
      CREATE TABLE "training_module_completions" (
        "affiliate_id" int NOT NULL,
        "training_module_id" int NOT NULL,
        "completed_at" timestamptz NOT NULL,
        PRIMARY KEY ("affiliate_id", "training_module_id"),
        CONSTRAINT "training_module_completions_affiliate_id_fkey"
          FOREIGN KEY ("affiliate_id") REFERENCES "affiliates" ("id") ON DELETE CASCADE,
        CONSTRAINT "training_module_completions_training_module_id_fkey"
          FOREIGN KEY ("training_module_id") REFERENCES "training_modules" ("id") ON DELETE CASCADE
      )
    `);

    /* Os arquivos de divulgação para baixar. Mesma regra do vídeo: só o endereço. */
    await queryRunner.query(`
      CREATE TABLE "promotional_materials" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "title" varchar(120) NOT NULL,
        "description" varchar(500) NOT NULL,
        "file_url" varchar(2048) NOT NULL,
        "file_format" varchar(10) NOT NULL,
        "file_size_bytes" int NOT NULL,
        "position" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_promotional_materials_file_size_bytes" CHECK ("file_size_bytes" > 0),
        CONSTRAINT "ck_promotional_materials_position" CHECK ("position" > 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "promotional_materials"`);
    await queryRunner.query(`DROP TABLE "training_module_completions"`);
    await queryRunner.query(`DROP TABLE "training_modules"`);
  }
}
