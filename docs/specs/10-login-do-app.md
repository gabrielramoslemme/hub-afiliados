# Spec 10 — Login do afiliado com códigos de estado

**Issue:** SIS-511 · **RF:** RF-04 · **Depende de:** 09

**Entrega:** `POST /v1/mobile/auth/login` devolvendo token quando pode entrar e um código estável quando não pode — é o que permite ao app mostrar "Cadastro em análise.".

O layout da SIS-511 tem e-mail, senha, "Criar conta" e "Esqueci a senha". A regra da issue: *"usuários cujo cadastro ainda não foi aprovado deverá receber uma mensagem ao acessar o app: 'Cadastro em análise.'"*.

**Files:**
- Create: `apps/api/src/domain/auth/dtos/login.request.dto.ts`, `.../login.response.dto.ts`
- Create: `apps/api/src/modules/shared/auth/issue-session.service.ts`
- Create: `apps/api/src/modules/mobile/auth/affiliate-login.use-case.ts`, `apps/api/src/modules/mobile/auth/mobile-auth.controller.ts`
- Modify: `apps/api/src/modules/mobile/mobile.module.ts`
- Test: `apps/api/src/modules/mobile/auth/affiliate-login.use-case.spec.ts`

**Interfaces:**
- Consumes: `UserRepository` (05), `RefreshTokenRepository` (06), `PasswordHashService`, `TokenHashService`, `AccessTokenService` (07).
- Produces:
  - `IssueSessionService.issue(user: UserEntity, audience: AuthAudienceEnum): Promise<{ accessToken: string; refreshToken: string }>` — reusado pelas Specs 11, 12 e 13.
  - `AffiliateLoginUseCase.execute(dto: LoginRequestDto): Promise<LoginResponseDto>`.

---

- [ ] **Step 1: Escrever os DTOs**

`apps/api/src/domain/auth/dtos/login.request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'marina@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email: string;

  @ApiProperty({ example: 'SenhaSegura!2026' })
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  password: string;
}
```

`apps/api/src/domain/auth/dtos/login.response.dto.ts`:

```ts
import { AffiliateStatusEnum, UserRoleEnum } from '@porto/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionUserDto {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  shouldChangePassword: boolean;

  @ApiPropertyOptional({ enum: AffiliateStatusEnum })
  affiliateStatus?: AffiliateStatusEnum;

  @ApiPropertyOptional({ enum: UserRoleEnum })
  role?: UserRoleEnum;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: SessionUserDto })
  user: SessionUserDto;
}
```

- [ ] **Step 2: Escrever o teste do caso de uso — deve falhar**

A tabela da seção 5.2 do spec vira teste, uma linha por caso.

`apps/api/src/modules/mobile/auth/affiliate-login.use-case.spec.ts`:

```ts
import { AffiliateStatusEnum, AuthErrorCodeEnum, UserTypeEnum } from '@porto/contracts';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { AffiliateLoginUseCase } from './affiliate-login.use-case';

describe('AffiliateLoginUseCase', () => {
  const credentials = { email: 'marina@email.com', password: 'SenhaSegura!2026' };

  const approvedUser = (): ReturnType<typeof buildUser> => {
    const user = buildUser({ password: '$2b$10$hash', passwordSetAt: new Date() });
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.APPROVED });
    return user;
  };

  const setup = (user: unknown, passwordMatches = true) => {
    const users = { findByEmail: jest.fn().mockResolvedValue(user), save: jest.fn() };
    const passwordHash = { compare: jest.fn().mockResolvedValue(passwordMatches) };
    const session = {
      issue: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
    };
    return {
      useCase: new AffiliateLoginUseCase(users as never, passwordHash as never, session as never),
      users,
      passwordHash,
      session,
    };
  };

  const expectCode = async (promise: Promise<unknown>, code: AuthErrorCodeEnum): Promise<void> => {
    await expect(promise).rejects.toMatchObject({ response: { code } });
  };

  it('devolve tokens para afiliado aprovado com senha correta', async () => {
    const { useCase } = setup(approvedUser());
    const result = await useCase.execute(credentials);
    expect(result.accessToken).toBe('access');
    expect(result.user.affiliateStatus).toBe(AffiliateStatusEnum.APPROVED);
  });

  it('atualiza o último acesso', async () => {
    const { useCase, users } = setup(approvedUser());
    await useCase.execute(credentials);
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ lastLoginAt: expect.any(Date) }));
  });

  it('devolve INVALID_CREDENTIALS quando o e-mail não existe', async () => {
    const { useCase } = setup(null);
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.INVALID_CREDENTIALS);
    await expect(useCase.execute(credentials)).rejects.toThrow(UnauthorizedException);
  });

  it('devolve INVALID_CREDENTIALS quando a senha está errada', async () => {
    const { useCase } = setup(approvedUser(), false);
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.INVALID_CREDENTIALS);
  });

  it('devolve REGISTRATION_UNDER_REVIEW para cadastro pendente', async () => {
    const user = buildUser();
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.PENDING_APPROVAL });
    const { useCase } = setup(user);
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW);
    await expect(useCase.execute(credentials)).rejects.toThrow(ForbiddenException);
  });

  it('não checa a senha de um cadastro pendente — ele ainda nem tem senha', async () => {
    const user = buildUser();
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.PENDING_APPROVAL });
    const { useCase, passwordHash } = setup(user);
    await expect(useCase.execute(credentials)).rejects.toBeDefined();
    expect(passwordHash.compare).not.toHaveBeenCalled();
  });

  it('devolve REGISTRATION_REJECTED para cadastro reprovado', async () => {
    const user = buildUser();
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.REJECTED, rejectionReason: 'Perfil fora do público-alvo' });
    const { useCase } = setup(user);
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.REGISTRATION_REJECTED);
  });

  it('devolve PASSWORD_NOT_SET para aprovado que ainda não criou senha', async () => {
    const user = buildUser({ password: null, passwordSetAt: null });
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.APPROVED });
    const { useCase } = setup(user);
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.PASSWORD_NOT_SET);
  });

  it('devolve ACCOUNT_INACTIVE para conta desativada', async () => {
    const user = buildUser({ isActive: false, password: '$2b$10$hash' });
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.APPROVED });
    const { useCase } = setup(user);
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.ACCOUNT_INACTIVE);
  });

  it('devolve ACCOUNT_INACTIVE para afiliado suspenso', async () => {
    const user = buildUser({ password: '$2b$10$hash' });
    user.affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.SUSPENDED });
    const { useCase } = setup(user);
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.ACCOUNT_INACTIVE);
  });

  it('recusa operador do painel tentando entrar pelo app', async () => {
    const { useCase } = setup(buildAdminUser());
    await expectCode(useCase.execute(credentials), AuthErrorCodeEnum.INVALID_CREDENTIALS);
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- affiliate-login
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar o `IssueSessionService`**

`apps/api/src/modules/shared/auth/issue-session.service.ts`:

```ts
import { AuthAudienceEnum } from '@porto/contracts';
import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '@Domain/auth/refresh-token.repository';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { TokenHashService } from '@Infra/services/crypto/token-hash.service';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';
import { AccessTokenService } from './access-token.service';

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class IssueSessionService {
  constructor(
    private readonly accessToken: AccessTokenService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenHash: TokenHashService,
    private readonly env: EnvironmentVariableService,
  ) {}

  async issue(user: UserEntity, audience: AuthAudienceEnum): Promise<IssuedSession> {
    const accessToken = this.accessToken.sign({
      sub: user.publicId,
      aud: audience,
      type: user.type,
      role: user.role,
    });

    const { token, hash } = this.tokenHash.generate();
    const expiresAt = new Date(Date.now() + this.env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    await this.refreshTokens.create({ userId: user.id, tokenHash: hash, expiresAt });

    return { accessToken, refreshToken: token };
  }
}
```

- [ ] **Step 5: Implementar o caso de uso de login**

A ordem das checagens é a regra: **estado do cadastro antes de senha**, porque um cadastro pendente não tem senha para conferir.

`apps/api/src/modules/mobile/auth/affiliate-login.use-case.ts`:

```ts
import {
  AffiliateStatusEnum, AuthAudienceEnum, AuthErrorCodeEnum, UserTypeEnum,
} from '@porto/contracts';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginRequestDto } from '@Domain/auth/dtos/login.request.dto';
import { LoginResponseDto } from '@Domain/auth/dtos/login.response.dto';
import { UserRepository } from '@Domain/users/user.repository';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';
import { PasswordHashService } from '@Infra/services/crypto/password-hash.service';
import { IssueSessionService } from '@Modules/shared/auth/issue-session.service';

