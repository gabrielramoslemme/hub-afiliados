# Spec 05 — Entidades núcleo: `users`, `affiliates`, `terms_versions`

**Depende de:** 02, 04 · **Entrega:** migration aplicada, três entidades mapeadas, seeds de termos e de operadores rodando.

Identidade unificada com perfil 1:1, seguindo o padrão de `sis-porto-vendeu-ganhou-api` (`User` ↔ `Rescuer`). As colunas de domínio do afiliado nascem `NOT NULL` em `affiliates`, nunca como colunas nulas em `users`.

**Files:**
- Modify: `apps/api/package.json` (dependência `@porto/contracts`, `uuid`, `cpf-cnpj-validator`, `bcrypt`)
- Create: `apps/api/src/infra/database/typeorm/entities/user.entity.ts`, `.../affiliate.entity.ts`, `.../terms-version.entity.ts`
- Create: `apps/api/src/infra/database/typeorm/migrations/1755400000000-CreateCoreTables.ts`
- Create: `apps/api/src/domain/users/user.repository.ts`, `apps/api/src/domain/affiliates/affiliate.repository.ts`, `apps/api/src/domain/terms/terms-version.repository.ts`
- Create: `apps/api/src/domain/shared/utils/cpf.util.ts`
- Create: `apps/api/src/testing/factories/user.factory.ts`, `apps/api/src/testing/factories/affiliate.factory.ts`
- Create: `apps/api/seeds/seed.ts`
- Create: `apps/api/ormconfig.ts`
- Test: `apps/api/src/domain/shared/utils/cpf.util.spec.ts`

**Interfaces:**
- Consumes: enums de `@porto/contracts` (Spec 04); `EnvironmentVariableService` (Spec 02).
- Produces:
  - `UserEntity`, `AffiliateEntity`, `TermsVersionEntity`.
  - `UserRepository`: `findByEmail(email: string): Promise<UserEntity | null>`, `findByPublicId(publicId: string): Promise<UserEntity | null>`, `save(user: Partial<UserEntity>): Promise<UserEntity>`.
  - `AffiliateRepository`: `findByCpf(cpf: string): Promise<AffiliateEntity | null>`, `findByPublicId(publicId: string): Promise<AffiliateEntity | null>`, `findByUserId(userId: number): Promise<AffiliateEntity | null>`, `save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity>`.
  - `TermsVersionRepository`: `findCurrent(): Promise<TermsVersionEntity | null>`, `findById(id: number): Promise<TermsVersionEntity | null>`.
  - `maskCpf(cpf: string): string`, `sanitizeCpf(cpf: string): string`, `isValidCpf(cpf: string): boolean`.
  - `buildUser(overrides?)` e `buildAffiliate(overrides?)` para os testes.

---

- [ ] **Step 1: Adicionar dependências à API**

Em `apps/api/package.json`, adicione a `dependencies`:

```json
"@porto/contracts": "*",
"bcrypt": "^6.0.0",
"cpf-cnpj-validator": "^1.0.3",
"uuid": "^11.0.5"
```

E a `devDependencies`:

```json
"@types/bcrypt": "^6.0.0"
```

```bash
npm install
```

- [ ] **Step 2: Escrever o teste do utilitário de CPF — deve falhar**

`apps/api/src/domain/shared/utils/cpf.util.spec.ts`:

```ts
import { isValidCpf, maskCpf, sanitizeCpf } from './cpf.util';

describe('cpf.util', () => {
  describe('sanitizeCpf', () => {
    it('remove pontuação', () => {
      expect(sanitizeCpf('529.982.247-25')).toBe('52998224725');
    });
  });

  describe('isValidCpf', () => {
    it('aceita um CPF com dígito verificador correto', () => {
      expect(isValidCpf('529.982.247-25')).toBe(true);
    });

    it('rejeita um CPF com dígito verificador errado', () => {
      expect(isValidCpf('529.982.247-26')).toBe(false);
    });

    it('rejeita uma sequência de dígitos iguais', () => {
      expect(isValidCpf('111.111.111-11')).toBe(false);
    });
  });

  describe('maskCpf', () => {
    it('esconde os seis primeiros dígitos', () => {
      expect(maskCpf('52998224725')).toBe('***.***.247-25');
    });
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- cpf.util
```

Esperado: FAIL — `Cannot find module './cpf.util'`.

- [ ] **Step 4: Implementar o utilitário**

`apps/api/src/domain/shared/utils/cpf.util.ts`:

```ts
import { cpf } from 'cpf-cnpj-validator';

export function sanitizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  return cpf.isValid(sanitizeCpf(value));
}

/** Máscara para listagem no painel: preserva só os cinco últimos dígitos. */
export function maskCpf(value: string): string {
  const digits = sanitizeCpf(value);
  if (digits.length !== 11) return '***.***.***-**';
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npm run test --workspace apps/api -- cpf.util
```

Esperado: PASS, 5 testes.

- [ ] **Step 6: Escrever as entidades**

`apps/api/src/infra/database/typeorm/entities/user.entity.ts`:

```ts
import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Generated, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { AffiliateEntity } from './affiliate.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'citext', unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ name: 'password_set_at', type: 'timestamptz', nullable: true })
  passwordSetAt: Date | null;

  @Column({ name: 'should_change_password', type: 'boolean', default: false })
  shouldChangePassword: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20 })
  type: UserTypeEnum;

  @Column({ type: 'varchar', length: 30, nullable: true })
  role: UserRoleEnum | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  @OneToOne(() => AffiliateEntity, (affiliate) => affiliate.user)
  affiliate?: AffiliateEntity | null;
}
```

`apps/api/src/infra/database/typeorm/entities/terms-version.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('terms_versions')
export class TermsVersionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  version: string;

  @Column({ name: 'content_url', type: 'varchar', length: 500 })
  contentUrl: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

`apps/api/src/infra/database/typeorm/entities/affiliate.entity.ts`:

```ts
import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import {
  Column, CreateDateColumn, Entity, Generated, JoinColumn,
  ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { TermsVersionEntity } from './terms-version.entity';
import { UserEntity } from './user.entity';

@Entity('affiliates')
export class AffiliateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId: number;

  @OneToOne(() => UserEntity, (user) => user.affiliate)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf: string;

  @Column({ name: 'pix_key_type', type: 'varchar', length: 10 })
  pixKeyType: PixKeyTypeEnum;

  @Column({ name: 'pix_key', type: 'varchar', length: 140 })
  pixKey: string;

  @Column({ type: 'varchar', length: 20, default: AffiliateStatusEnum.PENDING_APPROVAL })
  status: AffiliateStatusEnum;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by_user_id', type: 'int', nullable: true })
  approvedByUserId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy: UserEntity | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'terms_version_id', type: 'int' })
  termsVersionId: number;

  @ManyToOne(() => TermsVersionEntity)
  @JoinColumn({ name: 'terms_version_id' })
  termsVersion: TermsVersionEntity;

  @Column({ name: 'terms_accepted_at', type: 'timestamptz' })
  termsAcceptedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

- [ ] **Step 7: Escrever a migration**

O `citext` do e-mail exige a extensão — por isso a migration não é gerada automaticamente.

