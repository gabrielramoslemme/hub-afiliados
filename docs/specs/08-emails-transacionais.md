# Spec 08 — E-mail transacional

**Depende de:** 02 · **Entrega:** `MailService` com os quatro templates, adaptador MailerSend em produção e adaptador de log em desenvolvimento, com falha isolada.

Regra de ouro desta task: **falha de e-mail nunca desfaz uma decisão de negócio.** Uma aprovação registrada com e-mail que não saiu é recuperável; uma aprovação revertida porque o MailerSend caiu não é.

**Files:**
- Modify: `apps/api/package.json` (`mailersend`)
- Create: `apps/api/src/infra/services/email/mail.service.ts`, `.../mailersend.provider.ts`, `.../logger-mail.provider.ts`, `.../mail-provider.interface.ts`, `.../mail.module.ts`
- Create: `apps/api/src/infra/services/email/templates/mail-template.config.ts`
- Modify: `apps/api/src/infra/config/env.validation.ts`, `.../environment-variable.service.ts`, `apps/api/.env.example`, `apps/api/src/app.module.ts`
- Create: `apps/api/src/testing/mocks/services/mail.service.mock.ts`
- Test: `apps/api/src/infra/services/email/mail.service.spec.ts`

**Interfaces:**
- Consumes: `EnvironmentVariableService` (Spec 02); `MailTemplateEnum` de `@porto/contracts`.
- Produces:
  - `MailService.send(input: SendMailInput): Promise<void>` — nunca lança.
  - `SendMailInput = { template: MailTemplateEnum; to: string; toName: string; variables: Record<string, string> }`.
  - `mailServiceMock` para as tasks 09, 11 e 15.

---

- [ ] **Step 1: Adicionar a dependência e as variáveis**

Em `apps/api/package.json`, `dependencies`: `"mailersend": "^2.6.0"`.

Em `env.validation.ts`:

```ts
  MAIL_PROVIDER: Joi.string().valid('mailersend', 'logger').default('logger'),
  MAILERSEND_API_KEY: Joi.string().allow('').default(''),
  MAILERSEND_FROM_EMAIL: Joi.string().email().default('nao-responda@afiliados.porto.example'),
  MAILERSEND_FROM_NAME: Joi.string().default('Hub de Afiliados'),
  MAILERSEND_TEMPLATE_REGISTRATION_RECEIVED: Joi.string().allow('').default(''),
  MAILERSEND_TEMPLATE_REGISTRATION_APPROVED: Joi.string().allow('').default(''),
  MAILERSEND_TEMPLATE_REGISTRATION_REJECTED: Joi.string().allow('').default(''),
  MAILERSEND_TEMPLATE_PASSWORD_RECOVERY: Joi.string().allow('').default(''),
```

Getters correspondentes em `EnvironmentVariableService`:

```ts
  get mailProvider(): 'mailersend' | 'logger' {
    return (this.config.get<string>('MAIL_PROVIDER') ?? 'logger') as 'mailersend' | 'logger';
  }
  get mailerSendApiKey(): string { return this.config.get<string>('MAILERSEND_API_KEY') ?? ''; }
  get mailFromEmail(): string { return this.required('MAILERSEND_FROM_EMAIL'); }
  get mailFromName(): string { return this.required('MAILERSEND_FROM_NAME'); }
  mailTemplateId(key: string): string { return this.config.get<string>(key) ?? ''; }
```

E as chaves em `.env.example`, com `MAIL_PROVIDER=logger` no padrão de desenvolvimento.

```bash
npm install
```

- [ ] **Step 2: Escrever o teste do `MailService` — deve falhar**

O comportamento crítico é o isolamento da falha.

`apps/api/src/infra/services/email/mail.service.spec.ts`:

