import { rwGrantStatements } from './rw-role-statements';

describe('rwGrantStatements', () => {
  it('grants connect, schema usage and DML over the application schema', () => {
    const statements = rwGrantStatements('hub_rw', 'hub_afiliados').join('\n');

    expect(statements).toContain('GRANT CONNECT ON DATABASE "hub_afiliados" TO "hub_rw"');
    expect(statements).toContain('GRANT USAGE ON SCHEMA "public" TO "hub_rw"');
    expect(statements).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "hub_rw"',
    );
    expect(statements).toContain(
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "hub_rw"',
    );
  });

  it('covers tables created by later migrations through default privileges', () => {
    const statements = rwGrantStatements('hub_rw', 'hub_afiliados').join('\n');

    expect(statements).toContain(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "hub_rw"',
    );
  });

  it('never grants DDL', () => {
    const statements = rwGrantStatements('hub_rw', 'hub_afiliados').join('\n');

    expect(statements).not.toMatch(/\bCREATE\b/);
    expect(statements).not.toMatch(/\bALTER TABLE\b/);
    expect(statements).not.toMatch(/\bDROP\b/);
  });

  // Os identificadores são constantes do repositório, não entrada de usuário -
  // mas eles entram na SQL por interpolação, e é a validação que mantém isso
  // verdadeiro se alguém tornar o nome configurável depois.
  it.each(['hub_rw"; DROP TABLE users; --', 'hub rw', '1role', ''])(
    'rejects %p as a role name',
    (role) => {
      expect(() => rwGrantStatements(role, 'hub_afiliados')).toThrow(/identifier/i);
    },
  );

  it('rejects an invalid database name', () => {
    expect(() => rwGrantStatements('hub_rw', 'hub"afiliados')).toThrow(/identifier/i);
  });
});
