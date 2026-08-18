# Spec 12 — Refresh, logout e `GET /mobile/me`

**Issue:** SIS-511 · **RF:** RF-04 · **Depende de:** 10

**Entrega:** o app renova a sessão sem pedir senha de novo, encerra a sessão no logout, e lê o próprio cadastro com o status atual.

**Files:**
- Create: `apps/api/src/domain/auth/dtos/refresh-token.request.dto.ts`
- Create: `apps/api/src/modules/shared/auth/refresh-session.use-case.ts`, `.../revoke-session.use-case.ts`
- Create: `apps/api/src/domain/affiliates/dtos/affiliate-me.response.dto.ts`
- Create: `apps/api/src/modules/mobile/affiliates/mobile-me.controller.ts`
- Modify: `apps/api/src/modules/mobile/auth/mobile-auth.controller.ts`, `apps/api/src/modules/mobile/mobile.module.ts`, `apps/api/src/modules/shared/auth/auth.module.ts`
- Test: `apps/api/src/modules/shared/auth/refresh-session.use-case.spec.ts`

**Interfaces:**
- Consumes: `RefreshTokenRepository` (06), `TokenHashService`, `AccessTokenService` (07), `IssueSessionService` (10).
- Produces:
  - `RefreshSessionUseCase.execute(refreshToken: string, audience: AuthAudienceEnum): Promise<IssuedSession>` — usado também pelo painel (Spec 13).
  - `RevokeSessionUseCase.execute(refreshToken: string): Promise<void>`.
  - `AffiliateMeResponseDto`.

---

- [ ] **Step 1: Escrever os DTOs**

`apps/api/src/domain/auth/dtos/refresh-token.request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

`apps/api/src/domain/affiliates/dtos/affiliate-me.response.dto.ts`:

```ts
import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AffiliateMeResponseDto {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: '529.982.247-25' })
  cpf: string;

  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty()
  pixKey: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ example: '1.0-homolog' })
  termsVersion: string;

  @ApiProperty()
  termsAcceptedAt: string;

  @ApiPropertyOptional({ nullable: true })
  approvedAt: string | null;
}
```

- [ ] **Step 2: Escrever o teste da renovação — deve falhar**

A rotação é o que interessa: um refresh token usado nunca vale duas vezes.

`apps/api/src/modules/shared/auth/refresh-session.use-case.spec.ts`:

```ts
import { AuthAudienceEnum } from '@porto/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { buildUser } from '@Testing/factories/user.factory';
import { RefreshSessionUseCase } from './refresh-session.use-case';

