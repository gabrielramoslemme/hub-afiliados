import type { DataSource } from 'typeorm';
import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import type { PasswordHasher } from '@Domain/auth/password-hasher';

/**
 * Mora em `src/` — e não junto do `seeds/seed.ts`, que fica fora — porque a
 * imagem de produção só carrega `dist/`, compilado a partir de `src/`. Um
 * ambiente novo precisa rodar isto antes do primeiro login no painel.
 */
export const SEED_OPERATORS = [
  { name: 'Analista Porto', email: 'analista@porto.example', role: UserRoleEnum.PORTO_ANALYST },
  { name: 'Administrador Porto', email: 'admin@porto.example', role: UserRoleEnum.PORTO_ADMIN },
  { name: 'Administrador Mesa', email: 'admin@mesa.tech', role: UserRoleEnum.MESA_ADMIN },
] as const;

export async function seedOperators(
  dataSource: DataSource,
  hasher: PasswordHasher,
  plainPassword: string,
): Promise<void> {
  const password = await hasher.hash(plainPassword);

  for (const operator of SEED_OPERATORS) {
    // `DO NOTHING` deixa o seed idempotente: rodar de novo num ambiente já
    // provisionado não devolve a senha do operador para a do seed.
    await dataSource.query(
      `INSERT INTO users (name, email, password, password_set_at, should_change_password, type, role)
       VALUES ($1, $2, $3, now(), true, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [operator.name, operator.email, password, UserTypeEnum.ADMIN, operator.role],
    );
  }
}
