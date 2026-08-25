# Canal `/v1/admin` na API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o canal `/v1/admin` — login do operador, fila de cadastros, detalhe, histórico, aprovar e reprovar — para o painel que já existe em `apps/web` deixar de rodar contra o dublê.

**Architecture:** Autenticação nasce como ports no domínio (`PasswordHasher`, `AccessTokenIssuer`, `AccessTokenVerifier`, `TokenGenerator`, `Clock`, `LinkBuilder`) com adapters em `src/infra/services/`; nenhum use case importa biblioteca. Um `AuthenticatedGuard` global nega por omissão e um `AdminGuard` de canal confere audiência e perfil. As rotas chamam use cases puros que orquestram os repositórios já existentes — não há migration, porque o schema já modela decisão, auditoria e token de uso único.

**Tech Stack:** NestJS 11 · `@nestjs/jwt` (novo) · TypeORM 0.3 · PostgreSQL 16 · bcrypt · `node:crypto` · Jest 30 · supertest · `@porto/contracts`

**Spec:** `docs/superpowers/specs/2026-08-25-canal-admin-na-api-design.md`

## Global Constraints

- **TDD**: o teste que falha vem antes da implementação, em todos os passos.
- **Toda rota HTTP sob `/v1`**, e o canal vai no path: `@Controller('admin/affiliates')`.
- **O identificador exposto é `public_id`** — o `id` serial não aparece em rota, resposta, log nem claim de JWT.
- **Nenhuma rota sem guard por omissão**; rota pública exige `@Public()` explícito.
- **CPF e chave PIX nunca vão para log.** Listagem devolve `maskCpf`; CPF completo só no detalhe.
- **Senha com bcrypt, custo 10. Token de uso único só como hash SHA-256**; em claro, apenas no e-mail.
- **Dependência externa fica na borda**: o núcleo declara o contrato, infra implementa, só o wiring importa a biblioteca. Vale para relógio e gerador de id.
- **`function` declaration** para funções nomeadas; **sem `any`**, **sem `console.log`**, variável não usada só com prefixo `_`.
- **Idioma:** identificador, arquivo, descrição de teste e mensagem de commit em inglês; string que uma pessoa lê e comentário de código em pt-BR.
- **Commits**: Conventional Commits com escopo do pacote (`feat(api):`, `chore:`), mensagem inteira em inglês.
- **Quality gate**: `npm run lint && npm run type-check && npm run test`; mexeu em rota ou DTO, `npm run test:e2e --workspace apps/api` também.

---

### Task 1: Ports de autenticação e adapters da borda

**Files:**
- Create: `apps/api/src/domain/auth/password-hasher.ts`, `apps/api/src/domain/auth/access-token.ts`, `apps/api/src/domain/auth/token-generator.ts`, `apps/api/src/domain/shared/clock.ts`, `apps/api/src/domain/notifications/link-builder.ts`
- Create: `apps/api/src/infra/services/auth/bcrypt-password-hasher.ts`, `apps/api/src/infra/services/auth/jwt-access-token.service.ts` (+ `.spec.ts`), `apps/api/src/infra/services/auth/crypto-token-generator.ts` (+ `.spec.ts`), `apps/api/src/infra/services/auth/auth-services.module.ts`
- Create: `apps/api/src/infra/services/clock/system-clock.ts`, `apps/api/src/infra/services/clock/clock.module.ts`
- Create: `apps/api/src/infra/services/links/app-link-builder.ts` (+ `.spec.ts`)
- Create: `apps/api/src/testing/mocks/services/password-hasher.mock.ts`, `access-token-issuer.mock.ts`, `access-token-verifier.mock.ts`, `token-generator.mock.ts`, `clock.mock.ts`, `link-builder.mock.ts`
- Modify: `apps/api/src/infra/config/env.validation.ts`, `apps/api/src/infra/config/environment-variable.service.ts`, `apps/api/.env.example`, `.github/workflows/ci.yml`, `apps/api/src/infra/services/email/mail.module.ts`, `apps/api/src/app.module.ts`, `apps/api/package.json`

**Interfaces:**
- Produces: `PASSWORD_HASHER`/`PasswordHasher.compare(plain, hash): Promise<boolean>`; `ACCESS_TOKEN_ISSUER`/`AccessTokenIssuer.issue(claims: AccessTokenClaims): Promise<string>`; `ACCESS_TOKEN_VERIFIER`/`AccessTokenVerifier.verify(token: string): Promise<AccessTokenClaims | null>`; `TOKEN_GENERATOR`/`TokenGenerator.generate(): GeneratedToken` (`{ token: string; hash: string }`); `CLOCK`/`Clock.now(): Date`; `LINK_BUILDER`/`LinkBuilder.setPasswordLink(token: string): string`; `AccessTokenClaims` = `{ sub: string; aud: AuthAudienceEnum; role: UserRoleEnum | null; name: string }`.

- [ ] **Step 1: Instalar o `@nestjs/jwt`**

```bash
npm install @nestjs/jwt --workspace apps/api
```

- [ ] **Step 2: Escrever os ports do domínio**

`src/domain/auth/access-token.ts`:

```ts
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';

export const ACCESS_TOKEN_ISSUER = createToken<AccessTokenIssuer>('ACCESS_TOKEN_ISSUER');
export const ACCESS_TOKEN_VERIFIER = createToken<AccessTokenVerifier>('ACCESS_TOKEN_VERIFIER');

/** O que o token carrega. `sub` é o `public_id`: o id serial não sai da API. */
export interface AccessTokenClaims {
  sub: string;
  aud: AuthAudienceEnum;
  role: UserRoleEnum | null;
  name: string;
}

export interface AccessTokenIssuer {
  issue(claims: AccessTokenClaims): Promise<string>;
}

/**
 * Emitir e verificar são dois contratos com uma implementação só: quem verifica
 * é o guard, e guard que recebe a capacidade de emitir token pode assinar um.
 */
export interface AccessTokenVerifier {
  /** `null` quando o token é ausente, expirado, adulterado ou sem os claims. */
  verify(token: string): Promise<AccessTokenClaims | null>;
}
```

