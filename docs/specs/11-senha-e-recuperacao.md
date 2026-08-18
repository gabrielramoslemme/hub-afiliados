# Spec 11 — Definição e recuperação de senha

**Issue:** SIS-511, SIS-518 · **RF:** RF-32 · **Depende de:** 07, 08

**Entrega:** o afiliado aprovado cria senha pelo link do e-mail; qualquer usuário recupera senha esquecida. Um mecanismo, dois propósitos.

**Files:**
- Create: `apps/api/src/domain/auth/dtos/set-password.request.dto.ts`, `.../forgot-password.request.dto.ts`
- Create: `apps/api/src/modules/shared/auth/password-token.service.ts`
- Create: `apps/api/src/modules/shared/auth/set-password.use-case.ts`, `.../forgot-password.use-case.ts`
- Modify: `apps/api/src/modules/mobile/auth/mobile-auth.controller.ts`, `apps/api/src/modules/shared/auth/auth.module.ts`
- Test: `apps/api/src/modules/shared/auth/set-password.use-case.spec.ts`, `.../forgot-password.use-case.spec.ts`

**Interfaces:**
- Consumes: `PasswordResetTokenRepository` (06), `UserRepository` (05), `TokenHashService`, `PasswordHashService` (07), `MailService` (08), `EnvironmentVariableService` (02).
- Produces:
  - `PasswordTokenService.issue(user: UserEntity, purpose: TokenPurposeEnum): Promise<string>` — devolve o token em claro para montar o link. Usado também pela Spec 15 na aprovação.
  - `PasswordTokenService.buildLink(token: string, purpose: TokenPurposeEnum, audience: 'app' | 'panel'): string`.
  - `SetPasswordUseCase.execute(dto: SetPasswordRequestDto): Promise<void>`.
  - `ForgotPasswordUseCase.execute(dto: ForgotPasswordRequestDto): Promise<void>` — sempre resolve.

---

- [ ] **Step 1: Escrever os DTOs**

`apps/api/src/domain/auth/dtos/set-password.request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class SetPasswordRequestDto {
  @ApiProperty({ description: 'Token recebido por e-mail' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'SenhaSegura!2026', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha precisa ter ao menos 8 caracteres' })
  @Matches(/[A-Za-z]/, { message: 'A senha precisa ter ao menos uma letra' })
  @Matches(/\d/, { message: 'A senha precisa ter ao menos um número' })
  password: string;
}
```

`apps/api/src/domain/auth/dtos/forgot-password.request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'marina@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email: string;
}
```

- [ ] **Step 2: Escrever o teste de `SetPasswordUseCase` — deve falhar**

`apps/api/src/modules/shared/auth/set-password.use-case.spec.ts`:

```ts
import { TokenPurposeEnum } from '@porto/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { buildUser } from '@Testing/factories/user.factory';
import { SetPasswordUseCase } from './set-password.use-case';

describe('SetPasswordUseCase', () => {
  const input = { token: 'plain-token', password: 'SenhaSegura!2026' };

  const setup = (record: unknown) => {
    const user = buildUser({ id: 7 });
    const tokens = {
      findUsable: jest.fn().mockResolvedValue(record === undefined ? { id: 1, userId: 7, user } : record),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };
    const users = { save: jest.fn().mockResolvedValue(user) };
    const passwordHash = { hash: jest.fn().mockResolvedValue('$2b$10$novo') };
    const tokenHash = { hash: jest.fn().mockReturnValue('hashed-token') };
    const refreshTokens = { revokeAllFor: jest.fn().mockResolvedValue(undefined) };

    return {
      useCase: new SetPasswordUseCase(
        tokens as never, users as never, passwordHash as never,
        tokenHash as never, refreshTokens as never,
      ),
      tokens, users, passwordHash, tokenHash, refreshTokens,
    };
  };

  it('procura o token pelo hash, nunca pelo valor em claro', async () => {
    const { useCase, tokens, tokenHash } = setup(undefined);
    await useCase.execute(input, TokenPurposeEnum.SET_PASSWORD);
    expect(tokenHash.hash).toHaveBeenCalledWith('plain-token');
    expect(tokens.findUsable).toHaveBeenCalledWith('hashed-token', TokenPurposeEnum.SET_PASSWORD);
  });

  it('grava a senha com hash e marca a data de definição', async () => {
    const { useCase, users } = setup(undefined);
    await useCase.execute(input, TokenPurposeEnum.SET_PASSWORD);
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        password: '$2b$10$novo',
        passwordSetAt: expect.any(Date),
        shouldChangePassword: false,
      }),
    );
  });

  it('consome o token para que não sirva duas vezes', async () => {
    const { useCase, tokens } = setup(undefined);
    await useCase.execute(input, TokenPurposeEnum.SET_PASSWORD);
    expect(tokens.markUsed).toHaveBeenCalledWith(1);
  });

  it('revoga as sessões existentes ao trocar a senha', async () => {
    const { useCase, refreshTokens } = setup(undefined);
    await useCase.execute(input, TokenPurposeEnum.SET_PASSWORD);
    expect(refreshTokens.revokeAllFor).toHaveBeenCalledWith(7);
  });

  it('rejeita token inexistente, expirado ou já usado', async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute(input, TokenPurposeEnum.SET_PASSWORD)).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 3: Escrever o teste de `ForgotPasswordUseCase` — deve falhar**

O comportamento crítico aqui é não vazar quais e-mails existem.

`apps/api/src/modules/shared/auth/forgot-password.use-case.spec.ts`:

```ts
import { MailTemplateEnum, TokenPurposeEnum } from '@porto/contracts';
import { buildUser } from '@Testing/factories/user.factory';
import { mailServiceMock } from '@Testing/mocks/services/mail.service.mock';
import { ForgotPasswordUseCase } from './forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  const setup = (user: unknown) => {
    const users = { findByEmail: jest.fn().mockResolvedValue(user) };
    const passwordToken = {
      issue: jest.fn().mockResolvedValue('plain-token'),
      buildLink: jest.fn().mockReturnValue('https://app.example/redefinir?token=plain-token'),
    };
    const mail = mailServiceMock();
    return {
      useCase: new ForgotPasswordUseCase(users as never, passwordToken as never, mail as never),
      passwordToken, mail,
    };
  };

  it('envia o e-mail de recuperação quando a conta existe', async () => {
    const { useCase, mail } = setup(buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' }));
    await useCase.execute({ email: 'marina@email.com' }, 'app');
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: MailTemplateEnum.PASSWORD_RECOVERY,
        to: 'marina@email.com',
        variables: expect.objectContaining({ link: 'https://app.example/redefinir?token=plain-token' }),
      }),
    );
  });

  it('emite token com o propósito de recuperação', async () => {
    const { useCase, passwordToken } = setup(buildUser());
    await useCase.execute({ email: 'marina@email.com' }, 'app');
    expect(passwordToken.issue).toHaveBeenCalledWith(expect.anything(), TokenPurposeEnum.RESET_PASSWORD);
  });

  it('resolve em silêncio quando o e-mail não existe — sem enumeração de conta', async () => {
    const { useCase, mail } = setup(null);
    await expect(useCase.execute({ email: 'ninguem@email.com' }, 'app')).resolves.toBeUndefined();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('resolve em silêncio para conta desativada', async () => {
    const { useCase, mail } = setup(buildUser({ isActive: false }));
    await useCase.execute({ email: 'marina@email.com' }, 'app');
    expect(mail.send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Rodar e confirmar as falhas**

```bash
npm run test --workspace apps/api -- set-password forgot-password
```

Esperado: FAIL nos dois — módulos não encontrados.

- [ ] **Step 5: Implementar o `PasswordTokenService`**

`apps/api/src/modules/shared/auth/password-token.service.ts`:

```ts
import { TokenPurposeEnum } from '@porto/contracts';
import { Injectable } from '@nestjs/common';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';
import { TokenHashService } from '@Infra/services/crypto/token-hash.service';

export type TokenAudience = 'app' | 'panel';

@Injectable()
export class PasswordTokenService {
  constructor(
    private readonly tokens: PasswordResetTokenRepository,
    private readonly tokenHash: TokenHashService,
    private readonly env: EnvironmentVariableService,
  ) {}

  /** Devolve o token em claro — ele só existe aqui e no e-mail. */
  async issue(user: UserEntity, purpose: TokenPurposeEnum): Promise<string> {
    await this.tokens.invalidateAllFor(user.id, purpose);

    const hours =
      purpose === TokenPurposeEnum.SET_PASSWORD
        ? this.env.setPasswordTokenTtlHours
        : this.env.resetPasswordTokenTtlHours;

    const { token, hash } = this.tokenHash.generate();
    await this.tokens.create({
      userId: user.id,
      tokenHash: hash,
      purpose,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    });

    return token;
  }

  buildLink(token: string, purpose: TokenPurposeEnum, audience: TokenAudience): string {
    const base = audience === 'app' ? this.env.appBaseUrl : this.env.panelBaseUrl;
    const path = purpose === TokenPurposeEnum.SET_PASSWORD ? 'definir-senha' : 'redefinir-senha';
    return `${base}/${path}?token=${token}`;
  }
}
```

- [ ] **Step 6: Implementar os dois casos de uso**

`apps/api/src/modules/shared/auth/set-password.use-case.ts`:

```ts
import { TokenPurposeEnum } from '@porto/contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { RefreshTokenRepository } from '@Domain/auth/refresh-token.repository';
import { SetPasswordRequestDto } from '@Domain/auth/dtos/set-password.request.dto';
import { UserRepository } from '@Domain/users/user.repository';
import { PasswordHashService } from '@Infra/services/crypto/password-hash.service';
import { TokenHashService } from '@Infra/services/crypto/token-hash.service';

@Injectable()
export class SetPasswordUseCase {
  constructor(
    private readonly tokens: PasswordResetTokenRepository,
    private readonly users: UserRepository,
    private readonly passwordHash: PasswordHashService,
    private readonly tokenHash: TokenHashService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(dto: SetPasswordRequestDto, purpose: TokenPurposeEnum): Promise<void> {
    const record = await this.tokens.findUsable(this.tokenHash.hash(dto.token), purpose);
    if (!record) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Link inválido ou expirado. Solicite um novo.',
      });
    }

    await this.users.save({
      id: record.userId,
      password: await this.passwordHash.hash(dto.password),
      passwordSetAt: new Date(),
      shouldChangePassword: false,
    });

    await this.tokens.markUsed(record.id);
    // Trocar a senha derruba sessões antigas — inclusive a de quem roubou o token.
    await this.refreshTokens.revokeAllFor(record.userId);
  }
}
```

`apps/api/src/modules/shared/auth/forgot-password.use-case.ts`:

```ts
import { MailTemplateEnum, TokenPurposeEnum } from '@porto/contracts';
import { Injectable } from '@nestjs/common';
import { ForgotPasswordRequestDto } from '@Domain/auth/dtos/forgot-password.request.dto';
import { UserRepository } from '@Domain/users/user.repository';
import { MailService } from '@Infra/services/email/mail.service';
import { PasswordTokenService, TokenAudience } from './password-token.service';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordToken: PasswordTokenService,
    private readonly mail: MailService,
  ) {}

  /**
   * Sempre resolve, exista ou não a conta. Quem pede recuperação não pode
   * descobrir por diferença de resposta quais e-mails estão cadastrados.
   */
  async execute(dto: ForgotPasswordRequestDto, audience: TokenAudience): Promise<void> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) return;

    const token = await this.passwordToken.issue(user, TokenPurposeEnum.RESET_PASSWORD);

    await this.mail.send({
      template: MailTemplateEnum.PASSWORD_RECOVERY,
      to: user.email,
      toName: user.name,
      variables: {
        name: user.name.split(' ')[0],
        link: this.passwordToken.buildLink(token, TokenPurposeEnum.RESET_PASSWORD, audience),
      },
    });
  }
}
```

- [ ] **Step 7: Rodar e confirmar que passam**

```bash
npm run test --workspace apps/api -- set-password forgot-password
```

Esperado: PASS, 9 testes.

- [ ] **Step 8: Expor as rotas no controller mobile**

Acrescente a `MobileAuthController`:

```ts
  @Post('password/set')
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha definida' })
  @ApiUnauthorizedResponse({ description: 'INVALID_TOKEN' })
  setPassword(@Body() dto: SetPasswordRequestDto): Promise<void> {
    return this.setPasswordUseCase.execute(dto, TokenPurposeEnum.SET_PASSWORD);
  }

  @Post('password/forgot')
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Sempre 204, exista ou não a conta' })
  forgotPassword(@Body() dto: ForgotPasswordRequestDto): Promise<void> {
    return this.forgotPasswordUseCase.execute(dto, 'app');
  }

  @Post('password/reset')
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha redefinida' })
  @ApiUnauthorizedResponse({ description: 'INVALID_TOKEN' })
  resetPassword(@Body() dto: SetPasswordRequestDto): Promise<void> {
    return this.setPasswordUseCase.execute(dto, TokenPurposeEnum.RESET_PASSWORD);
  }
```

Injete `SetPasswordUseCase` e `ForgotPasswordUseCase` no construtor e registre os três serviços em `AuthModule` (`providers` e `exports`), pois a Spec 13 e a Spec 15 vão consumi-los.

- [ ] **Step 9: Verificar o fluxo manualmente**

Com `MAIL_PROVIDER=logger`, o link sai no log da aplicação:

```bash
npm run dev --workspace apps/api
curl -X POST localhost:3000/v1/mobile/auth/password/forgot -H 'Content-Type: application/json' -d '{"email":"marina@email.com"}' -i
```

Esperado: `204 No Content`, e o log da API imprimindo `[email simulado] template=PASSWORD_RECOVERY variáveis={"name":"Marina","link":"..."}`. Repita com um e-mail inexistente: também `204`, e nenhum log de e-mail.

- [ ] **Step 10: Commit**

```bash
npm run test --workspace apps/api
git add apps/api
git commit -m "feat(api): add password set and recovery flows with single-use tokens"
```