```ts
import { MailTemplateEnum } from '@porto/contracts';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailProvider } from './mail-provider.interface';

describe('MailService', () => {
  const input = {
    template: MailTemplateEnum.REGISTRATION_APPROVED,
    to: 'marina@example.com',
    toName: 'Marina Ferraz',
    variables: { name: 'Marina', link: 'https://app.example/definir-senha?token=abc' },
  };

  it('delega o envio ao provider configurado', async () => {
    const provider: MailProvider = { send: jest.fn().mockResolvedValue(undefined) };
    await new MailService(provider).send(input);
    expect(provider.send).toHaveBeenCalledWith(input);
  });

  it('não propaga erro quando o provider falha', async () => {
    const provider: MailProvider = { send: jest.fn().mockRejectedValue(new Error('MailerSend fora do ar')) };
    const service = new MailService(provider);
    await expect(service.send(input)).resolves.toBeUndefined();
  });

  it('registra o erro sem expor o destinatário', async () => {
    const provider: MailProvider = { send: jest.fn().mockRejectedValue(new Error('boom')) };
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await new MailService(provider).send(input);

    const logged = spy.mock.calls[0]?.[0] as string;
    expect(logged).toContain(MailTemplateEnum.REGISTRATION_APPROVED);
    expect(logged).not.toContain('marina@example.com');
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

```bash
npm run test --workspace apps/api -- mail.service
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar a interface e o serviço**

`apps/api/src/infra/services/email/mail-provider.interface.ts`:

```ts
import { MailTemplateEnum } from '@porto/contracts';

export interface SendMailInput {
  template: MailTemplateEnum;
  to: string;
  toName: string;
  variables: Record<string, string>;
}

export interface MailProvider {
  send(input: SendMailInput): Promise<void>;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');
```

`apps/api/src/infra/services/email/mail.service.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAIL_PROVIDER, MailProvider, SendMailInput } from './mail-provider.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  /**
   * Nunca lança. Um e-mail que não saiu é um incidente operacional;
   * uma aprovação revertida por causa dele seria um incidente de negócio.
   */
  async send(input: SendMailInput): Promise<void> {
    try {
      await this.provider.send(input);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail do template ${input.template}`,
        (error as Error)?.stack,
      );
    }
  }
}
```

> O destinatário fica fora do log de propósito: e-mail é dado pessoal, e a seção 10 do spec proíbe PII em log.

- [ ] **Step 5: Implementar os dois providers**

`apps/api/src/infra/services/email/templates/mail-template.config.ts`:

```ts
import { MailTemplateEnum } from '@porto/contracts';

export const MAIL_TEMPLATE_ENV_KEY: Record<MailTemplateEnum, string> = {
  [MailTemplateEnum.REGISTRATION_RECEIVED]: 'MAILERSEND_TEMPLATE_REGISTRATION_RECEIVED',
  [MailTemplateEnum.REGISTRATION_APPROVED]: 'MAILERSEND_TEMPLATE_REGISTRATION_APPROVED',
  [MailTemplateEnum.REGISTRATION_REJECTED]: 'MAILERSEND_TEMPLATE_REGISTRATION_REJECTED',
  [MailTemplateEnum.PASSWORD_RECOVERY]: 'MAILERSEND_TEMPLATE_PASSWORD_RECOVERY',
};

export const MAIL_SUBJECT: Record<MailTemplateEnum, string> = {
  [MailTemplateEnum.REGISTRATION_RECEIVED]: 'Recebemos seu cadastro no Hub de Afiliados',
  [MailTemplateEnum.REGISTRATION_APPROVED]: 'Cadastro aprovado — crie sua senha',
  [MailTemplateEnum.REGISTRATION_REJECTED]: 'Sobre o seu cadastro no Hub de Afiliados',
  [MailTemplateEnum.PASSWORD_RECOVERY]: 'Recuperação de senha',
};
```

`apps/api/src/infra/services/email/logger-mail.provider.ts` — usado em desenvolvimento e teste; imprime o link em vez de enviar:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { MailProvider, SendMailInput } from './mail-provider.interface';

@Injectable()
export class LoggerMailProvider implements MailProvider {
  private readonly logger = new Logger(LoggerMailProvider.name);

  async send(input: SendMailInput): Promise<void> {
    this.logger.log(`[email simulado] template=${input.template} variáveis=${JSON.stringify(input.variables)}`);
    return Promise.resolve();
  }
}
```

