import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { e2eDatabaseUrl } from './e2e-env';

/**
 * Deixa o banco `_test` pronto antes do primeiro spec: cria se não existir e
 * aplica as migrations. Sem isso, a primeira rodada local exigia criar o banco
 * à mão — e o atalho de rodar contra o de desenvolvimento era o que apagava os
 * dados dele.
 *
 * As migrations saem pelo mesmo `typeorm:run` do dia a dia, em processo à
 * parte: carregar entidade e migration aqui dentro dependeria de o transform do
 * Jest alcançar o `require` que o TypeORM faz por glob.
 */
export default async function globalSetup(): Promise<void> {
  const url = e2eDatabaseUrl();
  await ensureDatabase(new URL(url));

  try {
    execFileSync('npm', ['run', 'typeorm:run'], {
      cwd: resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(`As migrations do e2e falharam:\n${stdout ?? ''}${stderr ?? ''}`);
  }
}

async function ensureDatabase(url: URL): Promise<void> {
  const name = url.pathname.replace(/^\//, '');
  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';

  const dataSource = new DataSource({ type: 'postgres', url: maintenance.toString() });
  await dataSource.initialize();

  try {
    const existing = await dataSource.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (existing.length === 0) await dataSource.query(`CREATE DATABASE "${name}"`);
  } finally {
    await dataSource.destroy();
  }
}
