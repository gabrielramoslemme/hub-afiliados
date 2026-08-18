# Spec 04 — `packages/contracts` e CI com publicação do OpenAPI

**Depende de:** 01, 02, 03 · **Entrega:** o painel importa enums e tipos de `@porto/contracts`; a CI roda lint, type-check, test e build nos dois apps e publica `openapi.json` como artefato.

> **Ferramental trocado depois desta spec.** O ESLint e o Prettier descritos aqui foram substituídos pelo Biome, e o pacote `@porto/eslint-config` deixou de existir. A configuração vigente é o `biome.jsonc` da raiz, e o lint é um comando de raiz (`npm run lint`), não uma task do Turbo. Esta spec fica como registro do que foi entregue na época.


Duas coisas juntas porque uma sem a outra não vale: o `contracts` é o que impede a API e o painel de divergirem, e a CI é o que garante que a divergência quebra o build em vez de aparecer em produção.

**Files:**
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/enums/index.ts`
- Create: `packages/contracts/src/dtos/affiliate.dto.ts`, `packages/contracts/src/dtos/auth.dto.ts`, `packages/contracts/src/dtos/pagination.dto.ts`
- Create: `apps/api/scripts/generate-openapi.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `apps/api/package.json` (script `openapi:generate`)

**Interfaces:**
- Consumes: `EnvironmentVariableService` e `AppModule` da Spec 02.
- Produces:
  - `@porto/contracts` exportando os enums do vocabulário compartilhado (README) e os tipos `AffiliateListItem`, `AffiliateDetail`, `AffiliateStatusHistoryItem`, `PaginatedResult<T>`, `AdminLoginRequest`, `AdminLoginResponse`, `RejectAffiliateRequest`, mais os schemas zod `adminLoginSchema` e `rejectAffiliateSchema`.
  - `npm run openapi:generate --workspace apps/api` gerando `apps/api/openapi.json` sem subir servidor.

---

- [ ] **Step 1: Criar o pacote `@porto/contracts`**

Substitui o stub criado na Spec 03.

`packages/contracts/package.json`:

```json
{
  "name": "@porto/contracts",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint \"src/**/*.ts\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": { "zod": "^4.1.12" },
  "devDependencies": { "@porto/eslint-config": "*", "@porto/tsconfig": "*", "typescript": "^5.7.3" }
}
```

`packages/contracts/tsconfig.json`:

```json
{
  "extends": "@porto/tsconfig/base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src/**/*"]
}
```

`packages/contracts/eslint.config.mjs`:

```js
import base from '@porto/eslint-config/base.mjs';
export default base;
```

- [ ] **Step 2: Escrever os enums compartilhados**

Estes são a fonte única. A API importa daqui — não redeclare enums em `apps/api`.

`packages/contracts/src/enums/index.ts`:

```ts
export enum UserTypeEnum {
  AFFILIATE = 'AFFILIATE',
  ADMIN = 'ADMIN',
}

export enum UserRoleEnum {
  PORTO_ANALYST = 'PORTO_ANALYST',
  PORTO_ADMIN = 'PORTO_ADMIN',
  MESA_ADMIN = 'MESA_ADMIN',
}

export enum AffiliateStatusEnum {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum PixKeyTypeEnum {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  CPF = 'CPF',
}

export enum TokenPurposeEnum {
  SET_PASSWORD = 'SET_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export enum AuthAudienceEnum {
  AFFILIATE = 'affiliate',
  ADMIN = 'admin',
}

export enum AuthErrorCodeEnum {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  REGISTRATION_UNDER_REVIEW = 'REGISTRATION_UNDER_REVIEW',
  REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
  PASSWORD_NOT_SET = 'PASSWORD_NOT_SET',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
}

export enum MailTemplateEnum {
  REGISTRATION_RECEIVED = 'REGISTRATION_RECEIVED',
  REGISTRATION_APPROVED = 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY',
}
```

- [ ] **Step 3: Escrever os DTOs de paginação e de autenticação**

`packages/contracts/src/dtos/pagination.dto.ts`:

```ts
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

`packages/contracts/src/dtos/auth.dto.ts`:

```ts
import { z } from 'zod';
import { UserRoleEnum } from '../enums';

export const adminLoginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

export type AdminLoginRequest = z.infer<typeof adminLoginSchema>;

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    publicId: string;
    name: string;
    email: string;
    role: UserRoleEnum;
    shouldChangePassword: boolean;
  };
}

export const forgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não conferem',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 4: Escrever os DTOs de afiliado**

`packages/contracts/src/dtos/affiliate.dto.ts`:

