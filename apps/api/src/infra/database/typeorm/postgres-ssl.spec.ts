import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPostgresSsl } from './postgres-ssl';

/**
 * O parameter group padrão do RDS PostgreSQL 16 traz `rds.force_ssl = 1`: sem
 * TLS o servidor recusa a conexão antes de olhar a senha, e a migration falha
 * no deploy — não no teste. É esta unidade que trava o contrato.
 */
describe('postgres ssl options', () => {
  const bundle = '-----BEGIN CERTIFICATE-----\ncontent\n-----END CERTIFICATE-----\n';
  let caPath: string;

  beforeAll(() => {
    caPath = join(mkdtempSync(join(tmpdir(), 'rds-ca-')), 'bundle.pem');
    writeFileSync(caPath, bundle);
  });

  it('stays off when the environment does not ask for it', () => {
    expect(buildPostgresSsl(false, caPath)).toBe(false);
  });

  it('verifies the server against the bundled authorities', () => {
    expect(buildPostgresSsl(true, caPath)).toEqual({ ca: bundle, rejectUnauthorized: true });
  });

  /**
   * Cair para uma conexão sem verificação trocaria um deploy que falha por um
   * que sobe sem garantia nenhuma de com quem está falando.
   */
  it('fails loudly when the bundle is missing instead of connecting unverified', () => {
    expect(() => buildPostgresSsl(true, join(tmpdir(), 'nao-existe.pem'))).toThrow(
      /rds-global-bundle|nao-existe\.pem/,
    );
  });
});
