import { rwGrantStatements } from './rw-role-statements';

describe('rwGrantStatements', () => {
  /*
    A lista inteira, e não `toContain`: o que protege aqui é o que o papel NÃO
    ganha. Uma instrução a mais — um `GRANT ALL ON SCHEMA`, que inclui CREATE —
    passaria despercebida numa asserção que só procura as esperadas.
  */
  it('grants row read and write and nothing else', () => {
    expect(rwGrantStatements('hub_rw', 'hub_afiliados')).toEqual([
      'GRANT CONNECT ON DATABASE "hub_afiliados" TO "hub_rw"',
      'GRANT USAGE ON SCHEMA "public" TO "hub_rw"',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "hub_rw"',
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "hub_rw"',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "hub_rw"',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT USAGE, SELECT ON SEQUENCES TO "hub_rw"',
    ]);
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
