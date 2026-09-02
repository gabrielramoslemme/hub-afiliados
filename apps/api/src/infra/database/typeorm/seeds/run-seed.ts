import { BcryptPasswordHasher } from '@Infra/services/auth/bcrypt-password-hasher';
import dataSource from '../data-source';
import { seedOperators } from './seed-operators';

const DEFAULT_PASSWORD = 'MudarAgora!2026';

/**
 * Entrada única do seed, em `src/` para existir também em `dist/`: em
 * desenvolvimento roda por `ts-node`, e no ambiente provisionado por `node`,
 * logo depois das migrations. O `.env` é pré-carregado pelo script do npm.
 */
async function run(): Promise<void> {
  await dataSource.initialize();

  await seedOperators(
    dataSource,
    new BcryptPasswordHasher(),
    process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_PASSWORD,
  );

  await dataSource.destroy();
  process.stdout.write('Seed completed\n');
}

void run();
