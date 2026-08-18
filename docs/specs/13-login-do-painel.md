# Spec 13 — Login do painel e `GET /admin/me`

**Issue:** SIS-518 · **RF:** RF-09, RF-32 · **Depende de:** 07 (e 11 para recuperação de senha)

**Entrega:** operador entra no painel, renova sessão, sai, recupera senha e lê o próprio perfil com a role.

Reaproveita tudo do canal mobile — o que muda é a audiência do token e a checagem de tipo. É o retorno concreto da identidade unificada.

**Files:**
- Create: `apps/api/src/modules/admin/auth/admin-login.use-case.ts`, `apps/api/src/modules/admin/auth/admin-auth.controller.ts`
- Create: `apps/api/src/domain/users/dtos/admin-me.response.dto.ts`
- Modify: `apps/api/src/modules/admin/admin.module.ts`
- Test: `apps/api/src/modules/admin/auth/admin-login.use-case.spec.ts`, `apps/api/test/admin-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `UserRepository` (05), `PasswordHashService` (07), `IssueSessionService` (10), `RefreshSessionUseCase`, `RevokeSessionUseCase` (12), `ForgotPasswordUseCase`, `SetPasswordUseCase` (11).
- Produces: `AdminLoginUseCase.execute(dto: LoginRequestDto): Promise<LoginResponseDto>`; `AdminMeResponseDto`.

---

- [ ] **Step 1: Escrever o DTO de perfil**

`apps/api/src/domain/users/dtos/admin-me.response.dto.ts`:

```ts
import { UserRoleEnum } from '@porto/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class AdminMeResponseDto {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;

  @ApiProperty()
  shouldChangePassword: boolean;
}
```

- [ ] **Step 2: Escrever o teste do login do painel — deve falhar**

`apps/api/src/modules/admin/auth/admin-login.use-case.spec.ts`:

```ts
import { AuthAudienceEnum, AuthErrorCodeEnum, UserRoleEnum } from '@porto/contracts';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { AdminLoginUseCase } from './admin-login.use-case';

describe('AdminLoginUseCase', () => {
  const credentials = { email: 'analista@porto.example', password: 'SenhaSegura!2026' };

  const setup = (user: unknown, passwordMatches = true) => {
    const users = { findByEmail: jest.fn().mockResolvedValue(user), save: jest.fn() };
    const passwordHash = { compare: jest.fn().mockResolvedValue(passwordMatches) };
    const session = {
      issue: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', refreshTokenId: 1 }),
    };
    return {
      useCase: new AdminLoginUseCase(users as never, passwordHash as never, session as never),
      users, session,
    };
  };

  it('devolve tokens e a role do operador', async () => {
    const { useCase } = setup(buildAdminUser({ role: UserRoleEnum.PORTO_ANALYST }));
    const result = await useCase.execute(credentials);
    expect(result.accessToken).toBe('access');
    expect(result.user.role).toBe(UserRoleEnum.PORTO_ANALYST);
  });

  it('emite o token na audiência admin', async () => {
    const { useCase, session } = setup(buildAdminUser());
    await useCase.execute(credentials);
    expect(session.issue).toHaveBeenCalledWith(expect.anything(), AuthAudienceEnum.ADMIN);
  });

  it('sinaliza troca de senha obrigatória no primeiro acesso', async () => {
    const { useCase } = setup(buildAdminUser({ shouldChangePassword: true }));
    const result = await useCase.execute(credentials);
    expect(result.user.shouldChangePassword).toBe(true);
  });

  it('recusa afiliado tentando entrar pelo painel', async () => {
    const affiliateUser = buildUser({ password: '$2b$10$hash' });
    affiliateUser.affiliate = buildAffiliate({ user: affiliateUser });
    const { useCase } = setup(affiliateUser);
    await expect(useCase.execute(credentials)).rejects.toThrow(UnauthorizedException);
    await expect(useCase.execute(credentials)).rejects.toMatchObject({
      response: { code: AuthErrorCodeEnum.INVALID_CREDENTIALS },
    });
  });

  it('recusa senha errada', async () => {
    const { useCase } = setup(buildAdminUser(), false);
    await expect(useCase.execute(credentials)).rejects.toThrow(UnauthorizedException);
  });

  it('recusa e-mail inexistente', async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute(credentials)).rejects.toThrow(UnauthorizedException);
  });

  it('recusa operador desativado', async () => {
    const { useCase } = setup(buildAdminUser({ isActive: false }));
    await expect(useCase.execute(credentials)).rejects.toThrow(ForbiddenException);
  });

  it('atualiza o último acesso', async () => {
    const { useCase, users } = setup(buildAdminUser());
    await useCase.execute(credentials);
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ lastLoginAt: expect.any(Date) }));
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- admin-login
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar o caso de uso**

`apps/api/src/modules/admin/auth/admin-login.use-case.ts`:

```ts
import { AuthAudienceEnum, AuthErrorCodeEnum, UserTypeEnum } from '@porto/contracts';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginRequestDto } from '@Domain/auth/dtos/login.request.dto';
import { LoginResponseDto } from '@Domain/auth/dtos/login.response.dto';
import { UserRepository } from '@Domain/users/user.repository';
import { PasswordHashService } from '@Infra/services/crypto/password-hash.service';
import { IssueSessionService } from '@Modules/shared/auth/issue-session.service';

@Injectable()
export class AdminLoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHash: PasswordHashService,
    private readonly session: IssueSessionService,
  ) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.users.findByEmail(dto.email);

    // Afiliado que tenta o painel recebe exatamente o mesmo erro de e-mail
    // inexistente: o painel não confirma quem é ou não operador.
    if (!user || user.type !== UserTypeEnum.ADMIN || !user.role) {
      throw new UnauthorizedException({
        code: AuthErrorCodeEnum.INVALID_CREDENTIALS,
        message: 'E-mail ou senha inválidos',
      });
    }

    if (!user.isActive) {
      throw new ForbiddenException({
        code: AuthErrorCodeEnum.ACCOUNT_INACTIVE,
        message: 'Conta indisponível. Fale com o administrador.',
      });
    }

    const matches = user.password ? await this.passwordHash.compare(dto.password, user.password) : false;
    if (!matches) {
      throw new UnauthorizedException({
        code: AuthErrorCodeEnum.INVALID_CREDENTIALS,
        message: 'E-mail ou senha inválidos',
      });
    }

    const { accessToken, refreshToken } = await this.session.issue(user, AuthAudienceEnum.ADMIN);
    await this.users.save({ id: user.id, lastLoginAt: new Date() });

    return {
      accessToken,
      refreshToken,
      user: {
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        shouldChangePassword: user.shouldChangePassword,
        role: user.role,
      },
    };
  }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npm run test --workspace apps/api -- admin-login
```

Esperado: PASS, 8 testes.

- [ ] **Step 6: Escrever o controller**

`apps/api/src/modules/admin/auth/admin-auth.controller.ts`:

```ts
import { AuthAudienceEnum, TokenPurposeEnum } from '@porto/contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ForgotPasswordRequestDto } from '@Domain/auth/dtos/forgot-password.request.dto';
import { LoginRequestDto } from '@Domain/auth/dtos/login.request.dto';
import { LoginResponseDto } from '@Domain/auth/dtos/login.response.dto';
import { RefreshTokenRequestDto } from '@Domain/auth/dtos/refresh-token.request.dto';
import { SetPasswordRequestDto } from '@Domain/auth/dtos/set-password.request.dto';
import { AdminMeResponseDto } from '@Domain/users/dtos/admin-me.response.dto';
import { AuthenticatedUser, CurrentUser } from '@Modules/shared/auth/decorators/current-user.decorator';
import { Public } from '@Modules/shared/auth/decorators/public.decorator';
import { AdminGuard } from '@Modules/shared/auth/guards/admin.guard';
import { ForgotPasswordUseCase } from '@Modules/shared/auth/forgot-password.use-case';
import { RefreshSessionUseCase } from '@Modules/shared/auth/refresh-session.use-case';
import { RevokeSessionUseCase } from '@Modules/shared/auth/revoke-session.use-case';
import { SetPasswordUseCase } from '@Modules/shared/auth/set-password.use-case';
import { AdminLoginUseCase } from './admin-login.use-case';

@ApiTags('admin/auth')
@Controller('admin/auth')
@UseGuards(AdminGuard)
export class AdminAuthController {
  constructor(
    private readonly login: AdminLoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly revokeSession: RevokeSessionUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly setPassword: SetPasswordUseCase,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_CREDENTIALS' })
  signIn(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.login.execute(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Novo par de tokens' })
  async refresh(@Body() dto: RefreshTokenRequestDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { accessToken, refreshToken } = await this.refreshSession.execute(dto.refreshToken, AuthAudienceEnum.ADMIN);
    return { accessToken, refreshToken };
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  logout(@Body() dto: RefreshTokenRequestDto): Promise<void> {
    return this.revokeSession.execute(dto.refreshToken);
  }

  @Post('password/forgot')
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Sempre 204, exista ou não a conta' })
  forgot(@Body() dto: ForgotPasswordRequestDto): Promise<void> {
    return this.forgotPassword.execute(dto, 'panel');
  }

  @Post('password/reset')
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  reset(@Body() dto: SetPasswordRequestDto): Promise<void> {
    return this.setPassword.execute(dto, TokenPurposeEnum.RESET_PASSWORD);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: AdminMeResponseDto })
  me(@CurrentUser() current: AuthenticatedUser): AdminMeResponseDto {
    return {
      publicId: current.publicId,
      name: current.name,
      email: current.email,
      role: current.role!,
      shouldChangePassword: false,
    };
  }
}
```

Registre `AdminAuthController` e `AdminLoginUseCase` em `AdminModule`, importando `AuthModule` e `SharedModule`.

- [ ] **Step 7: Escrever o e2e do canal admin**

`apps/api/test/admin-auth.e2e-spec.ts` — com o seed rodado no `beforeAll`:

```ts
  const operator = { email: 'analista@porto.example', password: 'MudarAgora!2026' };

  it('autentica o operador e devolve a role', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/admin/auth/login').send(operator).expect(200);
    expect(response.body.user.role).toBe('PORTO_ANALYST');
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('recusa o token do painel no canal mobile', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/v1/admin/auth/login').send(operator).expect(200);
    const response = await request(app.getHttpServer())
      .get('/v1/mobile/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(403);
    expect(response.body.code).toBe('WRONG_AUDIENCE');
  });

  it('devolve o perfil do operador autenticado', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/v1/admin/auth/login').send(operator).expect(200);
    const response = await request(app.getHttpServer())
      .get('/v1/admin/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect(response.body.email).toBe(operator.email);
  });

  it('nega acesso ao painel sem token', async () => {
    await request(app.getHttpServer()).get('/v1/admin/auth/me').expect(401);
  });
```

- [ ] **Step 8: Rodar e commitar**

```bash
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
git add apps/api
git commit -m "feat(api): add panel authentication with role-aware session"
```
