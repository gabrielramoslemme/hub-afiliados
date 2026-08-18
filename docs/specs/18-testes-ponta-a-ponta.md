# Spec 18 — E2E do ciclo completo

**Depende de:** 15, 12 · **Entrega:** os cinco cenários da seção 11 do spec rodando ponta a ponta, mais a publicação do contrato OpenAPI verificada na CI.

Cada teste aqui existe porque uma regressão nele quebra uma promessa feita ao afiliado ou à Porto. Não são testes de cobertura — são os contratos da onda.

**Files:**
- Create: `apps/api/test/helpers/e2e-app.ts`, `apps/api/test/helpers/mail-spy.ts`
- Create: `apps/api/test/cycle-approval.e2e-spec.ts`, `.../cycle-rejection.e2e-spec.ts`, `.../cycle-password-recovery.e2e-spec.ts`, `.../channel-isolation.e2e-spec.ts`
- Modify: `.github/workflows/ci.yml` (descomentar `typeorm:run`, adicionar `seed`)

**Interfaces:**
- Consumes: todas as rotas das Specs 09 a 15.
- Produces: `createE2eApp(): Promise<E2eContext>` com `{ app, dataSource, mailSpy, reset(), loginAsOperator(), registerAffiliate(overrides?) }` — reaproveitado por qualquer e2e futuro.

---

- [ ] **Step 1: Escrever o helper de aplicação**

`apps/api/test/helpers/mail-spy.ts` — captura o que foi enviado, para o teste ler o link:

```ts
import { MailTemplateEnum } from '@porto/contracts';
import { SendMailInput } from '../../src/infra/services/email/mail-provider.interface';

export class MailSpy {
  readonly sent: SendMailInput[] = [];

  async send(input: SendMailInput): Promise<void> {
    this.sent.push(input);
  }

  clear(): void {
    this.sent.length = 0;
  }

  lastOf(template: MailTemplateEnum): SendMailInput {
    const found = [...this.sent].reverse().find((item) => item.template === template);
    if (!found) throw new Error(`Nenhum e-mail do template ${template} foi enviado`);
    return found;
  }

  tokenFrom(template: MailTemplateEnum): string {
    const link = this.lastOf(template).variables.link;
    const token = new URL(link).searchParams.get('token');
    if (!token) throw new Error(`Link sem token: ${link}`);
    return token;
  }
}
```

`apps/api/test/helpers/e2e-app.ts`:

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/infra/shared/filters/http-exception.filter';
import { MAIL_PROVIDER } from '../../src/infra/services/email/mail-provider.interface';
import { MailSpy } from './mail-spy';

export interface E2eContext {
  app: INestApplication;
  dataSource: DataSource;
  mailSpy: MailSpy;
  reset(): Promise<void>;
  loginAsOperator(): Promise<string>;
  registerAffiliate(overrides?: Record<string, unknown>): Promise<{ publicId: string; email: string }>;
  close(): Promise<void>;
}

const OPERATOR = { email: 'analista@porto.example', password: 'MudarAgora!2026' };

export async function createE2eApp(): Promise<E2eContext> {
  const mailSpy = new MailSpy();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_PROVIDER)
    .useValue(mailSpy)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const dataSource = app.get(DataSource);

  const reset = async (): Promise<void> => {
    mailSpy.clear();
    await dataSource.query(
      `TRUNCATE affiliate_status_history, password_reset_tokens, refresh_tokens, affiliates, users RESTART IDENTITY CASCADE`,
    );
    await dataSource.query(
      `INSERT INTO users (name, email, password, password_set_at, type, role)
       VALUES ('Analista Porto', $1, $2, now(), 'ADMIN', 'PORTO_ANALYST')`,
      [OPERATOR.email, '$2b$10$D9CVzDf5nHXk9O0lJ2fO0.4fJmT0Z2Qd3G3xVm7QcYt8lRq6cSHqK'],
    );
  };

  const loginAsOperator = async (): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send(OPERATOR)
      .expect(200);
    return response.body.accessToken as string;
  };

  const registerAffiliate = async (
    overrides: Record<string, unknown> = {},
  ): Promise<{ publicId: string; email: string }> => {
    const payload = {
      fullName: 'Marina Ferraz',
      email: 'marina@email.com',
      cpf: '529.982.247-25',
      pixKeyType: 'EMAIL',
      pixKey: 'marina@email.com',
      termsVersionId: 1,
      termsAccepted: true,
      ...overrides,
    };
    const response = await request(app.getHttpServer())
      .post('/v1/mobile/affiliates')
      .send(payload)
      .expect(201);
    return { publicId: response.body.publicId as string, email: payload.email as string };
  };

  return {
    app, dataSource, mailSpy, reset, loginAsOperator, registerAffiliate,
    close: async () => { await app.close(); },
  };
}
```

> O hash embutido corresponde a `MudarAgora!2026`. Gere o seu com `node -e "console.log(require('bcrypt').hashSync('MudarAgora!2026', 10))"` e substitua — o valor acima é ilustrativo e **precisa** ser trocado pelo que sua execução gerar.
>
> O `TRUNCATE` preserva `terms_versions`, então a versão vigente do seed continua valendo entre os testes.

- [ ] **Step 2: Escrever o cenário 1 — aprovação**

`apps/api/test/cycle-approval.e2e-spec.ts`:

```ts
import { MailTemplateEnum } from '@porto/contracts';
import * as request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';