```ts
import { z } from 'zod';
import { AffiliateStatusEnum, PixKeyTypeEnum } from '../enums';

/** Item da fila de aprovação. CPF já vem mascarado da API. */
export interface AffiliateListItem {
  publicId: string;
  name: string;
  email: string;
  maskedCpf: string;
  status: AffiliateStatusEnum;
  createdAt: string;
}

export interface AffiliateDetail extends AffiliateListItem {
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  termsVersion: string;
  termsAcceptedAt: string;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectionReason: string | null;
}

export interface AffiliateStatusHistoryItem {
  fromStatus: AffiliateStatusEnum | null;
  toStatus: AffiliateStatusEnum;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

export const rejectAffiliateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Descreva o motivo com ao menos 10 caracteres')
    .max(500, 'O motivo deve ter no máximo 500 caracteres'),
});

export type RejectAffiliateRequest = z.infer<typeof rejectAffiliateSchema>;
```

`packages/contracts/src/index.ts`:

```ts
export * from './enums';
export * from './dtos/pagination.dto';
export * from './dtos/auth.dto';
export * from './dtos/affiliate.dto';
```

- [ ] **Step 5: Verificar que o painel consome o pacote**

Em `apps/painel/src/app/page.tsx`, troque o conteúdo por algo que force a resolução do import:

```tsx
import { AffiliateStatusEnum } from '@porto/contracts';

export default function HomePage(): JSX.Element {
  return (
    <main style={{ padding: 32 }}>
      <h1>Hub de Afiliados</h1>
      <p>Status possíveis: {Object.values(AffiliateStatusEnum).join(', ')}</p>
    </main>
  );
}
```

```bash
npm run type-check --workspace apps/painel
npm run build --workspace apps/painel
```

Esperado: build conclui e a página renderiza os quatro status.

- [ ] **Step 6: Escrever o gerador do OpenAPI**

Gera o arquivo sem abrir porta — é o que a CI usa.

`apps/api/scripts/generate-openapi.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('Hub de Afiliados — API')
    .setDescription('Canais: /v1/mobile (app do afiliado), /v1/admin (painel), /v1/webhooks')
    .setVersion(process.env.OPENAPI_VERSION ?? '1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const target = resolve(__dirname, '..', 'openapi.json');
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();
  process.stdout.write(`OpenAPI escrito em ${target}\n`);
}

void generate();
```

Adicione ao `apps/api/package.json`, em `scripts`:

```json
"openapi:generate": "ts-node -r tsconfig-paths/register scripts/generate-openapi.ts"
```

E ao `.gitignore` da raiz:

```
apps/api/openapi.json
```

O arquivo é artefato de build, não fonte.

- [ ] **Step 7: Rodar o gerador**

```bash
npm run openapi:generate --workspace apps/api
node -e "const d=require('./apps/api/openapi.json'); console.log(Object.keys(d.paths))"
```

Esperado: imprime `[ '/v1/health' ]`.

- [ ] **Step 8: Escrever o workflow de CI**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: porto
          POSTGRES_PASSWORD: porto
          POSTGRES_DB: hub_afiliados_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U porto" --health-interval 5s
          --health-timeout 5s --health-retries 10

    env:
      NODE_ENV: test
      DATABASE_URL: postgres://porto:porto@localhost:5432/hub_afiliados_test
      JWT_SECRET: ci-secret-with-at-least-32-characters-here
      APP_BASE_URL: http://localhost:3000
      PANEL_BASE_URL: http://localhost:3005
      NEXT_PUBLIC_API_BASE_URL: http://localhost:3000/v1

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci
      - run: npm run lint && npx turbo run type-check
      - run: npm run typeorm:run --workspace apps/api
      - run: npx turbo run test
      - run: npm run test:e2e --workspace apps/api
      - run: npx turbo run build

      - name: Gerar contrato OpenAPI
        run: npm run openapi:generate --workspace apps/api
        env:
          OPENAPI_VERSION: ${{ github.sha }}

      - name: Publicar contrato OpenAPI
        uses: actions/upload-artifact@v4
        with:
          name: openapi-${{ github.sha }}
          path: apps/api/openapi.json
          retention-days: 90
```

> O passo `typeorm:run` falha até a Spec 05 criar a primeira migration. Até lá, comente essa linha ou aceite o vermelho — as tasks 01 a 04 não têm banco.

- [ ] **Step 9: Verificar a CI localmente**

```bash
npm run lint && npx turbo run type-check build
```

Esperado: todos os pacotes passam.

- [ ] **Step 10: Commit**

```bash
git add packages/contracts apps/api apps/painel .github .gitignore
git commit -m "feat: add shared contracts package and ci with openapi artifact"
```