describe('RefreshSessionUseCase', () => {
  const setup = (record: unknown) => {
    const user = buildUser({ id: 7 });
    const refreshTokens = {
      findUsable: jest.fn().mockResolvedValue(record === undefined ? { id: 1, userId: 7, user } : record),
      rotate: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue({ id: 2 }),
    };
    const tokenHash = { hash: jest.fn().mockReturnValue('hashed'), generate: jest.fn() };
    const session = {
      issue: jest.fn().mockResolvedValue({ accessToken: 'novo-access', refreshToken: 'novo-refresh' }),
      lastCreatedId: 2,
    };
    return {
      useCase: new RefreshSessionUseCase(refreshTokens as never, tokenHash as never, session as never),
      refreshTokens, tokenHash, session, user,
    };
  };

  it('devolve um par novo de tokens', async () => {
    const { useCase } = setup(undefined);
    const result = await useCase.execute('plain-refresh', AuthAudienceEnum.AFFILIATE);
    expect(result).toEqual({ accessToken: 'novo-access', refreshToken: 'novo-refresh' });
  });

  it('procura pelo hash, nunca pelo token em claro', async () => {
    const { useCase, tokenHash, refreshTokens } = setup(undefined);
    await useCase.execute('plain-refresh', AuthAudienceEnum.AFFILIATE);
    expect(tokenHash.hash).toHaveBeenCalledWith('plain-refresh');
    expect(refreshTokens.findUsable).toHaveBeenCalledWith('hashed');
  });

  it('revoga o token antigo — rotação obrigatória', async () => {
    const { useCase, refreshTokens } = setup(undefined);
    await useCase.execute('plain-refresh', AuthAudienceEnum.AFFILIATE);
    expect(refreshTokens.rotate).toHaveBeenCalledWith(1, expect.any(Number));
  });

  it('emite a sessão na audiência pedida', async () => {
    const { useCase, session } = setup(undefined);
    await useCase.execute('plain-refresh', AuthAudienceEnum.ADMIN);
    expect(session.issue).toHaveBeenCalledWith(expect.anything(), AuthAudienceEnum.ADMIN);
  });

  it('rejeita refresh token revogado, expirado ou inexistente', async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute('plain-refresh', AuthAudienceEnum.AFFILIATE)).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita quando a conta foi desativada depois da emissão', async () => {
    const inactive = buildUser({ id: 7, isActive: false });
    const { useCase } = setup({ id: 1, userId: 7, user: inactive });
    await expect(useCase.execute('plain-refresh', AuthAudienceEnum.AFFILIATE)).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- refresh-session
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 4: Ajustar o `IssueSessionService` para expor o id criado**

A rotação precisa saber qual registro substituiu qual. Em `issue-session.service.ts`, mude o retorno:

```ts
export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: number;
}
```

E no corpo:

```ts
    const created = await this.refreshTokens.create({ userId: user.id, tokenHash: hash, expiresAt });
    return { accessToken, refreshToken: token, refreshTokenId: created.id };
```

Os consumidores da Spec 10 continuam funcionando — o campo extra é ignorado pelo `LoginResponseDto`. Ajuste o teste de `AffiliateLoginUseCase` para o mock devolver também `refreshTokenId: 1`.

- [ ] **Step 5: Implementar os casos de uso**

`apps/api/src/modules/shared/auth/refresh-session.use-case.ts`:

```ts
import { AuthAudienceEnum } from '@porto/contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenRepository } from '@Domain/auth/refresh-token.repository';
import { TokenHashService } from '@Infra/services/crypto/token-hash.service';
import { IssuedSession, IssueSessionService } from './issue-session.service';

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenHash: TokenHashService,
    private readonly session: IssueSessionService,
  ) {}

  async execute(refreshToken: string, audience: AuthAudienceEnum): Promise<IssuedSession> {
    const record = await this.refreshTokens.findUsable(this.tokenHash.hash(refreshToken));
    if (!record || !record.user?.isActive) {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Sessão expirada. Entre novamente.' });
    }

    const issued = await this.session.issue(record.user, audience);
    // Rotação: o token apresentado morre aqui. Reapresentá-lo não renova nada.
    await this.refreshTokens.rotate(record.id, issued.refreshTokenId);

    return issued;
  }
}
```

`apps/api/src/modules/shared/auth/revoke-session.use-case.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '@Domain/auth/refresh-token.repository';
import { TokenHashService } from '@Infra/services/crypto/token-hash.service';

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenHash: TokenHashService,
  ) {}

  /** Logout é idempotente: token desconhecido não é erro. */
  async execute(refreshToken: string): Promise<void> {
    const record = await this.refreshTokens.findUsable(this.tokenHash.hash(refreshToken));
    if (record) await this.refreshTokens.revoke(record.id);
  }
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
npm run test --workspace apps/api -- refresh-session affiliate-login
```

Esperado: PASS em ambos.

- [ ] **Step 7: Expor refresh e logout no controller mobile**

Acrescente a `MobileAuthController`:

```ts
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Novo par de tokens' })
  @ApiUnauthorizedResponse({ description: 'INVALID_TOKEN' })
  async refresh(@Body() dto: RefreshTokenRequestDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { accessToken, refreshToken } = await this.refreshSession.execute(
      dto.refreshToken,
      AuthAudienceEnum.AFFILIATE,
    );
    return { accessToken, refreshToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Sessão encerrada' })
  logout(@Body() dto: RefreshTokenRequestDto): Promise<void> {
    return this.revokeSession.execute(dto.refreshToken);
  }
```

> `refresh` é `@Public()` porque o access token já expirou quando ele é chamado — quem autentica é o próprio refresh token. `logout` exige o access token válido.

- [ ] **Step 8: Escrever o controller do `me`**

`apps/api/src/modules/mobile/affiliates/mobile-me.controller.ts`:

```ts
import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { AffiliateMeResponseDto } from '@Domain/affiliates/dtos/affiliate-me.response.dto';
import { AuthenticatedUser, CurrentUser } from '@Modules/shared/auth/decorators/current-user.decorator';
import { AffiliateGuard } from '@Modules/shared/auth/guards/affiliate.guard';

@ApiTags('mobile/me')
@ApiBearerAuth()
@Controller('mobile/me')
@UseGuards(AffiliateGuard)
export class MobileMeController {
  constructor(private readonly affiliates: AffiliateRepository) {}

  @Get()
  @ApiOkResponse({ type: AffiliateMeResponseDto })
  async me(@CurrentUser() current: AuthenticatedUser): Promise<AffiliateMeResponseDto> {
    const affiliate = await this.affiliates.findByPublicId(current.affiliatePublicId!);
    if (!affiliate) throw new NotFoundException({ code: 'AFFILIATE_NOT_FOUND', message: 'Cadastro não encontrado' });

    return {
      publicId: affiliate.publicId,
      name: affiliate.user.name,
      email: affiliate.user.email,
      cpf: affiliate.cpf,
      pixKeyType: affiliate.pixKeyType,
      pixKey: affiliate.pixKey,
      status: affiliate.status,
      termsVersion: affiliate.termsVersion.version,
      termsAcceptedAt: affiliate.termsAcceptedAt.toISOString(),
      approvedAt: affiliate.approvedAt?.toISOString() ?? null,
    };
  }
}
```

> O CPF vai completo aqui — é o próprio dono lendo o próprio cadastro. A máscara vale para a listagem do painel (Spec 14).

- [ ] **Step 9: Registrar e verificar**

Registre `MobileMeController` em `MobileModule` e `RefreshSessionUseCase` e `RevokeSessionUseCase` em `AuthModule`.

```bash
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
npm run openapi:generate --workspace apps/api
node -e "const d=require('./apps/api/openapi.json'); console.log(Object.keys(d.paths).filter(p=>p.includes('mobile')))"
```

Esperado: as rotas `/v1/mobile/terms/current`, `/v1/mobile/affiliates`, `/v1/mobile/auth/login`, `/v1/mobile/auth/password/set`, `/v1/mobile/auth/password/forgot`, `/v1/mobile/auth/password/reset`, `/v1/mobile/auth/refresh`, `/v1/mobile/auth/logout` e `/v1/mobile/me`.

- [ ] **Step 10: Commit**

```bash
git add apps/api
git commit -m "feat(api): add session refresh with rotation, logout and affiliate profile endpoint"
```
