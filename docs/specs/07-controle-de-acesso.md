# Spec 07 — Núcleo de autenticação: hash, JWT, guards e rate limit

**Depende de:** 06 · **Entrega:** guard global de negação ativo, dois guards de audiência, emissão e verificação de JWT, e rate limit nas rotas sensíveis.

Esta é a task que paga o preço da identidade unificada. Com `users` servindo app e painel, **esquecer de checar a audiência numa rota é escalação de privilégio**. A mitigação é estrutural: nada é público por omissão.

**Files:**
- Modify: `apps/api/package.json` (`@nestjs/jwt`, `@nestjs/throttler`)
- Create: `apps/api/src/infra/services/crypto/password-hash.service.ts`, `.../token-hash.service.ts`, `apps/api/src/infra/services/crypto/crypto.module.ts`
- Create: `apps/api/src/modules/shared/auth/access-token.service.ts`
- Create: `apps/api/src/modules/shared/auth/decorators/public.decorator.ts`, `.../current-user.decorator.ts`
- Create: `apps/api/src/modules/shared/auth/guards/jwt-audience.guard.ts`, `.../affiliate.guard.ts`, `.../admin.guard.ts`, `.../roles.decorator.ts`
- Create: `apps/api/src/modules/shared/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/infra/config/env.validation.ts`, `apps/api/src/infra/config/environment-variable.service.ts`, `apps/api/.env.example`
- Test: `apps/api/src/infra/services/crypto/password-hash.service.spec.ts`, `apps/api/src/modules/shared/auth/access-token.service.spec.ts`, `apps/api/src/modules/shared/auth/guards/affiliate.guard.spec.ts`

**Interfaces:**
- Consumes: `UserRepository`, `AffiliateRepository` (Spec 05).
- Produces:
  - `PasswordHashService`: `hash(plain: string): Promise<string>`, `compare(plain: string, hash: string): Promise<boolean>`.
  - `TokenHashService`: `generate(): { token: string; hash: string }`, `hash(token: string): string`.
  - `AccessTokenService`: `sign(payload: JwtPayload): string`, `verify(token: string): JwtPayload`.
  - `JwtPayload = { sub: string; aud: AuthAudienceEnum; type: UserTypeEnum; role: UserRoleEnum | null }` — `sub` é o `public_id` do usuário.
  - `AuthenticatedUser = { id: number; publicId: string; name: string; email: string; type: UserTypeEnum; role: UserRoleEnum | null; affiliateId: number | null; affiliatePublicId: string | null }`.
  - Decorators `@Public()`, `@Roles(...roles)`, `@CurrentUser()`.
  - `AffiliateGuard`, `AdminGuard`.

---

- [ ] **Step 1: Adicionar dependências e variáveis de ambiente**

Em `apps/api/package.json`, `dependencies`:

```json
"@nestjs/jwt": "^11.0.2",
"@nestjs/throttler": "^6.4.0"
```

Em `env.validation.ts`, acrescente ao schema:

```ts
  ACCESS_TOKEN_TTL: Joi.string().default('1h'),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().default(30),
  SET_PASSWORD_TOKEN_TTL_HOURS: Joi.number().default(48),
  RESET_PASSWORD_TOKEN_TTL_HOURS: Joi.number().default(2),
```

Em `EnvironmentVariableService`, os getters correspondentes:

```ts
  get accessTokenTtl(): string { return this.config.get<string>('ACCESS_TOKEN_TTL') ?? '1h'; }
  get refreshTokenTtlDays(): number { return Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 30); }
  get setPasswordTokenTtlHours(): number { return Number(this.config.get('SET_PASSWORD_TOKEN_TTL_HOURS') ?? 48); }
  get resetPasswordTokenTtlHours(): number { return Number(this.config.get('RESET_PASSWORD_TOKEN_TTL_HOURS') ?? 2); }
```

E as mesmas chaves em `.env.example`.

```bash
npm install
```

- [ ] **Step 2: Escrever o teste do hash de senha — deve falhar**

`apps/api/src/infra/services/crypto/password-hash.service.spec.ts`:

```ts
import { PasswordHashService } from './password-hash.service';

describe('PasswordHashService', () => {
  const service = new PasswordHashService();

  it('gera hash diferente do texto original', async () => {
    const hash = await service.hash('SenhaSegura!2026');
    expect(hash).not.toBe('SenhaSegura!2026');
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('gera hashes diferentes para a mesma senha', async () => {
    const first = await service.hash('SenhaSegura!2026');
    const second = await service.hash('SenhaSegura!2026');
    expect(first).not.toBe(second);
  });

  it('confirma a senha correta', async () => {
    const hash = await service.hash('SenhaSegura!2026');
    await expect(service.compare('SenhaSegura!2026', hash)).resolves.toBe(true);
  });

  it('rejeita a senha errada', async () => {
    const hash = await service.hash('SenhaSegura!2026');
    await expect(service.compare('OutraSenha!2026', hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- password-hash
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar os serviços de criptografia**

`apps/api/src/infra/services/crypto/password-hash.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class PasswordHashService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
```

`apps/api/src/infra/services/crypto/token-hash.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class TokenHashService {
  /** O token em claro vai para o e-mail; só o hash é persistido. */
  generate(): { token: string; hash: string } {
    const token = randomBytes(32).toString('hex');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
```

`apps/api/src/infra/services/crypto/crypto.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { PasswordHashService } from './password-hash.service';
import { TokenHashService } from './token-hash.service';

@Global()
@Module({
  providers: [PasswordHashService, TokenHashService],
  exports: [PasswordHashService, TokenHashService],
})
export class CryptoModule {}
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npm run test --workspace apps/api -- password-hash
```

Esperado: PASS, 4 testes.

- [ ] **Step 6: Escrever o teste do serviço de access token — deve falhar**

`apps/api/src/modules/shared/auth/access-token.service.spec.ts`:

```ts
import { AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';

describe('AccessTokenService', () => {
  const secret = 'test-secret-with-at-least-32-characters!!';
  const jwt = new JwtService({ secret });
  const env = { jwtSecret: secret, accessTokenTtl: '1h' } as never;
  const service = new AccessTokenService(jwt, env);

  const payload = {
    sub: '00000000-0000-4000-8000-000000000001',
    aud: AuthAudienceEnum.AFFILIATE,
    type: UserTypeEnum.AFFILIATE,
    role: null,
  };

  it('assina e verifica preservando o payload', () => {
    const token = service.sign(payload);
    expect(service.verify(token)).toMatchObject(payload);
  });

  it('preserva a role do operador do painel', () => {
    const adminPayload = {
      sub: '00000000-0000-4000-8000-000000000002',
      aud: AuthAudienceEnum.ADMIN,
      type: UserTypeEnum.ADMIN,
      role: UserRoleEnum.PORTO_ANALYST,
    };
    expect(service.verify(service.sign(adminPayload))).toMatchObject(adminPayload);
  });

  it('rejeita token adulterado', () => {
    const token = `${service.sign(payload)}x`;
    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejeita token assinado com outro segredo', () => {
    const foreign = new JwtService({ secret: 'outro-segredo-com-mais-de-32-caracteres!' });
    const token = foreign.sign(payload, { secret: 'outro-segredo-com-mais-de-32-caracteres!' });
    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 7: Implementar o `AccessTokenService`**

`apps/api/src/modules/shared/auth/access-token.service.ts`:

```ts
import { AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';

export interface JwtPayload {
  /** public_id do usuário. O id serial nunca sai da API. */
  sub: string;
  aud: AuthAudienceEnum;
  type: UserTypeEnum;
  role: UserRoleEnum | null;
}

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly env: EnvironmentVariableService,
  ) {}

  sign(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.env.jwtSecret,
      expiresIn: this.env.accessTokenTtl,
    });
  }

  verify(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token, { secret: this.env.jwtSecret });
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Sessão inválida ou expirada' });
    }
  }
}
```

- [ ] **Step 8: Escrever os decorators**

`apps/api/src/modules/shared/auth/decorators/public.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Torna a rota acessível sem token. Exigido explicitamente porque o guard
 * global nega por omissão.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
```

`apps/api/src/modules/shared/auth/guards/roles.decorator.ts`:

```ts
import { UserRoleEnum } from '@porto/contracts';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRoleEnum[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
```

`apps/api/src/modules/shared/auth/decorators/current-user.decorator.ts`:

```ts
import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: number;
  publicId: string;
  name: string;
  email: string;
  type: UserTypeEnum;
  role: UserRoleEnum | null;
  affiliateId: number | null;
  affiliatePublicId: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
);
```

- [ ] **Step 9: Escrever o teste do `AffiliateGuard` — deve falhar**

`apps/api/src/modules/shared/auth/guards/affiliate.guard.spec.ts`:

```ts
import { AffiliateStatusEnum, AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { AffiliateGuard } from './affiliate.guard';

describe('AffiliateGuard', () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;

  const contextWith = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers: authorization ? { authorization } : {} }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  const makeGuard = (user: unknown, payloadOverrides = {}) => {
    const accessToken = {
      verify: jest.fn().mockReturnValue({
        sub: 'public-id',
        aud: AuthAudienceEnum.AFFILIATE,
        type: UserTypeEnum.AFFILIATE,
        role: null,
        ...payloadOverrides,
      }),
    };
    const users = { findByPublicId: jest.fn().mockResolvedValue(user) };
    return new AffiliateGuard(reflector, accessToken as never, users as never);
  };

  it('rejeita requisição sem header Authorization', async () => {
    const guard = makeGuard(buildUser());
    await expect(guard.canActivate(contextWith())).rejects.toThrow(UnauthorizedException);
  });

  it('aceita afiliado aprovado e ativo', async () => {
    const user = buildUser();
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.APPROVED });
    const guard = makeGuard(user);
    await expect(guard.canActivate(contextWith('Bearer token'))).resolves.toBe(true);
  });

  it('rejeita afiliado ainda pendente de aprovação', async () => {
    const user = buildUser();
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.PENDING_APPROVAL });
    const guard = makeGuard(user);
    await expect(guard.canActivate(contextWith('Bearer token'))).rejects.toThrow(ForbiddenException);
  });

  it('rejeita conta desativada', async () => {
    const user = buildUser({ isActive: false });
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.APPROVED });
    const guard = makeGuard(user);
    await expect(guard.canActivate(contextWith('Bearer token'))).rejects.toThrow(ForbiddenException);
  });

  it('rejeita token de operador do painel', async () => {
    const admin = buildAdminUser({ role: UserRoleEnum.PORTO_ADMIN });
    const guard = makeGuard(admin, { aud: AuthAudienceEnum.ADMIN, type: UserTypeEnum.ADMIN });
    await expect(guard.canActivate(contextWith('Bearer token'))).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 10: Implementar os guards**

`apps/api/src/modules/shared/auth/guards/jwt-audience.guard.ts` — a base comum:

```ts
import { AuthAudienceEnum } from '@porto/contracts';
import {
  CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRepository } from '@Domain/users/user.repository';
import { AccessTokenService, JwtPayload } from '../access-token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';

export abstract class JwtAudienceGuard implements CanActivate {
  protected abstract readonly audience: AuthAudienceEnum;

  constructor(
    protected readonly reflector: Reflector,
    protected readonly accessToken: AccessTokenService,
    protected readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'MISSING_TOKEN', message: 'Autenticação obrigatória' });
    }

    const payload = this.accessToken.verify(header.slice('Bearer '.length));
    if (payload.aud !== this.audience) {
      throw new ForbiddenException({ code: 'WRONG_AUDIENCE', message: 'Token não vale para este canal' });
    }

    const user = await this.users.findByPublicId(payload.sub);
    if (!user || !user.isActive) {
      throw new ForbiddenException({ code: 'ACCOUNT_INACTIVE', message: 'Conta indisponível' });
    }

    await this.authorize(user, payload, context);
    request.user = this.toAuthenticatedUser(user);
    return true;
  }

  protected abstract authorize(
    user: UserEntity,
    payload: JwtPayload,
    context: ExecutionContext,
  ): Promise<void>;

  private toAuthenticatedUser(user: UserEntity): AuthenticatedUser {
    return {
      id: user.id,
      publicId: user.publicId,
      name: user.name,
      email: user.email,
      type: user.type,
      role: user.role,
      affiliateId: user.affiliate?.id ?? null,
      affiliatePublicId: user.affiliate?.publicId ?? null,
    };
  }
}
```

`apps/api/src/modules/shared/auth/guards/affiliate.guard.ts`:

```ts
import { AffiliateStatusEnum, AuthAudienceEnum, UserTypeEnum } from '@porto/contracts';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';
import { JwtAudienceGuard } from './jwt-audience.guard';

@Injectable()
export class AffiliateGuard extends JwtAudienceGuard {
  protected readonly audience = AuthAudienceEnum.AFFILIATE;

  protected async authorize(user: UserEntity): Promise<void> {
    if (user.type !== UserTypeEnum.AFFILIATE || !user.affiliate) {
      throw new ForbiddenException({ code: 'WRONG_AUDIENCE', message: 'Token não vale para este canal' });
    }
    if (user.affiliate.status !== AffiliateStatusEnum.APPROVED) {
      throw new ForbiddenException({ code: 'ACCOUNT_INACTIVE', message: 'Cadastro não está aprovado' });
    }
  }
}
```

`apps/api/src/modules/shared/auth/guards/admin.guard.ts`:

```ts
import { AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';
import { JwtAudienceGuard } from './jwt-audience.guard';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class AdminGuard extends JwtAudienceGuard {
  protected readonly audience = AuthAudienceEnum.ADMIN;

  protected async authorize(
    user: UserEntity,
    _payload: unknown,
    context: ExecutionContext,
  ): Promise<void> {
    if (user.type !== UserTypeEnum.ADMIN || !user.role) {
      throw new ForbiddenException({ code: 'WRONG_AUDIENCE', message: 'Token não vale para este canal' });
    }

    const required = this.reflector.getAllAndOverride<UserRoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length && !required.includes(user.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN_ROLE', message: 'Permissão insuficiente' });
    }
  }
}
```

- [ ] **Step 11: Rodar os testes do guard**

```bash
npm run test --workspace apps/api -- affiliate.guard access-token
```

Esperado: PASS, 9 testes.

- [ ] **Step 12: Montar o `AuthModule` e ligar o guard global**

`apps/api/src/modules/shared/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from '@Modules/shared/shared.module';
import { AccessTokenService } from './access-token.service';
import { AdminGuard } from './guards/admin.guard';
import { AffiliateGuard } from './guards/affiliate.guard';

@Module({
  imports: [JwtModule.register({}), SharedModule],
  providers: [AccessTokenService, AffiliateGuard, AdminGuard],
  exports: [AccessTokenService, AffiliateGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
```

Em `apps/api/src/app.module.ts`, adicione o rate limit e o `CryptoModule`:

```ts
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CryptoModule } from '@Infra/services/crypto/crypto.module';

@Module({
  imports: [
    AppConfigModule,
    CryptoModule,
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'sensitive', ttl: 60_000, limit: 5 },
    ]),
    HealthModule,
    MobileModule,
    AdminModule,
    WebhookModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

> **Guard global de negação:** não existe um guard "genérico" que sirva para os dois canais, porque cada um tem regra própria. A regra estrutural é: **todo controller em `modules/mobile` declara `@UseGuards(AffiliateGuard)` na classe, e todo controller em `modules/admin` declara `@UseGuards(AdminGuard)` na classe.** Rotas públicas dentro deles usam `@Public()`. Essa é a linha que a revisão de código verifica em toda PR.

- [ ] **Step 13: Documentar a regra dos guards no README da API**

Crie `apps/api/README.md` com a seção que qualquer pessoa nova precisa ler antes de abrir um controller:

````markdown
# Hub de Afiliados — API

Três canais, três audiências de JWT:

| Módulo | Prefixo | Guard obrigatório na classe do controller |
|---|---|---|
| `modules/mobile` | `/v1/mobile` | `@UseGuards(AffiliateGuard)` |
| `modules/admin` | `/v1/admin` | `@UseGuards(AdminGuard)` |
| `modules/webhooks` | `/v1/webhooks` | assinatura própria, sem JWT |

**Regra que não se negocia:** a identidade é unificada em `users`, então um
token de operador e um token de afiliado só se distinguem pela audiência.
Todo controller declara o guard na classe; rotas abertas usam `@Public()`
explicitamente. Controller sem guard é bug de segurança, não descuido de estilo.

Rate limit: use `@Throttle({ sensitive: { limit: 5, ttl: 60000 } })` em login,
cadastro e recuperação de senha.
````

- [ ] **Step 14: Rodar tudo e commitar**

```bash
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
npm run lint --workspace apps/api
git add apps/api
git commit -m "feat(api): add password hashing, jwt audiences, channel guards and rate limit"
```