`src/domain/auth/password-hasher.ts`:

```ts
import { createToken } from '@Domain/shared/token';

export const PASSWORD_HASHER = createToken<PasswordHasher>('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
```

`src/domain/auth/token-generator.ts`:

```ts
import { createToken } from '@Domain/shared/token';

export const TOKEN_GENERATOR = createToken<TokenGenerator>('TOKEN_GENERATOR');

/** O valor em claro só existe no e-mail; o banco guarda o hash. */
export interface GeneratedToken {
  token: string;
  hash: string;
}

export interface TokenGenerator {
  generate(): GeneratedToken;
}
```

`src/domain/shared/clock.ts`:

```ts
import { createToken } from '@Domain/shared/token';

export const CLOCK = createToken<Clock>('CLOCK');

/**
 * O relógio é dependência externa como qualquer outra: `approvedAt` e o
 * vencimento do token são decisão de regra, e `new Date()` dentro do use case
 * torna a asserção impossível sem congelar o relógio global do Jest.
 */
export interface Clock {
  now(): Date;
}
```

`src/domain/notifications/link-builder.ts`:

```ts
import { createToken } from '@Domain/shared/token';

export const LINK_BUILDER = createToken<LinkBuilder>('LINK_BUILDER');

/** Onde o portal do afiliado mora é configuração; o use case só quer o link. */
export interface LinkBuilder {
  setPasswordLink(token: string): string;
}
```

- [ ] **Step 3: Escrever os testes dos adapters (falhando)**

`src/infra/services/auth/crypto-token-generator.spec.ts`:

```ts
import { createHash } from 'node:crypto';
import { CryptoTokenGenerator } from './crypto-token-generator';

describe('CryptoTokenGenerator', () => {
  const generator = new CryptoTokenGenerator();

  it('hashes the token with sha-256', () => {
    const { token, hash } = generator.generate();

    expect(hash).toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generator.generate().token));

    expect(tokens.size).toBe(50);
  });
});
```

`src/infra/services/auth/jwt-access-token.service.spec.ts`:

```ts
import { JwtService } from '@nestjs/jwt';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { JwtAccessTokenService } from './jwt-access-token.service';

describe('JwtAccessTokenService', () => {
  const jwtService = new JwtService({ secret: 'a-secret-with-at-least-32-characters!!' });
  const service = new JwtAccessTokenService(jwtService);

  const claims = {
    sub: '00000000-0000-4000-8000-000000000001',
    aud: AuthAudienceEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    name: 'Analista Porto',
  };

  it('verifies the claims it issued', async () => {
    const token = await service.issue(claims);

    await expect(service.verify(token)).resolves.toEqual(expect.objectContaining(claims));
  });

  it('answers null for a token signed with another secret', async () => {
    const foreign = new JwtService({ secret: 'another-secret-with-32-characters!!!!' });

    await expect(service.verify(await foreign.signAsync(claims))).resolves.toBeNull();
  });

  it('answers null for an empty token', async () => {
    await expect(service.verify('')).resolves.toBeNull();
  });
});
```

`src/infra/services/links/app-link-builder.spec.ts`:

```ts
import { AppLinkBuilder } from './app-link-builder';

describe('AppLinkBuilder', () => {
  it('points the set-password link at the affiliate portal', () => {
    const builder = new AppLinkBuilder({ appBaseUrl: 'https://afiliados.porto.example' } as never);

    expect(builder.setPasswordLink('abc123')).toBe(
      'https://afiliados.porto.example/definir-senha?token=abc123',
    );
  });

  it('does not double the slash when the base url ends with one', () => {
    const builder = new AppLinkBuilder({ appBaseUrl: 'https://afiliados.porto.example/' } as never);

    expect(builder.setPasswordLink('abc123')).toBe(
      'https://afiliados.porto.example/definir-senha?token=abc123',
    );
  });
});
```

- [ ] **Step 4: Rodar e ver os três specs falharem**

Run: `npm run test --workspace apps/api -- crypto-token-generator jwt-access-token app-link-builder`
Expected: FAIL com "Cannot find module".

- [ ] **Step 5: Implementar os adapters**

`crypto-token-generator.ts` usa `randomBytes(32).toString('hex')` e `createHash('sha256')`.
`bcrypt-password-hasher.ts` usa `bcrypt.hash(plain, 10)` e `bcrypt.compare`.
`jwt-access-token.service.ts`:

```ts
@Injectable()
export class JwtAccessTokenService implements AccessTokenIssuer, AccessTokenVerifier {
  constructor(private readonly jwtService: JwtService) {}

  issue(claims: AccessTokenClaims): Promise<string> {
    return this.jwtService.signAsync(claims);
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenClaims>(token);
      return payload.sub && payload.aud ? payload : null;
    } catch {
      // Assinatura inválida e token expirado são a mesma resposta para quem
      // chama: quem decide o status é o guard.
      return null;
    }
  }
}
```

`app-link-builder.ts` recebe `EnvironmentVariableService` e monta
`` `${appBaseUrl.replace(/\/$/, '')}/definir-senha?token=${encodeURIComponent(token)}` ``.
`system-clock.ts` é `@Injectable()` com `now(): Date { return new Date(); }`.

- [ ] **Step 6: Rodar os specs e ver passar**

Run: `npm run test --workspace apps/api -- crypto-token-generator jwt-access-token app-link-builder`
Expected: PASS.

- [ ] **Step 7: Registrar a variável de ambiente nos quatro lugares**

