import { DataSource } from 'typeorm';
import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { PASSWORD_HASHER, PasswordHasher } from '../src/domain/auth/password-hasher';
import { seedOperators } from '../src/infra/database/typeorm/seeds/seed-operators';
import { createE2eTestingModule } from './e2e-app';

/**
 * Sem operador não se entra no painel, e sem painel ninguém aprova cadastro —
 * um ambiente recém-provisionado fica inutilizável. Por isso o seed é testado
 * contra o banco de verdade, e não só chamado à mão depois do deploy.
 */
describe('seedOperators (integration)', () => {
  let dataSource: DataSource;
  let hasher: PasswordHasher;

  beforeAll(async () => {
    const moduleRef = await createE2eTestingModule().compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    hasher = app.get<PasswordHasher>(PASSWORD_HASHER);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE users RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('creates the three panel operators, all owing a password change', async () => {
    await seedOperators(dataSource, hasher, 'PrimeiraSenha!2026');

    const rows = await dataSource.query(
      'SELECT email, type, role, should_change_password, password FROM users ORDER BY email',
    );

    expect(rows).toHaveLength(3);
    expect(rows.map((row: { email: string }) => row.email)).toEqual([
      'admin@mesa.tech',
      'admin@porto.example',
      'analista@porto.example',
    ]);
    expect(rows.map((row: { role: string }) => row.role)).toEqual([
      UserRoleEnum.MESA_ADMIN,
      UserRoleEnum.PORTO_ADMIN,
      UserRoleEnum.PORTO_ANALYST,
    ]);

    for (const row of rows) {
      expect(row.type).toBe(UserTypeEnum.ADMIN);
      expect(row.should_change_password).toBe(true);
      await expect(hasher.compare('PrimeiraSenha!2026', row.password)).resolves.toBe(true);
    }
  });

  it('is idempotent: a second run keeps the password the first one set', async () => {
    await seedOperators(dataSource, hasher, 'PrimeiraSenha!2026');
    const [before] = await dataSource.query(
      "SELECT password FROM users WHERE email = 'admin@mesa.tech'",
    );

    await seedOperators(dataSource, hasher, 'SenhaDiferente!2026');
    const rows = await dataSource.query('SELECT email, password FROM users');

    expect(rows).toHaveLength(3);
    expect(rows.find((row: { email: string }) => row.email === 'admin@mesa.tech').password).toBe(
      before.password,
    );
  });
});