@Injectable()
export class AffiliateLoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHash: PasswordHashService,
    private readonly session: IssueSessionService,
  ) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.users.findByEmail(dto.email);

    if (!user || user.type !== UserTypeEnum.AFFILIATE || !user.affiliate) {
      throw new UnauthorizedException({
        code: AuthErrorCodeEnum.INVALID_CREDENTIALS,
        message: 'E-mail ou senha inválidos',
      });
    }

    this.assertCanSignIn(user);

    const matches = user.password ? await this.passwordHash.compare(dto.password, user.password) : false;
    if (!matches) {
      throw new UnauthorizedException({
        code: AuthErrorCodeEnum.INVALID_CREDENTIALS,
        message: 'E-mail ou senha inválidos',
      });
    }

    const tokens = await this.session.issue(user, AuthAudienceEnum.AFFILIATE);
    await this.users.save({ id: user.id, lastLoginAt: new Date() });

    return {
      ...tokens,
      user: {
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        shouldChangePassword: user.shouldChangePassword,
        affiliateStatus: user.affiliate.status,
      },
    };
  }

  /**
   * Estado do cadastro decide antes da senha. Um cadastro pendente não tem
   * senha definida — sem esta ordem, o afiliado veria "senha inválida" em vez
   * de "Cadastro em análise." (SIS-511).
   */
  private assertCanSignIn(user: UserEntity): void {
    const status = user.affiliate!.status;

    if (status === AffiliateStatusEnum.PENDING_APPROVAL) {
      throw new ForbiddenException({
        code: AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW,
        message: 'Cadastro em análise.',
      });
    }

    if (status === AffiliateStatusEnum.REJECTED) {
      throw new ForbiddenException({
        code: AuthErrorCodeEnum.REGISTRATION_REJECTED,
        message: user.affiliate!.rejectionReason ?? 'Cadastro não aprovado.',
      });
    }

    if (!user.isActive || status === AffiliateStatusEnum.SUSPENDED) {
      throw new ForbiddenException({
        code: AuthErrorCodeEnum.ACCOUNT_INACTIVE,
        message: 'Conta indisponível. Fale com o suporte.',
      });
    }

    if (!user.password || !user.passwordSetAt) {
      throw new ForbiddenException({
        code: AuthErrorCodeEnum.PASSWORD_NOT_SET,
        message: 'Cadastro aprovado. Use o link enviado por e-mail para criar sua senha.',
      });
    }
  }
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
npm run test --workspace apps/api -- affiliate-login
```

Esperado: PASS, 11 testes.

- [ ] **Step 7: Escrever o controller**

`apps/api/src/modules/mobile/auth/mobile-auth.controller.ts`:

```ts
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoginRequestDto } from '@Domain/auth/dtos/login.request.dto';
import { LoginResponseDto } from '@Domain/auth/dtos/login.response.dto';
import { Public } from '@Modules/shared/auth/decorators/public.decorator';
import { AffiliateGuard } from '@Modules/shared/auth/guards/affiliate.guard';
import { AffiliateLoginUseCase } from './affiliate-login.use-case';

@ApiTags('mobile/auth')
@Controller('mobile/auth')
@UseGuards(AffiliateGuard)
export class MobileAuthController {
  constructor(private readonly login: AffiliateLoginUseCase) {}

  @Post('login')
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_CREDENTIALS' })
  @ApiForbiddenResponse({
    description:
      'REGISTRATION_UNDER_REVIEW (mostrar "Cadastro em análise."), REGISTRATION_REJECTED, PASSWORD_NOT_SET ou ACCOUNT_INACTIVE',
  })
  signIn(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.login.execute(dto);
  }
}
```

Registre `MobileAuthController`, `AffiliateLoginUseCase` e `IssueSessionService` nos módulos (`MobileModule` e `AuthModule`, respectivamente).

- [ ] **Step 8: Conferir a documentação gerada**

```bash
npm run openapi:generate --workspace apps/api
node -e "const d=require('./apps/api/openapi.json'); console.log(JSON.stringify(d.paths['/v1/mobile/auth/login'].post.responses, null, 2))"
```

Esperado: as respostas 200, 401 e 403 documentadas, com a descrição dos códigos — é isso que o time do app vai ler.

- [ ] **Step 9: Commit**

```bash
npm run test --workspace apps/api
git add apps/api
git commit -m "feat(api): add affiliate login with registration state codes"
```
