import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * O banco em que o e2e roda. Todo spec começa com `TRUNCATE ... CASCADE`, e o
 * `.env` de desenvolvimento aponta para o banco do `npm run dev`: rodar a suíte
 * ali apagava os operadores do seed e tudo o que se cadastrou à mão. Por isso o
 * nome sempre termina em `_test` — o que vier sem o sufixo ganha o sufixo, e
 * nenhuma configuração leva o e2e de volta ao banco de desenvolvimento.
 *
 * A variável do ambiente continua valendo sobre o `.env` (a CI a define), e o
 * `ConfigModule` do Nest também dá precedência a ela: escrever aqui é o que faz
 * a aplicação montada pelo spec enxergar o mesmo banco.
 */
export function e2eDatabaseUrl(): string {
  config({ path: resolve(__dirname, '..', '.env'), quiet: true });

  const source = process.env.DATABASE_URL;
  if (!source) {
    throw new Error('DATABASE_URL ausente: copie apps/api/.env.example para apps/api/.env.');
  }

  const url = new URL(source);
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) url.pathname = `/${name}_test`;

  return url.toString();
}

process.env.DATABASE_URL = e2eDatabaseUrl();
