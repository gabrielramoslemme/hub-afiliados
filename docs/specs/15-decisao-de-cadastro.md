# Spec 15 — Aprovar e reprovar afiliado

**Issue:** SIS-519 · **RF:** RF-07, RF-08, RF-10 · **Depende de:** 14, 11

**Entrega:** `POST /v1/admin/affiliates/:publicId/approve` e `.../reject`, cada um com trilha auditável, e-mail ao afiliado e — na aprovação — o link de definição de senha.

Esta é a task central da onda: é aqui que o RF-10 ("aprovação integralmente manual") vira código e que o evento `AffiliateApproved` nasce como ponto de extensão para o cupom (INT-01) na onda seguinte.

**Files:**
- Modify: `apps/api/package.json` (`@nestjs/event-emitter`)
- Create: `apps/api/src/domain/affiliates/events/affiliate-approved.event.ts`
- Create: `apps/api/src/domain/affiliates/dtos/reject-affiliate.request.dto.ts`
- Create: `apps/api/src/modules/admin/affiliates/approve-affiliate.use-case.ts`, `.../reject-affiliate.use-case.ts`
- Modify: `apps/api/src/modules/admin/affiliates/admin-affiliate.controller.ts`, `apps/api/src/app.module.ts`
- Test: `apps/api/src/modules/admin/affiliates/approve-affiliate.use-case.spec.ts`, `.../reject-affiliate.use-case.spec.ts`

**Interfaces:**
- Consumes: `AffiliateRepository`, `AffiliateStatusHistoryRepository`, `TransactionService`, `PasswordTokenService` (11), `MailService` (08), `AdminAffiliateService.findOrFail` (14).
- Produces:
  - `AffiliateApprovedEvent { affiliatePublicId: string; userPublicId: string; affiliateName: string; occurredAt: Date }` e a constante `AFFILIATE_APPROVED_EVENT = 'affiliate.approved'`.
  - `ApproveAffiliateUseCase.execute(publicId: string, actor: AuthenticatedUser): Promise<void>`.
  - `RejectAffiliateUseCase.execute(publicId: string, dto: RejectAffiliateRequestDto, actor: AuthenticatedUser): Promise<void>`.

---

- [ ] **Step 1: Adicionar o event emitter**

Em `apps/api/package.json`, `dependencies`: `"@nestjs/event-emitter": "^3.0.1"`. Em `app.module.ts`, importe `EventEmitterModule.forRoot()`.

```bash
npm install
```

- [ ] **Step 2: Escrever o evento e o DTO**

`apps/api/src/domain/affiliates/events/affiliate-approved.event.ts`:

```ts
export const AFFILIATE_APPROVED_EVENT = 'affiliate.approved';

/**
 * Ponto de extensão da onda 2: a criação do cupom exclusivo (INT-01, RF-11)
 * assina este evento. O caso de uso de aprovação não muda quando o cupom entrar.
 */
export class AffiliateApprovedEvent {
  constructor(
    public readonly affiliatePublicId: string,
    public readonly userPublicId: string,
    public readonly affiliateName: string,
    public readonly occurredAt: Date,
  ) {}
}
```

`apps/api/src/domain/affiliates/dtos/reject-affiliate.request.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class RejectAffiliateRequestDto {
  @ApiProperty({
    example: 'Perfil fora do público-alvo do programa.',
    description: 'Obrigatório: o RF-07 exige decisão com motivo registrado',
  })
  @IsString()
  @Length(10, 500, { message: 'Descreva o motivo com 10 a 500 caracteres' })
  @Transform(({ value }) => String(value).trim())
  reason: string;
}
```

> Os limites (10 a 500) são os mesmos do `rejectAffiliateSchema` em `@porto/contracts`. Se mudar um, mude o outro.

- [ ] **Step 3: Escrever o teste da aprovação — deve falhar**

`apps/api/src/modules/admin/affiliates/approve-affiliate.use-case.spec.ts`:

```ts
import { AffiliateStatusEnum, MailTemplateEnum, TokenPurposeEnum } from '@porto/contracts';
import { ConflictException } from '@nestjs/common';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { mailServiceMock } from '@Testing/mocks/services/mail.service.mock';
import { AFFILIATE_APPROVED_EVENT } from '@Domain/affiliates/events/affiliate-approved.event';
import { ApproveAffiliateUseCase } from './approve-affiliate.use-case';

describe('ApproveAffiliateUseCase', () => {
  const actor = { id: 99, publicId: 'admin-uuid', name: 'Analista Porto' };

  const setup = (status = AffiliateStatusEnum.PENDING_APPROVAL) => {
    const user = buildUser({ id: 7, name: 'Marina Ferraz', email: 'marina@email.com' });
    const affiliate = buildAffiliate({ id: 20, publicId: 'affiliate-uuid', user, status });

    const service = { findOrFail: jest.fn().mockResolvedValue(affiliate) };
    const affiliates = { save: jest.fn().mockResolvedValue({ ...affiliate, status: AffiliateStatusEnum.APPROVED }) };
    const history = { record: jest.fn().mockResolvedValue(undefined) };
    const transaction = { run: jest.fn(async (cb: (m: unknown) => Promise<unknown>) => cb({})) };
    const passwordToken = {
      issue: jest.fn().mockResolvedValue('plain-token'),
      buildLink: jest.fn().mockReturnValue('https://app.example/definir-senha?token=plain-token'),
    };
    const mail = mailServiceMock();
    const events = { emit: jest.fn() };

    return {
      useCase: new ApproveAffiliateUseCase(
        service as never, affiliates as never, history as never,
        transaction as never, passwordToken as never, mail as never, events as never,
      ),
      affiliates, history, passwordToken, mail, events, affiliate,
    };
  };

  it('muda o status para aprovado e registra quem decidiu', async () => {
    const { useCase, affiliates } = setup();
    await useCase.execute('affiliate-uuid', actor as never);
    expect(affiliates.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 20,
        status: AffiliateStatusEnum.APPROVED,
        approvedByUserId: 99,
        approvedAt: expect.any(Date),
      }),
    );
  });

  it('grava a transição na trilha, na mesma transação', async () => {
    const { useCase, history } = setup();
    await useCase.execute('affiliate-uuid', actor as never);
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({
        affiliateId: 20,
        fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        actorUserId: 99,
      }),
      expect.anything(),
    );
  });

  it('emite token de definição de senha', async () => {
    const { useCase, passwordToken } = setup();
    await useCase.execute('affiliate-uuid', actor as never);
    expect(passwordToken.issue).toHaveBeenCalledWith(expect.anything(), TokenPurposeEnum.SET_PASSWORD);
  });

  it('envia o e-mail de aprovação com o link', async () => {
    const { useCase, mail } = setup();
    await useCase.execute('affiliate-uuid', actor as never);
    expect(mail.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.REGISTRATION_APPROVED,
      to: 'marina@email.com',
      toName: 'Marina Ferraz',
      variables: { name: 'Marina', link: 'https://app.example/definir-senha?token=plain-token' },
    });
  });

  it('emite o evento de aprovação — ponto de extensão do cupom', async () => {
    const { useCase, events } = setup();
    await useCase.execute('affiliate-uuid', actor as never);
    expect(events.emit).toHaveBeenCalledWith(
      AFFILIATE_APPROVED_EVENT,
      expect.objectContaining({ affiliatePublicId: 'affiliate-uuid', affiliateName: 'Marina Ferraz' }),
    );
  });

  it('recusa aprovar quem já está aprovado', async () => {
    const { useCase } = setup(AffiliateStatusEnum.APPROVED);
    await expect(useCase.execute('affiliate-uuid', actor as never)).rejects.toThrow(ConflictException);
  });

  it('recusa aprovar quem já foi reprovado', async () => {
    const { useCase } = setup(AffiliateStatusEnum.REJECTED);
    await expect(useCase.execute('affiliate-uuid', actor as never)).rejects.toThrow(ConflictException);
  });

  it('não envia e-mail quando a decisão é recusada', async () => {
    const { useCase, mail } = setup(AffiliateStatusEnum.APPROVED);
    await expect(useCase.execute('affiliate-uuid', actor as never)).rejects.toBeDefined();
    expect(mail.send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Escrever o teste da reprovação — deve falhar**

`apps/api/src/modules/admin/affiliates/reject-affiliate.use-case.spec.ts` segue o mesmo molde, com estas asserções:

```ts
  it('muda o status para reprovado e grava o motivo', async () => {
    const { useCase, affiliates } = setup();
    await useCase.execute('affiliate-uuid', { reason: 'Perfil fora do público-alvo' }, actor as never);
    expect(affiliates.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 20,
        status: AffiliateStatusEnum.REJECTED,
        rejectionReason: 'Perfil fora do público-alvo',
      }),
    );
  });

  it('grava o motivo também na trilha', async () => {
    const { useCase, history } = setup();
    await useCase.execute('affiliate-uuid', { reason: 'Perfil fora do público-alvo' }, actor as never);
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: AffiliateStatusEnum.REJECTED,
        reason: 'Perfil fora do público-alvo',
        actorUserId: 99,
      }),
      expect.anything(),
    );
  });

  it('envia a devolutiva ao afiliado com o motivo', async () => {
    const { useCase, mail } = setup();
    await useCase.execute('affiliate-uuid', { reason: 'Perfil fora do público-alvo' }, actor as never);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: MailTemplateEnum.REGISTRATION_REJECTED,
        variables: expect.objectContaining({ reason: 'Perfil fora do público-alvo' }),
      }),
    );
  });

  it('não emite token de senha na reprovação', async () => {
    const { useCase, passwordToken } = setup();
    await useCase.execute('affiliate-uuid', { reason: 'Perfil fora do público-alvo' }, actor as never);
    expect(passwordToken.issue).not.toHaveBeenCalled();
  });

  it('recusa reprovar quem já teve decisão', async () => {
    const { useCase } = setup(AffiliateStatusEnum.APPROVED);
    await expect(
      useCase.execute('affiliate-uuid', { reason: 'Perfil fora do público-alvo' }, actor as never),
    ).rejects.toThrow(ConflictException);
  });