`env.validation.ts`: `JWT_EXPIRES_IN_SECONDS: Joi.number().default(28800),`
`environment-variable.service.ts`:

```ts
  /** Casado com o cookie de sessão do Next: token que morre antes vira 401 numa tela logada. */
  get jwtExpiresInSeconds(): number {
    return Number(this.configService.get('JWT_EXPIRES_IN_SECONDS') ?? 28800);
  }
```

`.env.example`: `JWT_EXPIRES_IN_SECONDS=28800` logo abaixo de `JWT_SECRET`.
`.github/workflows/ci.yml`, bloco `env:`: `JWT_EXPIRES_IN_SECONDS: 28800`.

- [ ] **Step 8: Escrever os módulos de wiring**

`auth-services.module.ts` (`@Global()`, no estilo do `MailModule`): importa
`JwtModule.registerAsync` com `secret: env.jwtSecret` e `signOptions: { expiresIn: env.jwtExpiresIn }`;
provê `PASSWORD_HASHER → BcryptPasswordHasher`, `ACCESS_TOKEN_ISSUER → JwtAccessTokenService`,
`ACCESS_TOKEN_VERIFIER → JwtAccessTokenService` (o mesmo provider, uma instância só via
`useExisting`) e `TOKEN_GENERATOR → CryptoTokenGenerator`; exporta os quatro tokens.
`clock.module.ts` (`@Global()`) provê e exporta `CLOCK → SystemClock`.
`mail.module.ts` ganha `{ provide: LINK_BUILDER, useClass: AppLinkBuilder }` nos `providers` e
`LINK_BUILDER` nos `exports` — o link é o que a gente manda para as pessoas, e o módulo já é disso.
`app.module.ts` importa `AuthServicesModule` e `ClockModule`.

- [ ] **Step 9: Escrever os mocks de teste**

Um arquivo por port em `src/testing/mocks/services/`, no formato do `mailer.mock.ts`:

```ts
export const clockMock = (now = new Date('2026-08-25T12:00:00Z')): jest.Mocked<Clock> => ({
  now: jest.fn().mockReturnValue(now),
});
```

`tokenGeneratorMock` devolve `{ token: 'plain-token', hash: 'hashed-token' }`;
`passwordHasherMock` tem `hash` e `compare` (`compare` resolvendo `true`);
`accessTokenIssuerMock.issue` resolve `'signed.access.token'`;
`accessTokenVerifierMock.verify` resolve `null` por padrão;
`linkBuilderMock.setPasswordLink` devolve `'https://afiliados.porto.example/definir-senha?token=plain-token'`.

- [ ] **Step 10: Subir a aplicação e conferir que o container resolve**

Run: `npm run lint && npm run type-check --workspace apps/api && npm run test --workspace apps/api`
Expected: tudo verde.

- [ ] **Step 11: Commit**

```bash
git add apps/api package-lock.json package.json .github/workflows/ci.yml
git commit -m "feat(api): declare the auth ports and their border adapters"
```

---

### Task 2: Guards — negar por omissão e conferir a audiência

**Files:**
- Create: `apps/api/src/http/shared/authenticated-request.ts`, `apps/api/src/http/shared/decorators/public.decorator.ts`, `roles.decorator.ts`, `actor.decorator.ts`
- Create: `apps/api/src/http/shared/guards/authenticated.guard.ts` (+ `.spec.ts`), `admin.guard.ts` (+ `.spec.ts`)
- Modify: `apps/api/src/http/health/health.controller.ts`, `apps/api/src/http/affiliate/affiliates/affiliates.controller.ts`, `apps/api/src/app.module.ts`
- Test: `apps/api/test/health.e2e-spec.ts` (asserção nova)

**Interfaces:**
- Consumes: `ACCESS_TOKEN_VERIFIER`, `AccessTokenClaims` (Task 1).
- Produces: `@Public()`; `@Roles(...roles: UserRoleEnum[])`; `@Actor()` param decorator devolvendo `Actor` = `{ publicId: string; name: string; role: UserRoleEnum | null }`; `AuthenticatedRequest` com `auth?: AccessTokenClaims` e `actor?: Actor`; classes `AuthenticatedGuard` e `AdminGuard`.

- [ ] **Step 1: Escrever o spec do `AuthenticatedGuard` (falhando)**

`src/http/shared/guards/authenticated.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { accessTokenVerifierMock } from '@Testing/mocks/services/access-token-verifier.mock';
import { AuthenticatedGuard } from './authenticated.guard';

function contextWith(authorization?: string): never {
  const request = { headers: authorization ? { authorization } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as never;
}

describe('AuthenticatedGuard', () => {
  const claims = {
    sub: '00000000-0000-4000-8000-000000000001',
    aud: AuthAudienceEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    name: 'Analista Porto',
  };

  it('rejects a request without an authorization header', async () => {
    const guard = new AuthenticatedGuard(new Reflector(), accessTokenVerifierMock());

    await expect(guard.canActivate(contextWith())).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token the verifier does not accept', async () => {
    const guard = new AuthenticatedGuard(new Reflector(), accessTokenVerifierMock());

    await expect(guard.canActivate(contextWith('Bearer nope'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows a public route without any token', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const guard = new AuthenticatedGuard(reflector, accessTokenVerifierMock());

    await expect(guard.canActivate(contextWith())).resolves.toBe(true);
  });

  it('publishes the verified claims on the request', async () => {
    const verifier = accessTokenVerifierMock();
    verifier.verify.mockResolvedValue(claims);
    const guard = new AuthenticatedGuard(new Reflector(), verifier);
    const context = contextWith('Bearer good.token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('good.token');
    expect(context.switchToHttp().getRequest().auth).toEqual(claims);
  });
});
```

- [ ] **Step 2: Escrever o spec do `AdminGuard` (falhando)**

