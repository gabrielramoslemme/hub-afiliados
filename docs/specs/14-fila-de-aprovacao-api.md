# Spec 14 — Fila de aprovação: lista, detalhe e trilha

**Issue:** SIS-519 · **RF:** RF-06 · **Depende de:** 13

**Entrega:** `GET /v1/admin/affiliates`, `GET /v1/admin/affiliates/:publicId` e `GET /v1/admin/affiliates/:publicId/history`.

A SIS-519 pede exatamente: exibir nome, e-mail, CPF, status e data de criação; buscar por nome. O CPF vai **mascarado** na lista (spec, seção 10) e completo no detalhe, onde o operador precisa dele para a análise.

**Files:**
- Create: `apps/api/src/domain/affiliates/filters/affiliate-list.filter.ts`
- Create: `apps/api/src/domain/affiliates/dtos/affiliate-list-item.response.dto.ts`, `.../affiliate-detail.response.dto.ts`, `.../affiliate-history-item.response.dto.ts`
- Create: `apps/api/src/modules/admin/affiliates/admin-affiliate.service.ts`, `.../admin-affiliate.controller.ts`, `.../admin-affiliate.mapper.ts`
- Modify: `apps/api/src/domain/affiliates/affiliate.repository.ts` (método `search`), `apps/api/src/modules/admin/admin.module.ts`
- Test: `apps/api/src/modules/admin/affiliates/admin-affiliate.mapper.spec.ts`, `apps/api/test/admin-affiliates.e2e-spec.ts`

**Interfaces:**
- Consumes: `AffiliateRepository` (05), `AffiliateStatusHistoryRepository` (06), `AdminGuard` (07), `maskCpf` (05).
- Produces:
  - `AffiliateRepository.search(filter: AffiliateListFilter): Promise<{ items: AffiliateEntity[]; total: number }>`.
  - `toAffiliateListItem(affiliate)`, `toAffiliateDetail(affiliate)`, `toAffiliateHistoryItem(entry)` — mappers puros, testáveis sem banco.
  - `AdminAffiliateService.list`, `.detail`, `.history`.

---

- [ ] **Step 1: Escrever o filtro e os DTOs**

`apps/api/src/domain/affiliates/filters/affiliate-list.filter.ts`:

```ts
import { AffiliateStatusEnum } from '@porto/contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AffiliateListFilter {
  @ApiPropertyOptional({ description: 'Busca por nome do afiliado' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  search?: string;

  @ApiPropertyOptional({ enum: AffiliateStatusEnum })
  @IsOptional()
  @IsEnum(AffiliateStatusEnum)
  status?: AffiliateStatusEnum;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ['name', 'createdAt', 'status'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['name', 'createdAt', 'status'])
  sortBy: 'name' | 'createdAt' | 'status' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
```

`apps/api/src/domain/affiliates/dtos/affiliate-list-item.response.dto.ts`:

```ts
import { AffiliateStatusEnum } from '@porto/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class AffiliateListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: '***.***.247-25', description: 'CPF mascarado — o completo só no detalhe' })
  maskedCpf: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty()
  createdAt: string;
}
```

`apps/api/src/domain/affiliates/dtos/affiliate-detail.response.dto.ts`:

```ts
import { PixKeyTypeEnum } from '@porto/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { AffiliateListItemResponseDto } from './affiliate-list-item.response.dto';

export class AffiliateDetailResponseDto extends AffiliateListItemResponseDto {
  @ApiProperty({ example: '52998224725', description: 'CPF completo — só no detalhe, para a análise' })
  cpf: string;

  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty()
  pixKey: string;

  @ApiProperty({ example: '1.0-homolog' })
  termsVersion: string;

  @ApiProperty()
  termsAcceptedAt: string;

  @ApiProperty({ nullable: true, type: String })
  approvedAt: string | null;

  @ApiProperty({ nullable: true, type: String })
  approvedByName: string | null;

  @ApiProperty({ nullable: true, type: String })
  rejectionReason: string | null;
}
```

`apps/api/src/domain/affiliates/dtos/affiliate-history-item.response.dto.ts`:

```ts
import { AffiliateStatusEnum } from '@porto/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class AffiliateHistoryItemResponseDto {
  @ApiProperty({ enum: AffiliateStatusEnum, nullable: true })
  fromStatus: AffiliateStatusEnum | null;

  @ApiProperty({ enum: AffiliateStatusEnum })
  toStatus: AffiliateStatusEnum;

  @ApiProperty({ nullable: true, type: String })
  reason: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Nulo no cadastro inicial, feito pelo próprio afiliado' })
  actorName: string | null;

  @ApiProperty()
  createdAt: string;
}
```

