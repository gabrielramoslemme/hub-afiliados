# Spec 06 — Tokens de senha, refresh e trilha de status

**Depende de:** 05 · **Entrega:** três tabelas a mais, com repositórios e a garantia de uso único dos tokens.

**Files:**
- Create: `apps/api/src/infra/database/typeorm/entities/password-reset-token.entity.ts`, `.../refresh-token.entity.ts`, `.../affiliate-status-history.entity.ts`
- Create: `apps/api/src/infra/database/typeorm/migrations/1755410000000-CreateAuthAndAuditTables.ts`
- Create: `apps/api/src/domain/auth/password-reset-token.repository.ts`, `apps/api/src/domain/auth/refresh-token.repository.ts`
- Create: `apps/api/src/domain/affiliates/affiliate-status-history.repository.ts`
- Modify: `apps/api/src/modules/shared/shared.module.ts`
- Test: `apps/api/test/repositories/password-reset-token.repository.e2e-spec.ts`

**Interfaces:**
- Consumes: `UserEntity`, `AffiliateEntity` (Spec 05); `TokenPurposeEnum`, `AffiliateStatusEnum` de `@porto/contracts`.
- Produces:
  - `PasswordResetTokenRepository`: `create(input: { userId: number; tokenHash: string; purpose: TokenPurposeEnum; expiresAt: Date }): Promise<PasswordResetTokenEntity>`, `findUsable(tokenHash: string, purpose: TokenPurposeEnum): Promise<PasswordResetTokenEntity | null>`, `markUsed(id: number): Promise<void>`, `invalidateAllFor(userId: number, purpose: TokenPurposeEnum): Promise<void>`.
  - `RefreshTokenRepository`: `create(input: { userId: number; tokenHash: string; expiresAt: Date }): Promise<RefreshTokenEntity>`, `findUsable(tokenHash: string): Promise<RefreshTokenEntity | null>`, `rotate(oldId: number, replacementId: number): Promise<void>`, `revokeAllFor(userId: number): Promise<void>`.
  - `AffiliateStatusHistoryRepository`: `record(input: { affiliateId: number; fromStatus: AffiliateStatusEnum | null; toStatus: AffiliateStatusEnum; reason?: string | null; actorUserId?: number | null }, manager?: EntityManager): Promise<void>`, `listByAffiliateId(affiliateId: number): Promise<AffiliateStatusHistoryEntity[]>`.

---

- [ ] **Step 1: Escrever as entidades**

`apps/api/src/infra/database/typeorm/entities/password-reset-token.entity.ts`:

```ts
import { TokenPurposeEnum } from '@porto/contracts';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('password_reset_tokens')
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /** SHA-256 do token. O valor em claro só existe no e-mail enviado ao usuário. */
  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'varchar', length: 20 })
  purpose: TokenPurposeEnum;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

`apps/api/src/infra/database/typeorm/entities/refresh-token.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /** Preenchido na rotação: aponta para o token que substituiu este. */
  @Column({ name: 'replaced_by_id', type: 'int', nullable: true })
  replacedById: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

`apps/api/src/infra/database/typeorm/entities/affiliate-status-history.entity.ts`:

```ts
import { AffiliateStatusEnum } from '@porto/contracts';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AffiliateEntity } from './affiliate.entity';
import { UserEntity } from './user.entity';

@Entity('affiliate_status_history')
export class AffiliateStatusHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'affiliate_id', type: 'int' })
  affiliateId: number;

  @ManyToOne(() => AffiliateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: AffiliateEntity;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: AffiliateStatusEnum | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: AffiliateStatusEnum;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **Step 2: Escrever a migration**

`apps/api/src/infra/database/typeorm/migrations/1755410000000-CreateAuthAndAuditTables.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthAndAuditTables1755410000000 implements MigrationInterface {
  name = 'CreateAuthAndAuditTables1755410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "purpose" varchar(20) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE INDEX "ix_password_reset_tokens_user_purpose"
        ON "password_reset_tokens" ("user_id", "purpose") WHERE "used_at" IS NULL`);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" int NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "replaced_by_id" int REFERENCES "refresh_tokens"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE INDEX "ix_refresh_tokens_user" ON "refresh_tokens" ("user_id") WHERE "revoked_at" IS NULL`);

    await queryRunner.query(`
      CREATE TABLE "affiliate_status_history" (
        "id" SERIAL PRIMARY KEY,
        "affiliate_id" int NOT NULL REFERENCES "affiliates"("id") ON DELETE CASCADE,
        "from_status" varchar(20),
        "to_status" varchar(20) NOT NULL,
        "reason" text,
        "actor_user_id" int REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE INDEX "ix_affiliate_status_history_affiliate"
        ON "affiliate_status_history" ("affiliate_id", "created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "affiliate_status_history"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
```

- [ ] **Step 3: Escrever o teste de integração do repositório de tokens — deve falhar**

Este é o comportamento que não pode quebrar nunca: token expirado ou já usado não é encontrado.

`apps/api/test/repositories/password-reset-token.repository.e2e-spec.ts`:

```ts
import { TokenPurposeEnum, UserTypeEnum } from '@porto/contracts';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { PasswordResetTokenRepository } from '../../src/domain/auth/password-reset-token.repository';
import { UserRepository } from '../../src/domain/users/user.repository';

describe('PasswordResetTokenRepository (integração)', () => {
  let dataSource: DataSource;
  let tokens: PasswordResetTokenRepository;
  let users: UserRepository;
  let userId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    tokens = app.get(PasswordResetTokenRepository);
    users = app.get(UserRepository);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE');
    const user = await users.save({
      name: 'Marina Ferraz',
      email: 'marina@example.com',
      type: UserTypeEnum.AFFILIATE,
    });
    userId = user.id;
  });

  afterAll(async () => { await dataSource.destroy(); });

  const future = (): Date => new Date(Date.now() + 60 * 60 * 1000);
  const past = (): Date => new Date(Date.now() - 60 * 1000);

  it('encontra um token válido pelo hash e propósito', async () => {
    await tokens.create({ userId, tokenHash: 'a'.repeat(64), purpose: TokenPurposeEnum.SET_PASSWORD, expiresAt: future() });
    const found = await tokens.findUsable('a'.repeat(64), TokenPurposeEnum.SET_PASSWORD);
    expect(found?.userId).toBe(userId);
  });

  it('não encontra token de outro propósito', async () => {
    await tokens.create({ userId, tokenHash: 'b'.repeat(64), purpose: TokenPurposeEnum.SET_PASSWORD, expiresAt: future() });
    const found = await tokens.findUsable('b'.repeat(64), TokenPurposeEnum.RESET_PASSWORD);
    expect(found).toBeNull();
  });

  it('não encontra token expirado', async () => {
    await tokens.create({ userId, tokenHash: 'c'.repeat(64), purpose: TokenPurposeEnum.SET_PASSWORD, expiresAt: past() });
    const found = await tokens.findUsable('c'.repeat(64), TokenPurposeEnum.SET_PASSWORD);
    expect(found).toBeNull();
  });

  it('não encontra token já usado', async () => {
    const created = await tokens.create({ userId, tokenHash: 'd'.repeat(64), purpose: TokenPurposeEnum.SET_PASSWORD, expiresAt: future() });
    await tokens.markUsed(created.id);
    const found = await tokens.findUsable('d'.repeat(64), TokenPurposeEnum.SET_PASSWORD);
    expect(found).toBeNull();
  });

  it('invalida todos os tokens pendentes do mesmo propósito', async () => {
    await tokens.create({ userId, tokenHash: 'e'.repeat(64), purpose: TokenPurposeEnum.RESET_PASSWORD, expiresAt: future() });
    await tokens.create({ userId, tokenHash: 'f'.repeat(64), purpose: TokenPurposeEnum.RESET_PASSWORD, expiresAt: future() });
    await tokens.invalidateAllFor(userId, TokenPurposeEnum.RESET_PASSWORD);
    expect(await tokens.findUsable('e'.repeat(64), TokenPurposeEnum.RESET_PASSWORD)).toBeNull();
    expect(await tokens.findUsable('f'.repeat(64), TokenPurposeEnum.RESET_PASSWORD)).toBeNull();
  });
});
```

- [ ] **Step 4: Rodar e confirmar a falha**

```bash
npm run test:e2e --workspace apps/api -- password-reset-token
```

Esperado: FAIL — `Cannot find module '../../src/domain/auth/password-reset-token.repository'`.

- [ ] **Step 5: Implementar os repositórios**

`apps/api/src/domain/auth/password-reset-token.repository.ts`:

```ts
import { TokenPurposeEnum } from '@porto/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { PasswordResetTokenEntity } from '@Infra/database/typeorm/entities/password-reset-token.entity';

interface CreateTokenInput {
  userId: number;
  tokenHash: string;
  purpose: TokenPurposeEnum;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly repository: Repository<PasswordResetTokenEntity>,
  ) {}

  create(input: CreateTokenInput): Promise<PasswordResetTokenEntity> {
    return this.repository.save(this.repository.create(input));
  }

  findUsable(tokenHash: string, purpose: TokenPurposeEnum): Promise<PasswordResetTokenEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, purpose, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
  }

  async markUsed(id: number): Promise<void> {
    await this.repository.update({ id }, { usedAt: new Date() });
  }

  /** Um pedido novo invalida os anteriores — dois links válidos ao mesmo tempo são superfície de ataque. */
  async invalidateAllFor(userId: number, purpose: TokenPurposeEnum): Promise<void> {
    await this.repository.update({ userId, purpose, usedAt: IsNull() }, { usedAt: new Date() });
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({ expiresAt: LessThanOrEqual(new Date()) });
  }
}
```

`apps/api/src/domain/auth/refresh-token.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RefreshTokenEntity } from '@Infra/database/typeorm/entities/refresh-token.entity';

interface CreateRefreshTokenInput {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  create(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
    return this.repository.save(this.repository.create(input));
  }

  findUsable(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
  }

  async rotate(oldId: number, replacementId: number): Promise<void> {
    await this.repository.update({ id: oldId }, { revokedAt: new Date(), replacedById: replacementId });
  }

  async revoke(id: number): Promise<void> {
    await this.repository.update({ id }, { revokedAt: new Date() });
  }

  async revokeAllFor(userId: number): Promise<void> {
    await this.repository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}
```

`apps/api/src/domain/affiliates/affiliate-status-history.repository.ts`:

```ts
import { AffiliateStatusEnum } from '@porto/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AffiliateStatusHistoryEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.entity';

interface RecordInput {
  affiliateId: number;
  fromStatus: AffiliateStatusEnum | null;
  toStatus: AffiliateStatusEnum;
  reason?: string | null;
  actorUserId?: number | null;
}

@Injectable()
export class AffiliateStatusHistoryRepository {
  constructor(
    @InjectRepository(AffiliateStatusHistoryEntity)
    private readonly repository: Repository<AffiliateStatusHistoryEntity>,
  ) {}

  /**
   * Recebe o `manager` opcional para que o registro entre na mesma transação
   * da mudança de status. Trilha auditável que pode ficar de fora não é trilha.
   */
  async record(input: RecordInput, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(AffiliateStatusHistoryEntity) : this.repository;
    await repository.save(repository.create({ ...input, reason: input.reason ?? null, actorUserId: input.actorUserId ?? null }));
  }

  listByAffiliateId(affiliateId: number): Promise<AffiliateStatusHistoryEntity[]> {
    return this.repository.find({
      where: { affiliateId },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
    });
  }
}
```

- [ ] **Step 6: Registrar tudo no `SharedModule`**

Em `apps/api/src/modules/shared/shared.module.ts`, acrescente as três entidades ao `forFeature` e os três repositórios a `providers` e `exports`:

```ts
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { RefreshTokenRepository } from '@Domain/auth/refresh-token.repository';
import { AffiliateStatusHistoryEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.entity';
import { PasswordResetTokenEntity } from '@Infra/database/typeorm/entities/password-reset-token.entity';
import { RefreshTokenEntity } from '@Infra/database/typeorm/entities/refresh-token.entity';
```

`forFeature([UserEntity, AffiliateEntity, TermsVersionEntity, PasswordResetTokenEntity, RefreshTokenEntity, AffiliateStatusHistoryEntity])`, e os repositórios novos em `providers` e `exports`.

- [ ] **Step 7: Rodar a migration e o teste**

```bash
npm run typeorm:run --workspace apps/api
npm run test:e2e --workspace apps/api -- password-reset-token
```

Esperado: PASS, 5 testes.

- [ ] **Step 8: Verificar que a migration reverte**

```bash
npm run typeorm:revert --workspace apps/api
npm run typeorm:run --workspace apps/api
```

Esperado: revert e re-aplicação sem erro.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): add password reset, refresh token and affiliate status history"
```