```

- [ ] **Step 5: Rodar e confirmar as falhas**

```bash
npm run test --workspace apps/api -- approve-affiliate reject-affiliate
```

Esperado: FAIL nos dois.

- [ ] **Step 6: Implementar a aprovação**

`apps/api/src/modules/admin/affiliates/approve-affiliate.use-case.ts`:

```ts
import { AffiliateStatusEnum, MailTemplateEnum, TokenPurposeEnum } from '@porto/contracts';
import { ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import {
  AFFILIATE_APPROVED_EVENT, AffiliateApprovedEvent,
} from '@Domain/affiliates/events/affiliate-approved.event';
import { TransactionService } from '@Infra/database/typeorm/transaction.service';
import { MailService } from '@Infra/services/email/mail.service';
import { AuthenticatedUser } from '@Modules/shared/auth/decorators/current-user.decorator';
import { PasswordTokenService } from '@Modules/shared/auth/password-token.service';
import { AdminAffiliateService } from './admin-affiliate.service';

@Injectable()
export class ApproveAffiliateUseCase {
  constructor(
    private readonly service: AdminAffiliateService,
    private readonly affiliates: AffiliateRepository,
    private readonly history: AffiliateStatusHistoryRepository,
    private readonly transaction: TransactionService,
    private readonly passwordToken: PasswordTokenService,
    private readonly mail: MailService,
    private readonly events: EventEmitter2,
  ) {}

  async execute(publicId: string, actor: AuthenticatedUser): Promise<void> {
    const affiliate = await this.service.findOrFail(publicId);

    if (affiliate.status !== AffiliateStatusEnum.PENDING_APPROVAL) {
      throw new ConflictException({
        code: 'DECISION_ALREADY_TAKEN',
        message: 'Este cadastro já teve uma decisão registrada',
      });
    }

    const approvedAt = new Date();

    await this.transaction.run(async (manager) => {
      await this.affiliates.save({
        id: affiliate.id,
        status: AffiliateStatusEnum.APPROVED,
        approvedAt,
        approvedByUserId: actor.id,
      });

      await this.history.record(
        {
          affiliateId: affiliate.id,
          fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          toStatus: AffiliateStatusEnum.APPROVED,
          actorUserId: actor.id,
        },
        manager,
      );
    });

    // Fora da transação: e-mail e evento não podem derrubar uma decisão já gravada.
    const token = await this.passwordToken.issue(affiliate.user, TokenPurposeEnum.SET_PASSWORD);

    await this.mail.send({
      template: MailTemplateEnum.REGISTRATION_APPROVED,
      to: affiliate.user.email,
      toName: affiliate.user.name,
      variables: {
        name: affiliate.user.name.split(' ')[0],
        link: this.passwordToken.buildLink(token, TokenPurposeEnum.SET_PASSWORD, 'app'),
      },
    });

    this.events.emit(
      AFFILIATE_APPROVED_EVENT,
      new AffiliateApprovedEvent(affiliate.publicId, affiliate.user.publicId, affiliate.user.name, approvedAt),
    );
  }
}
```

- [ ] **Step 7: Implementar a reprovação**

`apps/api/src/modules/admin/affiliates/reject-affiliate.use-case.ts` — mesma estrutura, sem token e sem evento:

```ts
import { AffiliateStatusEnum, MailTemplateEnum } from '@porto/contracts';
import { ConflictException, Injectable } from '@nestjs/common';
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { RejectAffiliateRequestDto } from '@Domain/affiliates/dtos/reject-affiliate.request.dto';
import { TransactionService } from '@Infra/database/typeorm/transaction.service';
import { MailService } from '@Infra/services/email/mail.service';
import { AuthenticatedUser } from '@Modules/shared/auth/decorators/current-user.decorator';
import { AdminAffiliateService } from './admin-affiliate.service';

@Injectable()
export class RejectAffiliateUseCase {
  constructor(
    private readonly service: AdminAffiliateService,
    private readonly affiliates: AffiliateRepository,
    private readonly history: AffiliateStatusHistoryRepository,
    private readonly transaction: TransactionService,
    private readonly mail: MailService,
  ) {}

  async execute(publicId: string, dto: RejectAffiliateRequestDto, actor: AuthenticatedUser): Promise<void> {
    const affiliate = await this.service.findOrFail(publicId);

    if (affiliate.status !== AffiliateStatusEnum.PENDING_APPROVAL) {
      throw new ConflictException({
        code: 'DECISION_ALREADY_TAKEN',
        message: 'Este cadastro já teve uma decisão registrada',
      });
    }

    await this.transaction.run(async (manager) => {
      await this.affiliates.save({
        id: affiliate.id,
        status: AffiliateStatusEnum.REJECTED,
        rejectionReason: dto.reason,
      });

      await this.history.record(
        {
          affiliateId: affiliate.id,
          fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          toStatus: AffiliateStatusEnum.REJECTED,
          reason: dto.reason,
          actorUserId: actor.id,
        },
        manager,
      );
    });

    await this.mail.send({
      template: MailTemplateEnum.REGISTRATION_REJECTED,
      to: affiliate.user.email,
      toName: affiliate.user.name,
      variables: { name: affiliate.user.name.split(' ')[0], reason: dto.reason },
    });
  }
}
```

- [ ] **Step 8: Rodar e confirmar que passam**

```bash
npm run test --workspace apps/api -- approve-affiliate reject-affiliate
```

Esperado: PASS, 13 testes.

- [ ] **Step 9: Expor as rotas**

Acrescente a `AdminAffiliateController`:

```ts
  @Post(':publicId/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Cadastro aprovado; e-mail de definição de senha enviado' })
  @ApiConflictResponse({ description: 'DECISION_ALREADY_TAKEN' })
  approve(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.approveAffiliate.execute(publicId, actor);
  }

  @Post(':publicId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Cadastro reprovado; devolutiva enviada' })
  @ApiConflictResponse({ description: 'DECISION_ALREADY_TAKEN' })
  reject(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() dto: RejectAffiliateRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.rejectAffiliate.execute(publicId, dto, actor);
  }
```

Registre os dois casos de uso em `AdminModule`.

- [ ] **Step 10: Verificar o ciclo manualmente**

Com `MAIL_PROVIDER=logger`, o link de senha aparece no log:

```bash
npm run dev --workspace apps/api
# 1. cadastre um afiliado
# 2. autentique como analista@porto.example
# 3. aprove:
curl -X POST localhost:3000/v1/admin/affiliates/<publicId>/approve \
  -H "Authorization: Bearer <token>" -i
```

Esperado: `204`, log com `template=REGISTRATION_APPROVED` e o link; segunda chamada devolve `409` com `DECISION_ALREADY_TAKEN`.

- [ ] **Step 11: Commit**

```bash
npm run test --workspace apps/api && npm run test:e2e --workspace apps/api
git add apps/api
git commit -m "feat(api): add affiliate approval and rejection with audit trail and notifications"
```