> Os tipos correspondentes já existem em `@porto/contracts` (`AffiliateListItem`, `AffiliateDetail`, `AffiliateStatusHistoryItem`). Os campos precisam bater um a um — é o painel que consome os dois lados.

- [ ] **Step 2: Escrever o teste dos mappers — deve falhar**

Mapper puro é o lugar barato de testar a regra do CPF mascarado.

`apps/api/src/modules/admin/affiliates/admin-affiliate.mapper.spec.ts`:

```ts
import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { toAffiliateDetail, toAffiliateHistoryItem, toAffiliateListItem } from './admin-affiliate.mapper';

describe('admin-affiliate.mapper', () => {
  const user = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' });

  describe('toAffiliateListItem', () => {
    it('mascara o CPF', () => {
      const affiliate = buildAffiliate({ user, cpf: '52998224725' });
      expect(toAffiliateListItem(affiliate).maskedCpf).toBe('***.***.247-25');
    });

    it('nunca expõe o CPF completo', () => {
      const affiliate = buildAffiliate({ user, cpf: '52998224725' });
      expect(JSON.stringify(toAffiliateListItem(affiliate))).not.toContain('52998224725');
    });

    it('traz os campos que a SIS-519 pede', () => {
      const affiliate = buildAffiliate({ user, status: AffiliateStatusEnum.PENDING_APPROVAL });
      expect(toAffiliateListItem(affiliate)).toEqual({
        publicId: affiliate.publicId,
        name: 'Marina Ferraz',
        email: 'marina@email.com',
        maskedCpf: '***.***.247-25',
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        createdAt: affiliate.createdAt.toISOString(),
      });
    });
  });

  describe('toAffiliateDetail', () => {
    it('traz o CPF completo e a chave PIX para a análise', () => {
      const affiliate = buildAffiliate({ user, cpf: '52998224725', pixKeyType: PixKeyTypeEnum.CPF, pixKey: '52998224725' });
      affiliate.termsVersion = { id: 1, version: '1.0-homolog' } as never;
      const detail = toAffiliateDetail(affiliate);
      expect(detail.cpf).toBe('52998224725');
      expect(detail.pixKey).toBe('52998224725');
      expect(detail.termsVersion).toBe('1.0-homolog');
    });

    it('traz o nome de quem aprovou quando já houve decisão', () => {
      const approver = buildAdminUser({ name: 'Analista Porto' });
      const affiliate = buildAffiliate({
        user,
        status: AffiliateStatusEnum.APPROVED,
        approvedAt: new Date('2026-08-17T15:00:00Z'),
        approvedBy: approver,
      });
      affiliate.termsVersion = { id: 1, version: '1.0-homolog' } as never;
      expect(toAffiliateDetail(affiliate).approvedByName).toBe('Analista Porto');
    });

    it('devolve nulos quando ainda não houve decisão', () => {
      const affiliate = buildAffiliate({ user });
      affiliate.termsVersion = { id: 1, version: '1.0-homolog' } as never;
      const detail = toAffiliateDetail(affiliate);
      expect(detail.approvedAt).toBeNull();
      expect(detail.approvedByName).toBeNull();
      expect(detail.rejectionReason).toBeNull();
    });
  });

  describe('toAffiliateHistoryItem', () => {
    it('traz o autor da transição', () => {
      const actor = buildAdminUser({ name: 'Analista Porto' });
      const entry = {
        fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.REJECTED,
        reason: 'Perfil fora do público-alvo',
        actor,
        createdAt: new Date('2026-08-17T16:00:00Z'),
      };
      expect(toAffiliateHistoryItem(entry as never)).toEqual({
        fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.REJECTED,
        reason: 'Perfil fora do público-alvo',
        actorName: 'Analista Porto',
        createdAt: '2026-08-17T16:00:00.000Z',
      });
    });

    it('aceita transição sem autor — o cadastro inicial é do próprio afiliado', () => {
      const entry = {
        fromStatus: null,
        toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        reason: null,
        actor: null,
        createdAt: new Date('2026-08-17T12:00:00Z'),
      };
      expect(toAffiliateHistoryItem(entry as never).actorName).toBeNull();
    });
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- admin-affiliate.mapper
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar os mappers**

`apps/api/src/modules/admin/affiliates/admin-affiliate.mapper.ts`:

```ts
import { AffiliateDetailResponseDto } from '@Domain/affiliates/dtos/affiliate-detail.response.dto';
import { AffiliateHistoryItemResponseDto } from '@Domain/affiliates/dtos/affiliate-history-item.response.dto';
import { AffiliateListItemResponseDto } from '@Domain/affiliates/dtos/affiliate-list-item.response.dto';
import { maskCpf } from '@Domain/shared/utils/cpf.util';
import { AffiliateStatusHistoryEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.entity';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';

export function toAffiliateListItem(affiliate: AffiliateEntity): AffiliateListItemResponseDto {
  return {
    publicId: affiliate.publicId,
    name: affiliate.user.name,
    email: affiliate.user.email,
    maskedCpf: maskCpf(affiliate.cpf),
    status: affiliate.status,
    createdAt: affiliate.createdAt.toISOString(),
  };
}

export function toAffiliateDetail(affiliate: AffiliateEntity): AffiliateDetailResponseDto {
  return {
    ...toAffiliateListItem(affiliate),
    cpf: affiliate.cpf,
    pixKeyType: affiliate.pixKeyType,
    pixKey: affiliate.pixKey,
    termsVersion: affiliate.termsVersion.version,
    termsAcceptedAt: affiliate.termsAcceptedAt.toISOString(),
    approvedAt: affiliate.approvedAt?.toISOString() ?? null,
    approvedByName: affiliate.approvedBy?.name ?? null,
    rejectionReason: affiliate.rejectionReason ?? null,
  };
}

export function toAffiliateHistoryItem(entry: AffiliateStatusHistoryEntity): AffiliateHistoryItemResponseDto {
  return {
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    reason: entry.reason,
    actorName: entry.actor?.name ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}
```

- [ ] **Step 5: Implementar a busca no repositório**

A consulta parte de `affiliates` e faz join com `users`. É isso que torna estruturalmente impossível um operador aparecer na fila de aprovação.

Em `apps/api/src/domain/affiliates/affiliate.repository.ts`:

```ts
  async search(filter: AffiliateListFilter): Promise<{ items: AffiliateEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('affiliate')
      .innerJoinAndSelect('affiliate.user', 'user');

    if (filter.search) {
      query.andWhere('unaccent(user.name) ILIKE unaccent(:search)', { search: `%${filter.search}%` });
    }

    if (filter.status) {
      query.andWhere('affiliate.status = :status', { status: filter.status });
    }

    const sortColumn = { name: 'user.name', createdAt: 'affiliate.createdAt', status: 'affiliate.status' }[filter.sortBy];
    query.orderBy(sortColumn, filter.sortOrder === 'asc' ? 'ASC' : 'DESC');

    query.skip((filter.page - 1) * filter.limit).take(filter.limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }
```

A busca usa `unaccent` para que "Marina Ferraz" apareça ao digitar "ferraz" ou "Férraz". Crie a migration `1755420000000-AddUnaccentExtension.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnaccentExtension1755420000000 implements MigrationInterface {
  name = 'AddUnaccentExtension1755420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "unaccent"`);
  }
}
```

- [ ] **Step 6: Implementar o serviço e o controller**

`apps/api/src/modules/admin/affiliates/admin-affiliate.service.ts`:

```ts
import { PaginatedResult } from '@porto/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { AffiliateDetailResponseDto } from '@Domain/affiliates/dtos/affiliate-detail.response.dto';
import { AffiliateHistoryItemResponseDto } from '@Domain/affiliates/dtos/affiliate-history-item.response.dto';
import { AffiliateListItemResponseDto } from '@Domain/affiliates/dtos/affiliate-list-item.response.dto';
import { AffiliateListFilter } from '@Domain/affiliates/filters/affiliate-list.filter';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';
import { toAffiliateDetail, toAffiliateHistoryItem, toAffiliateListItem } from './admin-affiliate.mapper';

@Injectable()
export class AdminAffiliateService {
  constructor(
    private readonly affiliates: AffiliateRepository,
    private readonly history: AffiliateStatusHistoryRepository,
  ) {}

  async list(filter: AffiliateListFilter): Promise<PaginatedResult<AffiliateListItemResponseDto>> {
    const { items, total } = await this.affiliates.search(filter);
    return { data: items.map(toAffiliateListItem), total, page: filter.page, limit: filter.limit };
  }

  async detail(publicId: string): Promise<AffiliateDetailResponseDto> {
    return toAffiliateDetail(await this.findOrFail(publicId));
  }

  async history(publicId: string): Promise<AffiliateHistoryItemResponseDto[]> {
    const affiliate = await this.findOrFail(publicId);
    const entries = await this.history.listByAffiliateId(affiliate.id);
    return entries.map(toAffiliateHistoryItem);
  }

  async findOrFail(publicId: string): Promise<AffiliateEntity> {
    const affiliate = await this.affiliates.findByPublicId(publicId);
    if (!affiliate) {
      throw new NotFoundException({ code: 'AFFILIATE_NOT_FOUND', message: 'Afiliado não encontrado' });
    }
    return affiliate;
  }
}
```

`apps/api/src/modules/admin/affiliates/admin-affiliate.controller.ts`:

```ts
import { PaginatedResult } from '@porto/contracts';
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AffiliateDetailResponseDto } from '@Domain/affiliates/dtos/affiliate-detail.response.dto';
import { AffiliateHistoryItemResponseDto } from '@Domain/affiliates/dtos/affiliate-history-item.response.dto';
import { AffiliateListItemResponseDto } from '@Domain/affiliates/dtos/affiliate-list-item.response.dto';
import { AffiliateListFilter } from '@Domain/affiliates/filters/affiliate-list.filter';
import { AdminGuard } from '@Modules/shared/auth/guards/admin.guard';
import { AdminAffiliateService } from './admin-affiliate.service';

@ApiTags('admin/affiliates')
@ApiBearerAuth()
@Controller('admin/affiliates')
@UseGuards(AdminGuard)
export class AdminAffiliateController {
  constructor(private readonly service: AdminAffiliateService) {}

  @Get()
  @ApiOkResponse({ type: AffiliateListItemResponseDto, isArray: true })
  list(@Query() filter: AffiliateListFilter): Promise<PaginatedResult<AffiliateListItemResponseDto>> {
    return this.service.list(filter);
  }

  @Get(':publicId')
  @ApiOkResponse({ type: AffiliateDetailResponseDto })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND' })
  detail(@Param('publicId', ParseUUIDPipe) publicId: string): Promise<AffiliateDetailResponseDto> {
    return this.service.detail(publicId);
  }

  @Get(':publicId/history')
  @ApiOkResponse({ type: AffiliateHistoryItemResponseDto, isArray: true })
  history(@Param('publicId', ParseUUIDPipe) publicId: string): Promise<AffiliateHistoryItemResponseDto[]> {
    return this.service.history(publicId);
  }
}
```

Registre controller e service em `AdminModule`.

- [ ] **Step 7: Escrever o e2e**

`apps/api/test/admin-affiliates.e2e-spec.ts` — autentique como operador no `beforeEach` e crie três afiliados via `POST /v1/mobile/affiliates`:

```ts
  it('lista os afiliados com CPF mascarado', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/affiliates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.total).toBe(3);
    expect(response.body.data[0].maskedCpf).toMatch(/^\*\*\*\.\*\*\*\./);
    expect(JSON.stringify(response.body)).not.toContain('52998224725');
  });

  it('busca por parte do nome, ignorando acento', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/affiliates?search=ferraz')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data[0].name).toContain('Ferraz');
  });

  it('filtra por status', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/affiliates?status=APPROVED')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.total).toBe(0);
  });

  it('devolve o CPF completo no detalhe', async () => {
    const list = await request(app.getHttpServer())
      .get('/v1/admin/affiliates').set('Authorization', `Bearer ${token}`).expect(200);
    const response = await request(app.getHttpServer())
      .get(`/v1/admin/affiliates/${list.body.data[0].publicId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.cpf).toHaveLength(11);
    expect(response.body.termsVersion).toBe('1.0-homolog');
  });

  it('devolve a trilha com a transição inicial', async () => {
    const list = await request(app.getHttpServer())
      .get('/v1/admin/affiliates').set('Authorization', `Bearer ${token}`).expect(200);
    const response = await request(app.getHttpServer())
      .get(`/v1/admin/affiliates/${list.body.data[0].publicId}/history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ fromStatus: null, toStatus: 'PENDING_APPROVAL', actorName: null });
  });

  it('nega acesso sem token', async () => {
    await request(app.getHttpServer()).get('/v1/admin/affiliates').expect(401);
  });

  it('nega acesso com token de afiliado', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/admin/affiliates')
      .set('Authorization', `Bearer ${affiliateToken}`)
      .expect(403);
    expect(response.body.code).toBe('WRONG_AUDIENCE');
  });
```

- [ ] **Step 8: Rodar e commitar**

```bash
npm run typeorm:run --workspace apps/api
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
git add apps/api
git commit -m "feat(api): add affiliate approval queue with search, detail and audit trail"
```
