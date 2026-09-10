import dataSource from '../data-source';
import { rwGrantStatements } from './rw-role-statements';

const ROLE = 'hub_rw';

/**
 * Cria — ou atualiza a senha de — o papel que as pessoas usam para abrir o
 * banco, e concede a ele leitura e escrita sem DDL. Roda depois das migrations
 * e com a conexão do master, o único que pode criar papel.
 *
 * Idempotente de propósito: roda a cada deploy, e é isso que faz a tabela
 * criada pela release de hoje já nascer acessível.
 */
async function run(): Promise<void> {
  const password = process.env.DB_RW_PASSWORD;

  if (!password) {
    throw new Error('DB_RW_PASSWORD is required to provision the read-write role');
  }

  await dataSource.initialize();

  const [{ current_database: database }] = await dataSource.query('SELECT current_database()');
  const existing = await dataSource.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [ROLE]);

  if (existing.length === 0) {
    // `format` do próprio Postgres em vez de concatenação: a senha nunca é
    // montada dentro de string SQL aqui, e o %L cuida do escape.
    const [{ statement }] = await dataSource.query(
      "SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', $1::text, $2::text) AS statement",
      [ROLE, password],
    );
    await dataSource.query(statement);
  } else {
    const [{ statement }] = await dataSource.query(
      "SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', $1::text, $2::text) AS statement",
      [ROLE, password],
    );
    await dataSource.query(statement);
  }

  for (const statement of rwGrantStatements(ROLE, database)) {
    await dataSource.query(statement);
  }

  await dataSource.destroy();
  process.stdout.write(`Grants applied to ${ROLE}\n`);
}

void run();
