# Spec 09 — Termos vigentes e pré-cadastro do afiliado

**Issue:** SIS-509 · **RF:** RF-02, RF-03, RF-05 · **Depende de:** 07, 08

**Entrega:** `GET /v1/mobile/terms/current` e `POST /v1/mobile/affiliates` funcionando, com todas as validações do layout aprovado.

O layout da SIS-509 não tem campo de senha — o texto é "Informe seus dados para validar o **pré-cadastro**". O cadastro cria `users` sem senha e `affiliates` com status `PENDING_APPROVAL`. A senha nasce depois da aprovação (Spec 11).

**Files:**
- Create: `apps/api/src/domain/affiliates/dtos/register-affiliate.request.dto.ts`, `.../register-affiliate.response.dto.ts`, `apps/api/src/domain/terms/dtos/current-terms.response.dto.ts`
- Create: `apps/api/src/modules/shared/affiliates/register-affiliate.use-case.ts`
- Create: `apps/api/src/modules/mobile/affiliates/mobile-affiliate.controller.ts`, `apps/api/src/modules/mobile/terms/mobile-terms.controller.ts`
- Modify: `apps/api/src/modules/mobile/mobile.module.ts`
- Test: `apps/api/src/modules/shared/affiliates/register-affiliate.use-case.spec.ts`, `apps/api/test/mobile-registration.e2e-spec.ts`

**Interfaces:**
- Consumes: `UserRepository`, `AffiliateRepository`, `TermsVersionRepository` (Spec 05); `AffiliateStatusHistoryRepository` (Spec 06); `MailService` (Spec 08); `sanitizeCpf`, `isValidCpf` (Spec 05).
- Produces: `RegisterAffiliateUseCase.execute(dto: RegisterAffiliateRequestDto): Promise<RegisterAffiliateResponseDto>` — usado apenas pelo controller mobile.

---

- [ ] **Step 1: Escrever os DTOs**

`apps/api/src/domain/terms/dtos/current-terms.response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class CurrentTermsResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '1.0-homolog' })
  version: string;

  @ApiProperty({ example: 'https://afiliados.porto.example/termos/1.0-homolog' })
  contentUrl: string;

  @ApiProperty()
  publishedAt: string;
}
```

`apps/api/src/domain/affiliates/dtos/register-affiliate.request.dto.ts`:

```ts
import { PixKeyTypeEnum } from '@porto/contracts';
import { ApiProperty } from '@nestjs/swagger';
import {
  Equals, IsEmail, IsEnum, IsInt, IsNotEmpty, IsString, Length, MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterAffiliateRequestDto {
  @ApiProperty({ example: 'Marina Ferraz' })
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome completo' })
  @MaxLength(255)
  @Transform(({ value }) => String(value).trim())
  fullName: string;

  @ApiProperty({ example: 'marina@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(255)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email: string;

  @ApiProperty({ example: '529.982.247-25' })
  @IsString()
  @Length(11, 14, { message: 'Informe um CPF válido' })
  cpf: string;

  @ApiProperty({ enum: PixKeyTypeEnum, example: PixKeyTypeEnum.EMAIL })
  @IsEnum(PixKeyTypeEnum, { message: 'Tipo de chave PIX inválido' })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty({ example: 'marina@email.com' })
  @IsString()
  @IsNotEmpty({ message: 'Informe a chave PIX' })
  @MaxLength(140)
  @Transform(({ value }) => String(value).trim())
  pixKey: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  termsVersionId: number;

  @ApiProperty({ example: true, description: 'Precisa ser true — o aceite é obrigatório (RF-03)' })
  @Equals(true, { message: 'É obrigatório aceitar os termos e a política de privacidade' })
  termsAccepted: boolean;
}
```

`apps/api/src/domain/affiliates/dtos/register-affiliate.response.dto.ts`:

```ts
import { AffiliateStatusEnum } from '@porto/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAffiliateResponseDto {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty({ enum: AffiliateStatusEnum, example: AffiliateStatusEnum.PENDING_APPROVAL })
  status: AffiliateStatusEnum;
}
```

- [ ] **Step 2: Escrever o teste do caso de uso — deve falhar**

`apps/api/src/modules/shared/affiliates/register-affiliate.use-case.spec.ts`:

```ts
import { AffiliateStatusEnum, MailTemplateEnum, PixKeyTypeEnum, UserTypeEnum } from '@porto/contracts';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { mailServiceMock } from '@Testing/mocks/services/mail.service.mock';
import { RegisterAffiliateUseCase } from './register-affiliate.use-case';

describe('RegisterAffiliateUseCase', () => {
  const currentTerms = { id: 1, version: '1.0-homolog' };

  const validInput = {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '529.982.247-25',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'marina@email.com',
    termsVersionId: 1,
    termsAccepted: true,
  };

  const setup = (overrides: Record<string, unknown> = {}) => {
    const users = { findByEmail: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const affiliates = { findByCpf: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const terms = { findCurrent: jest.fn().mockResolvedValue(currentTerms) };
    const history = { record: jest.fn().mockResolvedValue(undefined) };
    const mail = mailServiceMock();
    const transaction = { run: jest.fn(async (callback: () => Promise<unknown>) => callback()) };

    Object.assign(users, overrides.users ?? {});
    Object.assign(affiliates, overrides.affiliates ?? {});
    Object.assign(terms, overrides.terms ?? {});

    const savedUser = buildUser({ id: 10, email: validInput.email, type: UserTypeEnum.AFFILIATE });
    users.save.mockResolvedValue(savedUser);
    affiliates.save.mockResolvedValue(
      buildAffiliate({ id: 20, publicId: 'affiliate-uuid', user: savedUser, status: AffiliateStatusEnum.PENDING_APPROVAL }),
    );

    const useCase = new RegisterAffiliateUseCase(
      users as never, affiliates as never, terms as never,
      history as never, mail as never, transaction as never,
    );

    return { useCase, users, affiliates, terms, history, mail };
  };

  it('cria o afiliado com status pendente de aprovação', async () => {
    const { useCase } = setup();
    const result = await useCase.execute(validInput);
    expect(result).toEqual({ publicId: 'affiliate-uuid', status: AffiliateStatusEnum.PENDING_APPROVAL });
  });

  it('cria o usuário sem senha — a senha nasce só após a aprovação', async () => {
    const { useCase, users } = setup();
    await useCase.execute(validInput);
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: null, type: UserTypeEnum.AFFILIATE, role: null }),
    );
  });

  it('grava o CPF apenas com dígitos', async () => {
    const { useCase, affiliates } = setup();
    await useCase.execute(validInput);
    expect(affiliates.save).toHaveBeenCalledWith(expect.objectContaining({ cpf: '52998224725' }));
  });

  it('registra a transição inicial na trilha auditável', async () => {
    const { useCase, history } = setup();
    await useCase.execute(validInput);
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ fromStatus: null, toStatus: AffiliateStatusEnum.PENDING_APPROVAL, actorUserId: null }),
      expect.anything(),
    );
  });

  it('envia o e-mail de cadastro recebido', async () => {
    const { useCase, mail } = setup();
    await useCase.execute(validInput);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ template: MailTemplateEnum.REGISTRATION_RECEIVED, to: 'marina@email.com' }),
    );
  });

  it('recusa e-mail já cadastrado', async () => {
    const { useCase } = setup({ users: { findByEmail: jest.fn().mockResolvedValue(buildUser()) } });
    await expect(useCase.execute(validInput)).rejects.toThrow(ConflictException);
  });

  it('recusa CPF já cadastrado', async () => {
    const { useCase } = setup({ affiliates: { findByCpf: jest.fn().mockResolvedValue(buildAffiliate()) } });
    await expect(useCase.execute(validInput)).rejects.toThrow(ConflictException);
  });

  it('recusa CPF com dígito verificador inválido', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ ...validInput, cpf: '529.982.247-26' })).rejects.toThrow(UnprocessableEntityException);
  });

  it('recusa chave PIX do tipo CPF diferente do CPF informado', async () => {
    const { useCase } = setup();
    await expect(
      useCase.execute({ ...validInput, pixKeyType: PixKeyTypeEnum.CPF, pixKey: '111.444.777-35' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('aceita chave PIX do tipo CPF igual ao CPF informado', async () => {
    const { useCase } = setup();
    await expect(
      useCase.execute({ ...validInput, pixKeyType: PixKeyTypeEnum.CPF, pixKey: '529.982.247-25' }),
    ).resolves.toBeDefined();
  });

  it('recusa versão de termos que não é a vigente', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ ...validInput, termsVersionId: 99 })).rejects.toThrow(UnprocessableEntityException);
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- register-affiliate
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 4: Escrever o helper de transação**

`apps/api/src/infra/database/typeorm/transaction.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TransactionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  run<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(callback);
  }
}
```

Registre-o em `SharedModule` (`providers` e `exports`).

- [ ] **Step 5: Implementar o caso de uso**

`apps/api/src/modules/shared/affiliates/register-affiliate.use-case.ts`:

```ts
import { AffiliateStatusEnum, MailTemplateEnum, PixKeyTypeEnum, UserTypeEnum } from '@porto/contracts';
import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { RegisterAffiliateRequestDto } from '@Domain/affiliates/dtos/register-affiliate.request.dto';
import { RegisterAffiliateResponseDto } from '@Domain/affiliates/dtos/register-affiliate.response.dto';
import { isValidCpf, sanitizeCpf } from '@Domain/shared/utils/cpf.util';
import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';
import { UserRepository } from '@Domain/users/user.repository';
import { TransactionService } from '@Infra/database/typeorm/transaction.service';
import { MailService } from '@Infra/services/email/mail.service';