`apps/api/src/infra/services/email/mailersend.provider.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { MailProvider, SendMailInput } from './mail-provider.interface';
import { MAIL_SUBJECT, MAIL_TEMPLATE_ENV_KEY } from './templates/mail-template.config';

@Injectable()
export class MailerSendProvider implements MailProvider {
  private readonly client: MailerSend;

  constructor(private readonly env: EnvironmentVariableService) {
    this.client = new MailerSend({ apiKey: this.env.mailerSendApiKey });
  }

  async send(input: SendMailInput): Promise<void> {
    const templateId = this.env.mailTemplateId(MAIL_TEMPLATE_ENV_KEY[input.template]);
    if (!templateId) throw new Error(`Template não configurado: ${input.template}`);

    const params = new EmailParams()
      .setFrom(new Sender(this.env.mailFromEmail, this.env.mailFromName))
      .setTo([new Recipient(input.to, input.toName)])
      .setSubject(MAIL_SUBJECT[input.template])
      .setTemplateId(templateId)
      .setPersonalization([{ email: input.to, data: input.variables }]);

    await this.client.email.send(params);
  }
}
```

`apps/api/src/infra/services/email/mail.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { LoggerMailProvider } from './logger-mail.provider';
import { MAIL_PROVIDER } from './mail-provider.interface';
import { MailerSendProvider } from './mailersend.provider';
import { MailService } from './mail.service';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [EnvironmentVariableService],
      useFactory: (env: EnvironmentVariableService) =>
        env.mailProvider === 'mailersend' ? new MailerSendProvider(env) : new LoggerMailProvider(),
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
```

Registre `MailModule` em `apps/api/src/app.module.ts`.

- [ ] **Step 6: Rodar e confirmar que passa**

```bash
npm run test --workspace apps/api -- mail.service
```

Esperado: PASS, 3 testes.

- [ ] **Step 7: Escrever o mock para as tasks seguintes**

`apps/api/src/testing/mocks/services/mail.service.mock.ts`:

```ts
import { MailService } from '@Infra/services/email/mail.service';

export const mailServiceMock = (): jest.Mocked<Pick<MailService, 'send'>> => ({
  send: jest.fn().mockResolvedValue(undefined),
});
```

- [ ] **Step 8: Documentar os templates**

Crie `apps/api/docs/EMAILS.md`:

````markdown
# E-mails transacionais

Provider selecionado por `MAIL_PROVIDER`: `logger` em desenvolvimento e teste,
`mailersend` em homologação e produção.

| Template | Gatilho | Variáveis |
|---|---|---|
| `REGISTRATION_RECEIVED` | Pré-cadastro concluído | `name` |
| `REGISTRATION_APPROVED` | Operador aprova o cadastro | `name`, `link` (definir senha, 48h) |
| `REGISTRATION_REJECTED` | Operador reprova o cadastro | `name`, `reason` |
| `PASSWORD_RECOVERY` | Pedido de recuperação | `name`, `link` (2h) |

Os IDs de template do MailerSend vêm por variável de ambiente
(`MAILERSEND_TEMPLATE_*`) — nenhum ID fica em código.

`MailService.send` nunca lança. Falha de envio vira log de erro, e o fluxo de
negócio segue. Reenvio é operação manual pelo painel (backlog).
````

- [ ] **Step 9: Commit**

```bash
npm run test --workspace apps/api
git add apps/api
git commit -m "feat(api): add transactional email service with mailersend and logger providers"
```