`src/http/shared/guards/admin.guard.spec.ts` cobre quatro casos: request sem `auth` → `ForbiddenException`;
`aud` igual a `AuthAudienceEnum.AFFILIATE` → `ForbiddenException`; `@Roles(PORTO_ADMIN)` com token
`PORTO_ANALYST` → `ForbiddenException`; token de admin sem `@Roles` → `true` e `request.actor`
igual a `{ publicId: claims.sub, name: claims.name, role: claims.role }`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm run test --workspace apps/api -- guards`
Expected: FAIL com "Cannot find module".

- [ ] **Step 4: Implementar decorators, tipos e guards**

`public.decorator.ts`: `export const IS_PUBLIC = 'isPublic';` e
`export function Public(): CustomDecorator { return SetMetadata(IS_PUBLIC, true); }`.
`roles.decorator.ts`: `export const ROLES = 'roles';` e `Roles(...roles: UserRoleEnum[])`.
`actor.decorator.ts`:

```ts
export const Actor = createParamDecorator((_data: unknown, context: ExecutionContext): ActorInfo => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

  // O `AdminGuard` publica o ator antes de qualquer handler rodar. Chegar aqui
  // sem ele significa controller sem guard, e isso é erro de programação.
  if (!request.actor) throw new UnauthorizedException('Sessão inválida. Entre novamente.');

  return request.actor;
});
```

`authenticated.guard.ts` conforme o spec, com o helper
`function bearerOf(header?: string): string { return header?.startsWith('Bearer ') ? header.slice(7) : ''; }`.
`admin.guard.ts` confere `aud`, aplica `@Roles` quando declarado e publica `request.actor`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run test --workspace apps/api -- guards`
Expected: PASS.

- [ ] **Step 6: Ligar o guard global e marcar as rotas públicas**

`app.module.ts` ganha `{ provide: APP_GUARD, useClass: AuthenticatedGuard }` nos `providers`.
`HealthController.check` e `AffiliatesController.create` ganham `@Public()`.

- [ ] **Step 7: Provar no e2e que a negação por omissão está de pé**

Em `test/health.e2e-spec.ts`, acrescentar:

```ts
  it('answers 401 on a route that declares no guard exception', async () => {
    await request(app.getHttpServer()).get('/v1/admin/affiliates').expect(401);
  });
```

