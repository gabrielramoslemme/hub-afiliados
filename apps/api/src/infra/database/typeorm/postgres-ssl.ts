import { readFileSync } from 'node:fs';

/**
 * Onde o `Dockerfile` da API deixa o bundle de CAs do RDS. É caminho absoluto
 * de propósito: o CLI das migrations roda com o cwd em `/app/apps/api` e o
 * runtime do Nest também, mas nada garante isso para um `docker compose run`
 * futuro com outro `working_dir`.
 */
export const RDS_CA_BUNDLE_PATH = '/app/certs/rds-global-bundle.pem';

export type PostgresSslOptions = false | { ca: string; rejectUnauthorized: true };

/**
 * O parameter group padrão do RDS PostgreSQL 16 traz `rds.force_ssl = 1`: sem
 * TLS o servidor recusa a conexão antes de olhar a senha. E a autoridade que
 * assina o certificado do RDS não está no trust store do Node — verificar de
 * verdade exige o bundle da Amazon, versionado em `infra/certs/`.
 *
 * O Postgres local do desenvolvimento não fala TLS, e por isso o padrão é
 * desligado: quem liga é o `install-release.sh`, escrevendo `DATABASE_SSL` no
 * `api.env` da instância.
 */
export function buildPostgresSsl(
  enabled: boolean,
  caPath: string = RDS_CA_BUNDLE_PATH,
): PostgresSslOptions {
  if (!enabled) return false;

  let ca: string;
  try {
    ca = readFileSync(caPath, 'utf8');
  } catch (cause) {
    // Sem o bundle, `rejectUnauthorized` só teria duas saídas: recusar toda
    // conexão ou ser desligado. Falhar aqui é a terceira, e é a honesta —
    // subir sem verificação é o que não se faz com CPF e chave PIX na tabela.
    throw new Error(`DATABASE_SSL is on but the CA bundle could not be read at ${caPath}`, {
      cause,
    });
  }

  return { ca, rejectUnauthorized: true };
}

/**
 * Entrada para quem roda fora do Nest — o CLI das migrations e o seed, que leem
 * `process.env` direto porque não têm o `ConfigService`.
 */
export function postgresSslFromEnv(): PostgresSslOptions {
  return buildPostgresSsl(process.env.DATABASE_SSL === 'true', process.env.DATABASE_CA_PATH);
}
