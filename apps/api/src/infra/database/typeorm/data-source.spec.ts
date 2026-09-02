import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';
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
