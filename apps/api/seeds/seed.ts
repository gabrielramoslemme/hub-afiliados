import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import dataSource from '../ormconfig';

const OPERATORS = [
  { name: 'Analista Porto', email: 'analista@porto.example', role: UserRoleEnum.PORTO_ANALYST },
  { name: 'Administrador Porto', email: 'admin@porto.example', role: UserRoleEnum.PORTO_ADMIN },
  { name: 'Administrador Mesa', email: 'admin@mesa.tech', role: UserRoleEnum.MESA_ADMIN },
];

async function seed(): Promise<void> {
  await dataSource.initialize();

  await dataSource.query(
    `INSERT INTO terms_versions (version, content_url, published_at, is_current)
     VALUES ('1.0-homolog', 'https://afiliados.porto.example/termos/1.0-homolog', now(), true)
     ON CONFLICT (version) DO NOTHING`,
  );

  const password = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'MudarAgora!2026', 10);

  for (const operator of OPERATORS) {
    await dataSource.query(
      `INSERT INTO users (name, email, password, password_set_at, should_change_password, type, role)
       VALUES ($1, $2, $3, now(), true, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [operator.name, operator.email, password, UserTypeEnum.ADMIN, operator.role],
    );
  }

  await dataSource.destroy();
  process.stdout.write('Seed concluído\n');
}

void seed();
