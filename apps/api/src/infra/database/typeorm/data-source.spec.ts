import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DataSource } from 'typeorm';
import dataSource, * as dataSourceModule from './data-source';

/**
 * O DataSource das migrations é o único ponto do projeto que roda fora do Nest:
 * a imagem de produção não tem `ts-node`, não tem o `ormconfig.ts` (que mora
 * fora de `src/`) e não tem o diretório `src/`. Um caminho relativo ao cwd
 * passaria aqui e só falharia no deploy, com a migration não encontrada e a
 * tabela faltando na primeira requisição.
 */
describe('TypeORM DataSource', () => {
  function globbedFiles(pattern: string): string[] {
    return readdirSync(dirname(pattern)).filter((file) => /\.(ts|js)$/.test(file));
  }

  /**
   * `migration:run -d <arquivo>` recusa o módulo com mais de uma instância
   * exportada — "Given data source file must contain only one export of
   * DataSource instance". Exportar a mesma instância como nomeada e default
   * conta como duas, e o erro só apareceria no deploy.
   */
  it('exports exactly one DataSource instance, as the typeorm CLI demands', () => {
    const exported = Object.entries(dataSourceModule)
      .filter(([, value]) => value instanceof DataSource)
      .map(([name]) => name);

    expect(exported).toEqual(['default']);
  });

  it('connects to postgres with synchronize off', () => {
    expect(dataSource.options.type).toBe('postgres');
    expect(dataSource.options.synchronize).toBe(false);
  });

  /**
   * O RDS de produção roda com `rds.force_ssl = 1`: sem a opção `ssl` o CLI é
   * recusado no aperto de mão e a migration nunca chega ao schema. Recarregar o
   * módulo com o ambiente ligado é o que prova que ela vem do ambiente, e não
   * um `false` fixo que passaria neste teste sem servir para nada.
   */
  it('takes the ssl the environment asks for, which is what RDS force_ssl demands', async () => {
    const caPath = join(mkdtempSync(join(tmpdir(), 'rds-ca-')), 'bundle.pem');
    writeFileSync(caPath, '-----BEGIN CERTIFICATE-----\ncontent\n-----END CERTIFICATE-----\n');

    process.env.DATABASE_SSL = 'true';
    process.env.DATABASE_CA_PATH = caPath;

    let ssl: unknown;
    await jest.isolateModulesAsync(async () => {
      const reloaded = (await import('./data-source')).default;
      ssl = (reloaded.options as { ssl?: unknown }).ssl;
    });

    delete process.env.DATABASE_SSL;
    delete process.env.DATABASE_CA_PATH;

    expect(ssl).toEqual({
      ca: expect.stringContaining('BEGIN CERTIFICATE'),
      rejectUnauthorized: true,
    });
  });

  it('resolves the migrations from its own directory, in both extensions', () => {
    const [pattern] = dataSource.options.migrations as string[];

    expect(pattern).toMatch(/\{\.ts,\.js\}$/);
    expect(globbedFiles(pattern)).toEqual(
      expect.arrayContaining([
        '1755400000000-CreateCoreTables.ts',
        '1755410000000-CreateAuthAndAuditTables.ts',
        '1787942570293-AddAffiliateRgAndSocial.ts',
      ]),
    );
  });

  it('resolves the entities from its own directory, in both extensions', () => {
    const [pattern] = dataSource.options.entities as string[];

    expect(pattern).toMatch(/\{\.ts,\.js\}$/);
    expect(globbedFiles(pattern)).toEqual(
      expect.arrayContaining([
        'affiliate.typeorm-entity.ts',
        'affiliate-status-history.typeorm-entity.ts',
        'password-reset-token.typeorm-entity.ts',
        'user.typeorm-entity.ts',
      ]),
    );
  });
});