`apps/api/src/infra/database/typeorm/migrations/1755400000000-CreateCoreTables.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreTables1755400000000 implements MigrationInterface {
  name = 'CreateCoreTables1755400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "terms_versions" (
        "id" SERIAL PRIMARY KEY,
        "version" varchar(30) NOT NULL UNIQUE,
        "content_url" varchar(500) NOT NULL,
        "published_at" timestamptz NOT NULL,
        "is_current" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_terms_versions_current"
        ON "terms_versions" ("is_current") WHERE "is_current" = true`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "email" citext NOT NULL UNIQUE,
        "password" varchar(255),
        "password_set_at" timestamptz,
        "should_change_password" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "type" varchar(20) NOT NULL,
        "role" varchar(30),
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "ck_users_role_required_for_admin"
          CHECK (("type" = 'ADMIN' AND "role" IS NOT NULL) OR ("type" = 'AFFILIATE' AND "role" IS NULL))
      )`);

    await queryRunner.query(`
      CREATE TABLE "affiliates" (
        "id" SERIAL PRIMARY KEY,
        "public_id" uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        "user_id" int NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "cpf" varchar(11) NOT NULL UNIQUE,
        "pix_key_type" varchar(10) NOT NULL,
        "pix_key" varchar(140) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING_APPROVAL',
        "approved_at" timestamptz,
        "approved_by_user_id" int REFERENCES "users"("id"),
        "rejection_reason" text,
        "terms_version_id" int NOT NULL REFERENCES "terms_versions"("id"),
        "terms_accepted_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_affiliates_rejection_reason"
          CHECK ("status" <> 'REJECTED' OR "rejection_reason" IS NOT NULL)
      )`);

    await queryRunner.query(`CREATE INDEX "ix_affiliates_status" ON "affiliates" ("status")`);
    await queryRunner.query(`CREATE INDEX "ix_affiliates_created_at" ON "affiliates" ("created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "affiliates"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "terms_versions"`);
  }
}
```

> A constraint `ck_affiliates_rejection_reason` é o que garante, no banco, a regra do RF-07: reprovação sem motivo não existe.

- [ ] **Step 8: Configurar o data source de CLI e rodar a migration**

`apps/api/ormconfig.ts`:

```ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/infra/database/typeorm/entities/*.entity.ts'],
  migrations: ['src/infra/database/typeorm/migrations/*.ts'],
});
```

Adicione `dotenv` às dependências da API e rode:

```bash
npm install
npm run typeorm:run --workspace apps/api
psql postgres://porto:porto@localhost:5432/hub_afiliados -c '\d affiliates'
```

Esperado: a migration aplica sem erro e o `\d affiliates` lista as colunas e as duas constraints.

- [ ] **Step 9: Escrever os repositórios**

`apps/api/src/domain/users/user.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email }, relations: { affiliate: true } });
  }

  findByPublicId(publicId: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { publicId }, relations: { affiliate: true } });
  }

  findById(id: number): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  save(user: Partial<UserEntity>): Promise<UserEntity> {
    return this.repository.save(this.repository.create(user));
  }
}
```

`apps/api/src/domain/affiliates/affiliate.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';

@Injectable()
export class AffiliateRepository {
  constructor(
    @InjectRepository(AffiliateEntity)
    private readonly repository: Repository<AffiliateEntity>,
  ) {}

  findByCpf(cpf: string): Promise<AffiliateEntity | null> {
    return this.repository.findOne({ where: { cpf } });
  }

  findByPublicId(publicId: string): Promise<AffiliateEntity | null> {
    return this.repository.findOne({
      where: { publicId },
      relations: { user: true, termsVersion: true, approvedBy: true },
    });
  }

  findByUserId(userId: number): Promise<AffiliateEntity | null> {
    return this.repository.findOne({ where: { userId }, relations: { user: true } });
  }

  save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity> {
    return this.repository.save(this.repository.create(affiliate));
  }
}
```

`apps/api/src/domain/terms/terms-version.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermsVersionEntity } from '@Infra/database/typeorm/entities/terms-version.entity';

@Injectable()
export class TermsVersionRepository {
  constructor(
    @InjectRepository(TermsVersionEntity)
    private readonly repository: Repository<TermsVersionEntity>,
  ) {}

  findCurrent(): Promise<TermsVersionEntity | null> {
    return this.repository.findOne({ where: { isCurrent: true } });
  }

  findById(id: number): Promise<TermsVersionEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}
```

- [ ] **Step 10: Escrever as factories de teste**

`apps/api/src/testing/factories/user.factory.ts`:

```ts
import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';

let sequence = 0;

export function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  sequence += 1;
  return Object.assign(new UserEntity(), {
    id: sequence,
    publicId: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    name: `Usuário ${sequence}`,
    email: `usuario${sequence}@example.com`,
    password: null,
    passwordSetAt: null,
    shouldChangePassword: false,
    isActive: true,
    type: UserTypeEnum.AFFILIATE,
    role: null,
    lastLoginAt: null,
    createdAt: new Date('2026-08-17T12:00:00Z'),
    updatedAt: new Date('2026-08-17T12:00:00Z'),
    deletedAt: null,
    ...overrides,
  });
}

export function buildAdminUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return buildUser({
    type: UserTypeEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    password: '$2b$10$hashed',
    passwordSetAt: new Date('2026-08-17T12:00:00Z'),
    ...overrides,
  });
}
```

`apps/api/src/testing/factories/affiliate.factory.ts`:

```ts
import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';
import { buildUser } from './user.factory';

let sequence = 0;

export function buildAffiliate(overrides: Partial<AffiliateEntity> = {}): AffiliateEntity {
  sequence += 1;
  const user = overrides.user ?? buildUser();
  return Object.assign(new AffiliateEntity(), {
    id: sequence,
    publicId: `10000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    userId: user.id,
    user,
    cpf: '52998224725',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: user.email,
    status: AffiliateStatusEnum.PENDING_APPROVAL,
    approvedAt: null,
    approvedByUserId: null,
    approvedBy: null,
    rejectionReason: null,
    termsVersionId: 1,
    termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    createdAt: new Date('2026-08-17T12:00:00Z'),
    updatedAt: new Date('2026-08-17T12:00:00Z'),
    ...overrides,
  });
}
```

- [ ] **Step 11: Escrever o seed**

Cria a versão vigente dos termos e os operadores do painel. Enquanto o Jurídico da Porto não entrega o texto oficial (dependência D12), a versão é `1.0-homolog`.

`apps/api/seeds/seed.ts`:

```ts
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
```

Adicione ao `apps/api/package.json`, em `scripts`:

```json
"seed": "ts-node -r tsconfig-paths/register seeds/seed.ts"
```

- [ ] **Step 12: Registrar as entidades e rodar o seed**

Crie `apps/api/src/modules/shared/shared.module.ts` importando as entidades e exportando os repositórios:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';
import { UserRepository } from '@Domain/users/user.repository';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';
import { TermsVersionEntity } from '@Infra/database/typeorm/entities/terms-version.entity';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, AffiliateEntity, TermsVersionEntity])],
  providers: [UserRepository, AffiliateRepository, TermsVersionRepository],
  exports: [UserRepository, AffiliateRepository, TermsVersionRepository, TypeOrmModule],
})
export class SharedModule {}
```

```bash
npm run seed --workspace apps/api
psql postgres://porto:porto@localhost:5432/hub_afiliados -c "SELECT email, type, role FROM users"
```

Esperado: três operadores listados, todos com `type = ADMIN`.

- [ ] **Step 13: Rodar a suíte inteira**

```bash
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
```

Esperado: tudo passa.

- [ ] **Step 14: Commit**

```bash
git add apps/api
git commit -m "feat(api): add users, affiliates and terms_versions with migration and seed"
```