Run: `npm run db:up && npm run typeorm:run --workspace apps/api && npm run test:e2e --workspace apps/api`
Expected: o health continua 200, o cadastro público continua 201, e a rota inexistente do
painel responde 401 — não 404, porque o guard corre antes do roteamento do controller.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): deny unauthenticated requests by default"
```

---

### Task 3: `POST /v1/admin/auth/login`

**Files:**
- Create: `apps/api/src/domain/auth/auth.errors.ts`
- Create: `apps/api/src/application/auth/admin-login.use-case.ts` (+ `.spec.ts`)
- Create: `apps/api/src/http/admin/auth/admin-auth.controller.ts`, `dtos/admin-login.request.dto.ts`, `dtos/admin-login.response.dto.ts`
- Create: `apps/api/test/admin-auth.e2e-spec.ts`
- Modify: `apps/api/src/infra/di/use-cases.module.ts`, `apps/api/src/http/admin/admin.module.ts`

**Interfaces:**
- Consumes: `PASSWORD_HASHER`, `ACCESS_TOKEN_ISSUER`, `CLOCK` (Task 1), `USER_REPOSITORY`.
- Produces: `AdminLoginUseCase.execute({ email, password }): Promise<AdminLoginOutput>` com
  `AdminLoginOutput = { accessToken: string; user: { publicId, name, email, role, shouldChangePassword } }`;
  erros `InvalidCredentialsError` (401/`AUTH-001`), `PasswordNotSetError` (401/`AUTH-004`),
  `AccountInactiveError` (401/`AUTH-005`), `UnknownOperatorError` (401/`AUTH-001`).

- [ ] **Step 1: Escrever o spec do use case (falhando)**

`src/application/auth/admin-login.use-case.spec.ts`:

```ts
import { AuthAudienceEnum, UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import {
  AccountInactiveError,
  InvalidCredentialsError,
  PasswordNotSetError,
} from '@Domain/auth/auth.errors';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { accessTokenIssuerMock } from '@Testing/mocks/services/access-token-issuer.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { passwordHasherMock } from '@Testing/mocks/services/password-hasher.mock';
import { AdminLoginUseCase } from './admin-login.use-case';

describe('AdminLoginUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordHasher: ReturnType<typeof passwordHasherMock>;
  let accessTokenIssuer: ReturnType<typeof accessTokenIssuerMock>;
  let clock: ReturnType<typeof clockMock>;
  let useCase: AdminLoginUseCase;

  const credentials = { email: 'analista@porto.example', password: 'MudarAgora!2026' };

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordHasher = passwordHasherMock();
    accessTokenIssuer = accessTokenIssuerMock();
    clock = clockMock();
    useCase = new AdminLoginUseCase(userRepository, passwordHasher, accessTokenIssuer, clock);
  });

  it('issues a token for an admin with the audience of the panel', async () => {
    const operator = buildAdminUser({ name: 'Analista Porto', email: credentials.email });
    userRepository.findByEmail.mockResolvedValue({ ...operator, affiliate: null });

    const result = await useCase.execute(credentials);

    expect(accessTokenIssuer.issue).toHaveBeenCalledWith({
      sub: operator.publicId,
      aud: AuthAudienceEnum.ADMIN,
      role: UserRoleEnum.PORTO_ANALYST,
      name: 'Analista Porto',
    });
    expect(result).toEqual({
      accessToken: 'signed.access.token',
      user: {
        publicId: operator.publicId,
        name: 'Analista Porto',
        email: credentials.email,
        role: UserRoleEnum.PORTO_ANALYST,
        shouldChangePassword: false,
      },
    });
  });

  it('records the login instant', async () => {
    const operator = buildAdminUser();
    userRepository.findByEmail.mockResolvedValue({ ...operator, affiliate: null });

    await useCase.execute(credentials);

    expect(userRepository.save).toHaveBeenCalledWith({
      id: operator.id,
      lastLoginAt: new Date('2026-08-25T12:00:00Z'),
    });
  });

  it('rejects an unknown email', async () => {
    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('answers the same error for an affiliate trying the panel', async () => {
    const affiliateUser = buildUser({ type: UserTypeEnum.AFFILIATE, password: '$2b$10$hashed' });
    userRepository.findByEmail.mockResolvedValue({ ...affiliateUser, affiliate: null });

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects a wrong password', async () => {
    userRepository.findByEmail.mockResolvedValue({ ...buildAdminUser(), affiliate: null });
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(credentials)).rejects.toThrow(InvalidCredentialsError);
  });

  it('reports an operator without a password', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...buildAdminUser({ password: null }),
      affiliate: null,
    });

    await expect(useCase.execute(credentials)).rejects.toThrow(PasswordNotSetError);
  });

  it('reports an inactive operator only after the password checks out', async () => {
    userRepository.findByEmail.mockResolvedValue({
      ...buildAdminUser({ isActive: false }),
      affiliate: null,
    });

    await expect(useCase.execute(credentials)).rejects.toThrow(AccountInactiveError);
    expect(passwordHasher.compare).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test --workspace apps/api -- admin-login`
Expected: FAIL com "Cannot find module '@Domain/auth/auth.errors'".

- [ ] **Step 3: Escrever os erros e o use case**

`auth.errors.ts` traz `InvalidCredentialsError` (`UNAUTHORIZED`, `AuthErrorCodeEnum.INVALID_CREDENTIALS`,
"E-mail ou senha inválidos."), `PasswordNotSetError` (`AUTH-004`, "Sua senha ainda não foi definida.
Use o link enviado por e-mail."), `AccountInactiveError` (`AUTH-005`, "Sua conta está inativa. Fale
com o administrador.") e `UnknownOperatorError` (`AUTH-001`, "Sessão inválida. Entre novamente.").

O use case checa nesta ordem — **e a ordem é a decisão**: usuário ausente ou que não é operador
devolve `InvalidCredentialsError` (distinguir transformaria o login em oráculo de e-mails
cadastrados); senha nula devolve `PasswordNotSetError`; senha errada devolve
`InvalidCredentialsError`; e só depois de a senha conferir é que a conta inativa se revela.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test --workspace apps/api -- admin-login`
Expected: PASS.

- [ ] **Step 5: Escrever a rota, os DTOs e o wiring**

`admin-login.request.dto.ts` com `@IsEmail({}, { message: 'Informe um e-mail válido.' })` e
`@IsString()` + `@IsNotEmpty({ message: 'Informe a senha.' })`, ambos com `@ApiProperty`.
`admin-login.response.dto.ts` com `AdminLoginUserDto` aninhado e
`export class AdminLoginResponseDto implements AdminLoginResponse`.
`admin-auth.controller.ts`:

```ts
@ApiTags('admin/auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminLoginUseCase: AdminLoginUseCase) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminLoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credencial inválida, senha não definida ou conta inativa' })
  login(@Body() body: AdminLoginRequestDto): Promise<AdminLoginResponseDto> {
    return this.adminLoginUseCase.execute(body);
  }
}
```

`use-cases.module.ts` ganha
`provideUseCase(AdminLoginUseCase, [USER_REPOSITORY, PASSWORD_HASHER, ACCESS_TOKEN_ISSUER, CLOCK])`.
`admin.module.ts` passa a importar `UseCasesModule` (não `RepositoriesModule`) e declarar o controller.

- [ ] **Step 6: Escrever o e2e**

`test/admin-auth.e2e-spec.ts`, no molde do `affiliate-registration.e2e-spec.ts`. No `beforeEach`,
insere o operador com hash real:

```ts
    const password = await bcrypt.hash('MudarAgora!2026', 10);
    await dataSource.query(
      `INSERT INTO users (name, email, password, password_set_at, should_change_password, type, role)
       VALUES ($1, $2, $3, now(), false, 'ADMIN', 'PORTO_ANALYST')`,
      ['Analista Porto', 'analista@porto.example', password],
    );
```

Casos: 200 com `accessToken` e `user`; 401 com `code` `AUTH-001` na senha errada; 401 no e-mail
desconhecido; `last_login_at` preenchido depois do login; 400 quando falta a senha.

- [ ] **Step 7: Rodar o e2e**

Run: `npm run test:e2e --workspace apps/api`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): sign the panel operator in"
```

---

### Task 4: `AffiliateRepository.search()`

**Files:**
- Modify: `apps/api/src/domain/affiliates/affiliate.repository.ts`, `apps/api/src/infra/database/typeorm/repositories/affiliate.typeorm-repository.ts`, `apps/api/src/testing/mocks/repositories/affiliate.repository.mock.ts`
- Test: `apps/api/test/repositories/affiliate.repository.e2e-spec.ts`

**Interfaces:**
- Produces: `AffiliateSortBy = 'createdAt' | 'name'`; `AffiliateSortOrder = 'asc' | 'desc'`;
  `SearchAffiliatesInput = { page: number; limit: number; status: AffiliateStatusEnum | null; search: string | null; sortBy: AffiliateSortBy; sortOrder: AffiliateSortOrder }`;
  `SearchAffiliatesResult = { rows: AffiliateWithUser[]; total: number }`;
  `AffiliateRepository.search(input: SearchAffiliatesInput): Promise<SearchAffiliatesResult>`.

- [ ] **Step 1: Escrever o teste de integração do adapter (falhando)**

Em `test/repositories/affiliate.repository.e2e-spec.ts`, um `describe('search')` com cinco casos,
cada um inserindo afiliados pelo `createWithUser` existente:

```ts
    it('filters by status', async () => {
      const { total, rows } = await repository.search({
        page: 1,
        limit: 10,
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        search: null,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(total).toBe(2);
      expect(rows.every((row) => row.status === AffiliateStatusEnum.PENDING_APPROVAL)).toBe(true);
    });
```

Mais: busca por trecho do nome, busca por e-mail, busca por CPF em dígitos, ordenação por
`name` ascendente, e paginação (`page: 2, limit: 1` devolve o segundo e mantém o `total`).
Todo caso confere `rows[0].user.name` — é a relação que o tipo promete.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:e2e --workspace apps/api -- affiliate.repository`
Expected: FAIL com "repository.search is not a function".

- [ ] **Step 3: Declarar o contrato e implementar o adapter**

No contrato, `sortBy` é união fechada, nunca `string` — o adapter interpola o nome da coluna no
`ORDER BY`, e uma `string` livre atravessando três camadas até virar SQL abre injeção.

```ts
  async search(input: SearchAffiliatesInput): Promise<SearchAffiliatesResult> {
    const query = this.repository
      .createQueryBuilder('affiliate')
      .innerJoinAndSelect('affiliate.user', 'user');

    if (input.status) query.andWhere('affiliate.status = :status', { status: input.status });

    if (input.search) {
      const digits = sanitizeCpf(input.search);

      // Entrada só de dígitos e pontuação procura CPF; o resto procura pessoa.
      if (digits.length > 0 && /^[\d.\s-]+$/.test(input.search)) {
        query.andWhere('affiliate.cpf LIKE :cpf', { cpf: `${digits}%` });
      } else {
        query.andWhere('(user.name ILIKE :term OR user.email ILIKE :term)', {
          term: `%${input.search}%`,
        });
      }
    }

    const [rows, total] = await query
      .orderBy(input.sortBy === 'name' ? 'user.name' : 'affiliate.created_at', input.sortOrder === 'asc' ? 'ASC' : 'DESC')
      // O `id` desempata cadastros gravados no mesmo instante — sem ele a
      // paginação repete e some com linhas entre uma página e outra.
      .addOrderBy('affiliate.id', 'DESC')
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .getManyAndCount();

    return { rows, total };
  }
```

O mock em `src/testing/mocks/repositories/affiliate.repository.mock.ts` ganha
`search: jest.fn().mockResolvedValue({ rows: [], total: 0 })`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:e2e --workspace apps/api -- affiliate.repository`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): search affiliates for the review queue"
```

---

### Task 5: Fila, detalhe e histórico

**Files:**
- Create: `apps/api/src/application/affiliates/list-affiliates.use-case.ts` (+ `.spec.ts`), `get-affiliate.use-case.ts` (+ `.spec.ts`), `list-affiliate-status-history.use-case.ts` (+ `.spec.ts`)
- Create: `apps/api/src/http/admin/affiliates/admin-affiliates.controller.ts`, `dtos/list-affiliates.query.dto.ts`, `dtos/affiliate-list-item.response.dto.ts`, `dtos/affiliate-detail.response.dto.ts`, `dtos/affiliate-status-history.response.dto.ts`
- Create: `apps/api/test/admin-affiliates.e2e-spec.ts`
- Modify: `apps/api/src/domain/affiliates/affiliates.errors.ts`, `apps/api/src/infra/di/use-cases.module.ts`, `apps/api/src/http/admin/admin.module.ts`

**Interfaces:**
- Consumes: `AffiliateRepository.search` (Task 4), `AdminGuard`/`@Actor()` (Task 2).
- Produces: `ListAffiliatesUseCase.execute(input: ListAffiliatesInput): Promise<ListAffiliatesOutput>`;
  `GetAffiliateUseCase.execute(publicId: string): Promise<AffiliateDetailOutput>`;
  `ListAffiliateStatusHistoryUseCase.execute(publicId: string): Promise<AffiliateStatusHistoryOutput[]>`;
  `AffiliateNotFoundError` (`NOT_FOUND`, sem `code`).

- [ ] **Step 1: Escrever os três specs (falhando)**

`list-affiliates.use-case.spec.ts` prova as duas coisas que só ele decide:

```ts
  it('masks the cpf and never returns it whole', async () => {
    affiliateRepository.search.mockResolvedValue({
      rows: [buildAffiliate({ cpf: '52998224725' })],
      total: 1,
    });

    const result = await useCase.execute(input);

    expect(result.data[0].maskedCpf).toBe('***.***.247-25');
    expect(JSON.stringify(result)).not.toContain('52998224725');
  });

  it('passes the criteria through to the repository', async () => {
    await useCase.execute({ ...input, page: 3, status: AffiliateStatusEnum.APPROVED });

    expect(affiliateRepository.search).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 10, status: AffiliateStatusEnum.APPROVED }),
    );
  });
```

`get-affiliate.use-case.spec.ts`: devolve CPF completo, `approvedByName` a partir da relação
`approvedBy`, e lança `AffiliateNotFoundError` quando o `publicId` não existe.
`list-affiliate-status-history.use-case.spec.ts`: resolve o afiliado pelo `publicId`, chama
`listByAffiliateId` com o `id` interno, mapeia `actor?.name ?? null`, e lança
`AffiliateNotFoundError` quando o afiliado não existe.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test --workspace apps/api -- affiliates.use-case`
Expected: FAIL com "Cannot find module".

- [ ] **Step 3: Implementar os três use cases**

`AffiliateNotFoundError` entra em `affiliates.errors.ts` com `kind = NOT_FOUND` e a mensagem
"Afiliado não encontrado." — sem `code`, porque o painel não escolhe mensagem por ele.

A saída da lista carrega `maskedCpf` e **não** carrega `cpf`: mascarar na camada HTTP deixaria o
CPF completo dentro do objeto que a application entrega, e um log de depuração no controller
vazaria a listagem inteira. `Date` sai como `Date`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test --workspace apps/api -- affiliates.use-case`
Expected: PASS.

- [ ] **Step 5: Escrever os DTOs e o controller**

`list-affiliates.query.dto.ts`:

```ts
export class ListAffiliatesQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 10;

  @ApiPropertyOptional({ enum: AffiliateStatusEnum })
  @IsEnum(AffiliateStatusEnum)
  @IsOptional()
  status?: AffiliateStatusEnum;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'name'], default: 'createdAt' })
  @IsIn(['createdAt', 'name'])
  @IsOptional()
  sortBy: AffiliateSortBy = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder: AffiliateSortOrder = 'desc';
}
```

Os DTOs de resposta implementam os tipos de `@porto/contracts` e trazem um `static from(...)`
que serializa `Date` para ISO — é o DTO que formata para o fio.
O controller leva `@UseGuards(AdminGuard)`, `@ApiBearerAuth()` e `@Controller('admin/affiliates')`,
com `@Param('publicId', ParseUUIDPipe)` nas rotas de item.

- [ ] **Step 6: Escrever o e2e da fila**

`test/admin-affiliates.e2e-spec.ts` faz login de verdade no `beforeEach` para obter o token e
cobre: 401 sem header; 200 com a fila paginada; filtro por `status`; busca por nome; CPF
mascarado na lista; CPF completo no detalhe; 404 em `publicId` inexistente; 400 em `publicId`
que não é uuid; histórico com a transição inicial `null → PENDING_APPROVAL`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npm run test:e2e --workspace apps/api`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): serve the affiliate review queue to the panel"
```

---

### Task 6: Aprovar e reprovar

**Files:**
- Create: `apps/api/src/application/affiliates/approve-affiliate.use-case.ts` (+ `.spec.ts`), `reject-affiliate.use-case.ts` (+ `.spec.ts`)
- Create: `apps/api/src/http/admin/affiliates/dtos/reject-affiliate.request.dto.ts`
- Modify: `apps/api/src/domain/affiliates/affiliates.errors.ts`, `apps/api/src/http/admin/affiliates/admin-affiliates.controller.ts`, `apps/api/src/infra/di/use-cases.module.ts`, `apps/api/test/admin-affiliates.e2e-spec.ts`

**Interfaces:**
- Consumes: `TOKEN_GENERATOR`, `CLOCK`, `LINK_BUILDER` (Task 1), `PASSWORD_RESET_TOKEN_REPOSITORY`, `MAILER`, `AffiliateRepository.changeStatus`.
- Produces: `ApproveAffiliateUseCase.execute({ publicId, actorPublicId }): Promise<void>`;
  `RejectAffiliateUseCase.execute({ publicId, actorPublicId, reason }): Promise<void>`;
  `AffiliateAlreadyDecidedError` (`CONFLICT`).

- [ ] **Step 1: Escrever o spec da aprovação (falhando)**

```ts
  it('approves a pending registration and stamps who decided', async () => {
    await useCase.execute({ publicId: affiliate.publicId, actorPublicId: operator.publicId });

    expect(affiliateRepository.changeStatus).toHaveBeenCalledWith({
      affiliateId: affiliate.id,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: operator.id,
      changes: {
        approvedAt: new Date('2026-08-25T12:00:00Z'),
        approvedByUserId: operator.id,
        rejectionReason: null,
      },
    });
  });

  it('refuses a registration that was already decided', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue(
      buildAffiliate({ status: AffiliateStatusEnum.APPROVED }),
    );

    await expect(
      useCase.execute({ publicId: affiliate.publicId, actorPublicId: operator.publicId }),
    ).rejects.toThrow(AffiliateAlreadyDecidedError);
    expect(affiliateRepository.changeStatus).not.toHaveBeenCalled();
  });

  it('stores only the hash of the set-password token, valid for 48 hours', async () => {
    await useCase.execute({ publicId: affiliate.publicId, actorPublicId: operator.publicId });

    expect(passwordResetTokenRepository.invalidateAllFor).toHaveBeenCalledWith(
      affiliate.userId,
      TokenPurposeEnum.SET_PASSWORD,
    );
    expect(passwordResetTokenRepository.create).toHaveBeenCalledWith({
      userId: affiliate.userId,
      tokenHash: 'hashed-token',
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: new Date('2026-08-27T12:00:00Z'),
    });
  });

  it('sends the approval email with the link in the clear', async () => {
    await useCase.execute({ publicId: affiliate.publicId, actorPublicId: operator.publicId });

    expect(mailer.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.REGISTRATION_APPROVED,
      to: affiliate.user.email,
      toName: affiliate.user.name,
      variables: {
        name: affiliate.user.name.split(' ')[0],
        link: 'https://afiliados.porto.example/definir-senha?token=plain-token',
      },
    });
  });
```

Mais: `AffiliateNotFoundError` quando o `publicId` não existe, e `UnknownOperatorError` quando o
token é de um operador que sumiu do banco.

- [ ] **Step 2: Escrever o spec da reprovação (falhando)**

Casos: grava `rejectionReason` e `toStatus: REJECTED` com o `actorUserId`; recusa cadastro já
decidido; envia `REGISTRATION_REJECTED` com `name` e `reason`; **não** cria token nenhum.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm run test --workspace apps/api -- affiliate.use-case`
Expected: FAIL com "Cannot find module".

- [ ] **Step 4: Implementar os dois use cases**

São dois, e não um com `toStatus` no parâmetro: compartilham só a guarda de transição, e um
único use case esconderia a divergência atrás de dois `if`. A guarda é
`if (affiliate.status !== AffiliateStatusEnum.PENDING_APPROVAL) throw new AffiliateAlreadyDecidedError();`
com a mensagem "Este cadastro já foi decidido e não pode ser decidido de novo."

O e-mail sai **depois** da escrita e nunca lança — `Mailer.send` já é assim de propósito, e
`try/catch` em volta dele desfaria essa decisão.

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run test --workspace apps/api -- affiliate.use-case`
Expected: PASS.

- [ ] **Step 6: Escrever as duas rotas**

```ts
  @Post(':publicId/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Cadastro aprovado' })
  @ApiNotFoundResponse({ description: 'Afiliado não encontrado' })
  @ApiConflictResponse({ description: 'Cadastro já decidido' })
  approve(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    return this.approveAffiliateUseCase.execute({ publicId, actorPublicId: actor.publicId });
  }
```

`reject-affiliate.request.dto.ts` espelha o `rejectAffiliateSchema` do contracts:
`@MinLength(10, { message: 'Descreva o motivo com ao menos 10 caracteres' })` e
`@MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres' })`.

- [ ] **Step 7: Ampliar o e2e**

Casos novos em `test/admin-affiliates.e2e-spec.ts`: aprovar devolve 204 e grava
`APPROVED` mais a linha de histórico com o `actor_user_id`; aprovar de novo devolve 409;
reprovar sem motivo devolve 400; reprovar com motivo devolve 204 e grava `rejection_reason`;
aprovar cria uma linha em `password_reset_tokens` com `purpose = 'SET_PASSWORD'`; e o
`mailerMock` recebe `REGISTRATION_APPROVED` com um `link`.

- [ ] **Step 8: Rodar o gate inteiro**

Run: `npm run lint && npm run type-check && npm run test && npm run test:e2e --workspace apps/api`
Expected: tudo verde.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): approve and reject affiliate registrations"
```

---

### Task 7: A web sai do dublê e a documentação acompanha

**Files:**
- Modify: `apps/web/src/shared/http/mocks/mock-api.ts`, `apps/web/src/shared/http/mocks/mock-api.spec.ts`, `apps/web/src/shared/http/mocks/fixtures.ts`, `apps/web/src/shared/http/api-client.ts`
- Modify: `apps/web/.env.example`, `README.md`, `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md`

**Interfaces:**
- Consumes: todas as rotas das Tasks 3, 5 e 6.

- [ ] **Step 1: Ajustar o spec do dublê (falhando)**

Em `mock-api.spec.ts`, trocar os casos de `/admin` por um só:

```ts
  it('lets the admin channel through to the real api', async () => {
    await expect(mockApiFetch('http://api.test/v1/admin/affiliates')).resolves.toBeNull();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test --workspace apps/web -- mock-api`
Expected: FAIL — hoje o dublê responde a fila.

- [ ] **Step 3: Tirar o `/admin` do dublê**

Remover as seis rotas `/admin/*` de `routes`, remover `'/admin'` de `DUBBED`, e apagar das
fixtures o que ficou sem uso. `mockAffiliateAccount` continua saindo de `mockAffiliates[2]` — a
área do afiliado segue dublada. O aviso de `api-client.ts` passa a falar só da área do afiliado.

- [ ] **Step 4: Rodar a suíte da web inteira**

Run: `npm run test --workspace apps/web && npm run type-check --workspace apps/web`
Expected: PASS — nenhuma tela mudou.

- [ ] **Step 5: Conferir o painel de ponta a ponta contra a API**

```bash
npm run db:up
npm run typeorm:run --workspace apps/api
npm run seed --workspace apps/api
npm run dev
```

Entrar em http://localhost:3005/admin/login com `analista@porto.example` / `MudarAgora!2026`,
cadastrar um afiliado em http://localhost:3005/cadastro, aprová-lo na fila e conferir a linha
nova no histórico do detalhe.

- [ ] **Step 6: Atualizar a documentação**

`apps/web/CLAUDE.md`: a seção "O painel roda contra dublê" passa a dizer que o dublê cobre só a
área do afiliado, e que o painel exige API no ar mais `npm run seed`.
`apps/api/CLAUDE.md`: o exemplo "Como uma requisição atravessa" deixa de ser ilustrativo — as
rotas existem; acrescentar as três novas linhas na tabela de canais e a seção de guards.
`README.md`: trocar o parágrafo do dublê pelas credenciais do seed e pelo passo do `typeorm:run`.
`apps/web/.env.example`: o comentário de `API_MOCKING` cita só a área do afiliado.

- [ ] **Step 7: Commit**

```bash
git add apps/web README.md apps/api/CLAUDE.md
git commit -m "feat(web): point the panel at the real admin channel"
```

---

## Self-Review

**Cobertura da spec:** ports e adapters (Task 1) · guards e negação por omissão (Task 2) ·
login com a tabela de erros (Task 3) · `search()` com `sortBy` fechado (Task 4) · fila, detalhe,
histórico e máscara de CPF (Task 5) · decisão, token de 48h e e-mails (Task 6) · desligamento do
dublê e documentação (Task 7). As seis rotas da tabela da spec têm task; a tabela de erros está
coberta pelos specs das Tasks 3 e 6.

**Consistência de tipos:** `AccessTokenClaims` (Task 1) é o que o guard publica em `request.auth`
(Task 2), o que o `AdminLoginUseCase` emite (Task 3) e a origem do `actor.publicId` que as
decisões consomem (Task 6). `SearchAffiliatesInput` (Task 4) é o que `ListAffiliatesUseCase`
repassa (Task 5) e o que o `ListAffiliatesQueryDto` alimenta com os mesmos nomes de campo.