@Injectable()
export class RegisterAffiliateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly affiliates: AffiliateRepository,
    private readonly terms: TermsVersionRepository,
    private readonly history: AffiliateStatusHistoryRepository,
    private readonly mail: MailService,
    private readonly transaction: TransactionService,
  ) {}

  async execute(dto: RegisterAffiliateRequestDto): Promise<RegisterAffiliateResponseDto> {
    const cpf = sanitizeCpf(dto.cpf);

    if (!isValidCpf(cpf)) {
      throw new UnprocessableEntityException({ code: 'INVALID_CPF', message: 'CPF inválido' });
    }

    const currentTerms = await this.terms.findCurrent();
    if (!currentTerms || currentTerms.id !== dto.termsVersionId) {
      throw new UnprocessableEntityException({
        code: 'OUTDATED_TERMS',
        message: 'Os termos foram atualizados. Recarregue e aceite a versão vigente.',
      });
    }

    this.assertPixKeyMatchesType(dto.pixKeyType, dto.pixKey, cpf);

    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException({ code: 'EMAIL_ALREADY_REGISTERED', message: 'Este e-mail já está cadastrado' });
    }

    if (await this.affiliates.findByCpf(cpf)) {
      throw new ConflictException({ code: 'CPF_ALREADY_REGISTERED', message: 'Este CPF já está cadastrado' });
    }

    const affiliate = await this.transaction.run(async (manager) => {
      const user = await this.users.save({
        name: dto.fullName,
        email: dto.email,
        password: null,
        passwordSetAt: null,
        type: UserTypeEnum.AFFILIATE,
        role: null,
        isActive: true,
      });

      const created = await this.affiliates.save({
        userId: user.id,
        cpf,
        pixKeyType: dto.pixKeyType,
        pixKey: dto.pixKey,
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        termsVersionId: currentTerms.id,
        termsAcceptedAt: new Date(),
      });

      await this.history.record(
        {
          affiliateId: created.id,
          fromStatus: null,
          toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          actorUserId: null,
        },
        manager,
      );

      return created;
    });

    await this.mail.send({
      template: MailTemplateEnum.REGISTRATION_RECEIVED,
      to: dto.email,
      toName: dto.fullName,
      variables: { name: dto.fullName.split(' ')[0] },
    });

    return { publicId: affiliate.publicId, status: affiliate.status };
  }

  /** "A chave precisa estar no seu nome" — texto do layout da SIS-509. */
  private assertPixKeyMatchesType(type: PixKeyTypeEnum, key: string, cpf: string): void {
    if (type === PixKeyTypeEnum.CPF && sanitizeCpf(key) !== cpf) {
      throw new UnprocessableEntityException({
        code: 'PIX_KEY_MISMATCH',
        message: 'A chave PIX do tipo CPF precisa ser igual ao CPF informado',
      });
    }

    if (type === PixKeyTypeEnum.EMAIL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) {
      throw new UnprocessableEntityException({ code: 'PIX_KEY_INVALID', message: 'Chave PIX de e-mail inválida' });
    }

    if (type === PixKeyTypeEnum.PHONE && !/^\+?\d{10,14}$/.test(key.replace(/\D/g, ''))) {
      throw new UnprocessableEntityException({ code: 'PIX_KEY_INVALID', message: 'Chave PIX de telefone inválida' });
    }
  }
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
npm run test --workspace apps/api -- register-affiliate
```

Esperado: PASS, 11 testes.

- [ ] **Step 7: Escrever os controllers**

`apps/api/src/modules/mobile/terms/mobile-terms.controller.ts`:

```ts
import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTermsResponseDto } from '@Domain/terms/dtos/current-terms.response.dto';
import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';
import { Public } from '@Modules/shared/auth/decorators/public.decorator';
import { AffiliateGuard } from '@Modules/shared/auth/guards/affiliate.guard';

