/**
 * Identificador SQL entra em GRANT por interpolação — GRANT não aceita
 * parâmetro. Hoje os nomes são constantes do repositório, então não há entrada
 * de usuário aqui; a validação existe para que isso continue verdadeiro se
 * alguém tornar o nome configurável mais tarde.
 */
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

function quoteIdentifier(value: string, kind: string): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Invalid SQL identifier for ${kind}: ${JSON.stringify(value)}`);
  }

  return `"${value}"`;
}

/**
 * Privilégios do papel que as pessoas usam para abrir o banco: leitura e
 * escrita de linha, e nada de DDL. O master fica fora de circulação.
 *
 * As duas últimas cobrem tabela que ainda não existe: `ALTER DEFAULT
 * PRIVILEGES` vale para o que a migration criar depois, sob o mesmo papel que
 * roda estas instruções. Sem elas, cada release nova voltaria com tabela
 * inacessível e o sintoma seria permissão negada só na tabela recém-criada.
 */
export function rwGrantStatements(role: string, database: string): string[] {
  const roleName = quoteIdentifier(role, 'role');
  const databaseName = quoteIdentifier(database, 'database');
  const schemaName = quoteIdentifier('public', 'schema');
  const dml = 'SELECT, INSERT, UPDATE, DELETE';

  return [
    `GRANT CONNECT ON DATABASE ${databaseName} TO ${roleName}`,
    `GRANT USAGE ON SCHEMA ${schemaName} TO ${roleName}`,
    `GRANT ${dml} ON ALL TABLES IN SCHEMA ${schemaName} TO ${roleName}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} TO ${roleName}`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT ${dml} ON TABLES TO ${roleName}`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT USAGE, SELECT ON SEQUENCES TO ${roleName}`,
  ];
}