describe('Ciclo 1: cadastro → aprovação → senha → login', () => {
  let ctx: E2eContext;

  beforeAll(async () => { ctx = await createE2eApp(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx.close(); });

  it('leva o afiliado do cadastro público até o app, com trilha completa', async () => {
    const server = ctx.app.getHttpServer();

    // 1. Pré-cadastro, sem senha
    const { publicId } = await ctx.registerAffiliate();

    // 2. Antes da decisão, o login devolve "Cadastro em análise."
    const blocked = await request(server)
      .post('/v1/mobile/auth/login')
      .send({ email: 'marina@email.com', password: 'qualquer-coisa' })
      .expect(403);
    expect(blocked.body.code).toBe('REGISTRATION_UNDER_REVIEW');
    expect(blocked.body.message).toBe('Cadastro em análise.');

    // 3. O operador vê o cadastro na fila
    const token = await ctx.loginAsOperator();
    const queue = await request(server)
      .get('/v1/admin/affiliates?status=PENDING_APPROVAL')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(queue.body.total).toBe(1);
    expect(queue.body.data[0].maskedCpf).toBe('***.***.247-25');

    // 4. Aprovação
    await request(server)
      .post(`/v1/admin/affiliates/${publicId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    // 5. Aprovado, mas ainda sem senha
    const noPassword = await request(server)
      .post('/v1/mobile/auth/login')
      .send({ email: 'marina@email.com', password: 'qualquer-coisa' })
      .expect(403);
    expect(noPassword.body.code).toBe('PASSWORD_NOT_SET');

    // 6. Define a senha com o token do e-mail
    const setToken = ctx.mailSpy.tokenFrom(MailTemplateEnum.REGISTRATION_APPROVED);
    await request(server)
      .post('/v1/mobile/auth/password/set')
      .send({ token: setToken, password: 'SenhaSegura!2026' })
      .expect(204);

    // 7. Login funciona
    const session = await request(server)
      .post('/v1/mobile/auth/login')
      .send({ email: 'marina@email.com', password: 'SenhaSegura!2026' })
      .expect(200);
    expect(session.body.user.affiliateStatus).toBe('APPROVED');

    // 8. O afiliado lê o próprio cadastro
    const me = await request(server)
      .get('/v1/mobile/me')
      .set('Authorization', `Bearer ${session.body.accessToken}`)
      .expect(200);
    expect(me.body.cpf).toBe('52998224725');

    // 9. A trilha tem as duas transições, a segunda com autor
    const history = await request(server)
      .get(`/v1/admin/affiliates/${publicId}/history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(history.body).toHaveLength(2);
    expect(history.body[0]).toMatchObject({ toStatus: 'APPROVED', actorName: 'Analista Porto' });
    expect(history.body[1]).toMatchObject({ fromStatus: null, toStatus: 'PENDING_APPROVAL', actorName: null });
  });

  it('não permite usar o token de senha duas vezes', async () => {
    const server = ctx.app.getHttpServer();
    const { publicId } = await ctx.registerAffiliate();
    const token = await ctx.loginAsOperator();
    await request(server).post(`/v1/admin/affiliates/${publicId}/approve`).set('Authorization', `Bearer ${token}`).expect(204);

    const setToken = ctx.mailSpy.tokenFrom(MailTemplateEnum.REGISTRATION_APPROVED);
    await request(server).post('/v1/mobile/auth/password/set').send({ token: setToken, password: 'SenhaSegura!2026' }).expect(204);
    await request(server).post('/v1/mobile/auth/password/set').send({ token: setToken, password: 'OutraSenha!2026' }).expect(401);
  });

  it('recusa aprovar duas vezes', async () => {
    const server = ctx.app.getHttpServer();
    const { publicId } = await ctx.registerAffiliate();
    const token = await ctx.loginAsOperator();
    await request(server).post(`/v1/admin/affiliates/${publicId}/approve`).set('Authorization', `Bearer ${token}`).expect(204);
    const conflict = await request(server)
      .post(`/v1/admin/affiliates/${publicId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    expect(conflict.body.code).toBe('DECISION_ALREADY_TAKEN');
  });
});
```

- [ ] **Step 3: Escrever o cenário 2 — reprovação**

`apps/api/test/cycle-rejection.e2e-spec.ts`:

```ts
  it('reprova com motivo, devolve ao afiliado e bloqueia o login', async () => {
    const server = ctx.app.getHttpServer();
    const { publicId } = await ctx.registerAffiliate();
    const token = await ctx.loginAsOperator();

    await request(server)
      .post(`/v1/admin/affiliates/${publicId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Perfil fora do público-alvo do programa.' })
      .expect(204);

    const email = ctx.mailSpy.lastOf(MailTemplateEnum.REGISTRATION_REJECTED);
    expect(email.variables.reason).toBe('Perfil fora do público-alvo do programa.');

    const login = await request(server)
      .post('/v1/mobile/auth/login')
      .send({ email: 'marina@email.com', password: 'qualquer-coisa' })
      .expect(403);
    expect(login.body.code).toBe('REGISTRATION_REJECTED');

    const history = await request(server)
      .get(`/v1/admin/affiliates/${publicId}/history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(history.body[0].reason).toBe('Perfil fora do público-alvo do programa.');
  });

  it('exige motivo na reprovação', async () => {
    const server = ctx.app.getHttpServer();
    const { publicId } = await ctx.registerAffiliate();
    const token = await ctx.loginAsOperator();
    await request(server)
      .post(`/v1/admin/affiliates/${publicId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'curto' })
      .expect(400);
  });

  it('não envia e-mail de reprovação quando a validação falha', async () => {
    const server = ctx.app.getHttpServer();
    const { publicId } = await ctx.registerAffiliate();
    const token = await ctx.loginAsOperator();
    await request(server)
      .post(`/v1/admin/affiliates/${publicId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'curto' })
      .expect(400);
    expect(ctx.mailSpy.sent.filter((m) => m.template === MailTemplateEnum.REGISTRATION_REJECTED)).toHaveLength(0);
  });
```

- [ ] **Step 4: Escrever o cenário 3 — recuperação de senha**

`apps/api/test/cycle-password-recovery.e2e-spec.ts` — com um afiliado já aprovado e com senha:

```ts
  it('recupera a senha e derruba as sessões antigas', async () => {
    const server = ctx.app.getHttpServer();
    const oldSession = await approveAndSignIn(ctx, 'SenhaSegura!2026');

    await request(server)
      .post('/v1/mobile/auth/password/forgot')
      .send({ email: 'marina@email.com' })
      .expect(204);

    const resetToken = ctx.mailSpy.tokenFrom(MailTemplateEnum.PASSWORD_RECOVERY);
    await request(server)
      .post('/v1/mobile/auth/password/reset')
      .send({ token: resetToken, password: 'NovaSenha!2026' })
      .expect(204);

    await request(server)
      .post('/v1/mobile/auth/login')
      .send({ email: 'marina@email.com', password: 'SenhaSegura!2026' })
      .expect(401);

    await request(server)
      .post('/v1/mobile/auth/login')
      .send({ email: 'marina@email.com', password: 'NovaSenha!2026' })
      .expect(200);

    // O refresh token emitido antes da troca não vale mais
    await request(server)
      .post('/v1/mobile/auth/refresh')
      .send({ refreshToken: oldSession.refreshToken })
      .expect(401);
  });

  it('responde 204 para e-mail inexistente, sem enviar nada', async () => {
    await request(ctx.app.getHttpServer())
      .post('/v1/mobile/auth/password/forgot')
      .send({ email: 'ninguem@email.com' })
      .expect(204);
    expect(ctx.mailSpy.sent).toHaveLength(0);
  });

  it('rotaciona o refresh token — o antigo morre no uso', async () => {
    const server = ctx.app.getHttpServer();
    const session = await approveAndSignIn(ctx, 'SenhaSegura!2026');

    const renewed = await request(server)
      .post('/v1/mobile/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    expect(renewed.body.refreshToken).not.toBe(session.refreshToken);

    await request(server)
      .post('/v1/mobile/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });
```

Escreva `approveAndSignIn(ctx, password)` no próprio arquivo: cadastra, aprova como operador, lê o token do e-mail, define a senha e devolve o corpo do login.

- [ ] **Step 5: Escrever o cenário 4 — isolamento dos canais**

`apps/api/test/channel-isolation.e2e-spec.ts` — o teste que protege a decisão de identidade unificada:

```ts
  it('token de afiliado não acessa o painel', async () => {
    const session = await approveAndSignIn(ctx, 'SenhaSegura!2026');
    const response = await request(ctx.app.getHttpServer())
      .get('/v1/admin/affiliates')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(403);
    expect(response.body.code).toBe('WRONG_AUDIENCE');
  });

  it('token de operador não acessa o app', async () => {
    const token = await ctx.loginAsOperator();
    const response = await request(ctx.app.getHttpServer())
      .get('/v1/mobile/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(response.body.code).toBe('WRONG_AUDIENCE');
  });

  it('operador não consegue entrar pelo login do app', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/v1/mobile/auth/login')
      .send({ email: 'analista@porto.example', password: 'MudarAgora!2026' })
      .expect(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('afiliado não consegue entrar pelo login do painel', async () => {
    await approveAndSignIn(ctx, 'SenhaSegura!2026');
    const response = await request(ctx.app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send({ email: 'marina@email.com', password: 'SenhaSegura!2026' })
      .expect(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rota do painel sem token devolve 401', async () => {
    await request(ctx.app.getHttpServer()).get('/v1/admin/affiliates').expect(401);
  });

  it('a fila de aprovação nunca devolve um operador', async () => {
    await ctx.registerAffiliate();
    const token = await ctx.loginAsOperator();
    const response = await request(ctx.app.getHttpServer())
      .get('/v1/admin/affiliates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.total).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain('analista@porto.example');
  });
```

- [ ] **Step 6: Rodar a suíte completa**

```bash
docker compose up -d postgres
npm run typeorm:run --workspace apps/api
npm run seed --workspace apps/api
npm run test --workspace apps/api
npm run test:e2e --workspace apps/api
```

Esperado: todos os testes passam. Se o cenário 1 falhar no passo do token, verifique o hash de senha do operador no helper (Step 1).

- [ ] **Step 7: Fechar a CI**

Em `.github/workflows/ci.yml`, descomente o `typeorm:run` e acrescente o seed antes dos testes:

```yaml
      - run: npm run typeorm:run --workspace apps/api
      - run: npm run seed --workspace apps/api
        env:
          SEED_ADMIN_PASSWORD: MudarAgora!2026
      - run: npx turbo run test
      - run: npm run test:e2e --workspace apps/api
```

Abra uma PR e confirme que o job `verify` passa inteiro e que o artefato `openapi-<sha>` aparece na aba de artefatos.

- [ ] **Step 8: Verificar o contrato publicado**

```bash
npm run openapi:generate --workspace apps/api
node -e "
const d = require('./apps/api/openapi.json');
const mobile = Object.keys(d.paths).filter((p) => p.startsWith('/v1/mobile'));
const admin = Object.keys(d.paths).filter((p) => p.startsWith('/v1/admin'));
console.log('mobile:', mobile.length, mobile);
console.log('admin:', admin.length, admin);
"
```

Esperado: 9 rotas em `/v1/mobile` e 8 em `/v1/admin`. É esse arquivo que o time do app usa para gerar o cliente Dart — se uma rota do app não estiver aqui, ela não existe para quem consome.

- [ ] **Step 9: Commit**

```bash
git add apps/api .github
git commit -m "test(api): add end-to-end coverage for the full access and approval cycle"
```

---

## Fechamento da onda

Com esta task concluída, a onda 1 entrega:

- Monorepo com API e painel, CI verde e contrato OpenAPI publicado.
- Afiliado se cadastra, acompanha o status, cria senha após a aprovação, entra no app e recupera a senha.
- Operador da Porto entra no painel, busca e filtra a fila, analisa o cadastro completo, aprova ou reprova com motivo, e vê a trilha auditável.
- Nenhuma dependência da Porto foi necessária — as pendências P1 a P8 seguem abertas e bloqueiam apenas as ondas seguintes.

Próximo passo natural, quando a Porto liberar o contrato de cupom: assinar o evento `AffiliateApproved` com o `CouponProvider`. Seção 12 do spec lista o resto.