@ApiTags('mobile/terms')
@Controller('mobile/terms')
@UseGuards(AffiliateGuard)
export class MobileTermsController {
  constructor(private readonly terms: TermsVersionRepository) {}

  @Get('current')
  @Public()
  @ApiOkResponse({ type: CurrentTermsResponseDto })
  async current(): Promise<CurrentTermsResponseDto> {
    const terms = await this.terms.findCurrent();
    if (!terms) {
      throw new NotFoundException({ code: 'TERMS_NOT_PUBLISHED', message: 'Termos não publicados' });
    }
    return {
      id: terms.id,
      version: terms.version,
      contentUrl: terms.contentUrl,
      publishedAt: terms.publishedAt.toISOString(),
    };
  }
}
```

`apps/api/src/modules/mobile/affiliates/mobile-affiliate.controller.ts`:

```ts
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiConflictResponse, ApiCreatedResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { RegisterAffiliateRequestDto } from '@Domain/affiliates/dtos/register-affiliate.request.dto';
import { RegisterAffiliateResponseDto } from '@Domain/affiliates/dtos/register-affiliate.response.dto';
import { Public } from '@Modules/shared/auth/decorators/public.decorator';
import { AffiliateGuard } from '@Modules/shared/auth/guards/affiliate.guard';
import { RegisterAffiliateUseCase } from '@Modules/shared/affiliates/register-affiliate.use-case';

@ApiTags('mobile/affiliates')
@Controller('mobile/affiliates')
@UseGuards(AffiliateGuard)
export class MobileAffiliateController {
  constructor(private readonly registerAffiliate: RegisterAffiliateUseCase) {}

  @Post()
  @Public()
  @Throttle({ sensitive: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: RegisterAffiliateResponseDto })
  @ApiConflictResponse({ description: 'EMAIL_ALREADY_REGISTERED ou CPF_ALREADY_REGISTERED' })
  @ApiUnprocessableEntityResponse({ description: 'INVALID_CPF, PIX_KEY_MISMATCH, PIX_KEY_INVALID ou OUTDATED_TERMS' })
  register(@Body() dto: RegisterAffiliateRequestDto): Promise<RegisterAffiliateResponseDto> {
    return this.registerAffiliate.execute(dto);
  }
}
```

Registre ambos em `MobileModule`, junto com `RegisterAffiliateUseCase` em `providers`, e importe `AuthModule`.

- [ ] **Step 8: Escrever o e2e do cadastro**

`apps/api/test/mobile-registration.e2e-spec.ts` — mesmo boilerplate de `beforeAll` da Spec 06, com `TRUNCATE affiliate_status_history, affiliates, users RESTART IDENTITY CASCADE` no `beforeEach` e o seed de termos:

```ts
  const payload = {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '529.982.247-25',
    pixKeyType: 'EMAIL',
    pixKey: 'marina@email.com',
    termsVersionId: 1,
    termsAccepted: true,
  };

  it('devolve os termos vigentes sem autenticação', async () => {
    const response = await request(app.getHttpServer()).get('/v1/mobile/terms/current').expect(200);
    expect(response.body.version).toBe('1.0-homolog');
  });

  it('cria o cadastro com status pendente', async () => {
    const response = await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(payload).expect(201);
    expect(response.body).toEqual({ publicId: expect.any(String), status: 'PENDING_APPROVAL' });
  });

  it('recusa aceite de termos ausente', async () => {
    await request(app.getHttpServer())
      .post('/v1/mobile/affiliates')
      .send({ ...payload, termsAccepted: false })
      .expect(400);
  });

  it('recusa e-mail duplicado', async () => {
    await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(payload).expect(201);
    const response = await request(app.getHttpServer())
      .post('/v1/mobile/affiliates')
      .send({ ...payload, cpf: '111.444.777-35' })
      .expect(409);
    expect(response.body.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('não cria senha para o usuário do pré-cadastro', async () => {
    await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(payload).expect(201);
    const [row] = await dataSource.query('SELECT password FROM users WHERE email = $1', [payload.email]);
    expect(row.password).toBeNull();
  });
```

- [ ] **Step 9: Rodar tudo e commitar**

```bash
npm run typeorm:run --workspace apps/api && npm run seed --workspace apps/api
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
git add apps/api
git commit -m "feat(api): add affiliate pre-registration and current terms endpoint"
```
