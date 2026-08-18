# Spec 02 — Esqueleto da API

**Depende de:** 01 · **Entrega:** `npm run dev --workspace apps/api` sobe a API, `GET /v1/health` responde `200` e `/v1/docs` mostra o Swagger.

O esqueleto sai de `mesainc/sis-porto-vendeu-ganhou-api`. Copie **infraestrutura**, não domínio: nada de baterias, veículos, sucata, vendas, k2tec.

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/eslint.config.mjs`, `apps/api/jest.config.ts`, `apps/api/.env.example`, `apps/api/ormconfig.ts`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/src/infra/config/environment-variable.service.ts`, `apps/api/src/infra/config/env.validation.ts`, `apps/api/src/infra/config/config.module.ts`
- Create: `apps/api/src/infra/database/typeorm/typeorm.module.ts`, `apps/api/src/infra/database/typeorm/data-source.ts`
- Create: `apps/api/src/infra/shared/filters/http-exception.filter.ts`, `apps/api/src/infra/shared/interceptors/logging.interceptor.ts`
- Create: `apps/api/src/modules/health/health.controller.ts`, `apps/api/src/modules/health/health.module.ts`
- Create: `apps/api/src/modules/mobile/mobile.module.ts`, `apps/api/src/modules/admin/admin.module.ts`, `apps/api/src/modules/webhooks/webhook.module.ts`, `apps/api/src/modules/shared/shared.module.ts`
- Create: `docker-compose.yml` (raiz)
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Consumes: `@porto/tsconfig/nest.json`, `@porto/eslint-config`.
- Produces:
  - `EnvironmentVariableService` com getters tipados: `.databaseUrl`, `.nodeEnv`, `.port`, `.jwtSecret`, `.appBaseUrl`, `.panelBaseUrl`, `.isProduction`.
  - `MobileModule`, `AdminModule`, `WebhookModule`, `SharedModule` — pontos de registro para todas as tasks seguintes.
  - Prefixo global `/v1` e Swagger em `/v1/docs`.

---

- [ ] **Step 1: Criar o `package.json` da API**

`apps/api/package.json`:

```json
{
  "name": "@porto/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand",
    "typeorm:generate": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d ormconfig.ts migration:generate src/infra/database/typeorm/migrations/$npm_config_name",
    "typeorm:run": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d ormconfig.ts",
    "typeorm:revert": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d ormconfig.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/swagger": "^11.2.3",
    "@nestjs/typeorm": "^11.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "helmet": "^8.0.0",
    "joi": "^18.0.2",
    "pg": "^8.16.3",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "^0.3.28"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@porto/eslint-config": "*",
    "@porto/tsconfig": "*",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^22.19.3",
    "@types/supertest": "^6.0.2",
    "jest": "^30.0.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0"
  }
}
```

- [ ] **Step 2: Configurar TypeScript, Nest CLI, ESLint e Jest**

`apps/api/tsconfig.json`:

```json
{
  "extends": "@porto/tsconfig/nest.json",
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@Domain/*": ["src/domain/*"],
      "@Infra/*": ["src/infra/*"],
      "@Modules/*": ["src/modules/*"],
      "@Testing/*": ["src/testing/*"]
    }
  },
  "include": ["src/**/*", "test/**/*", "ormconfig.ts"]
}
```

`apps/api/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true, "plugins": ["@nestjs/swagger"] }
}
```

`apps/api/eslint.config.mjs`:

```js
import base from '@porto/eslint-config/base.mjs';
export default base;
```

`apps/api/jest.config.ts`:

```ts
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@Domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@Infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@Modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@Testing/(.*)$': '<rootDir>/src/testing/$1',
  },
};

export default config;
```

`apps/api/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.ts$": "ts-jest" },
  "moduleNameMapper": {
    "^@Domain/(.*)$": "<rootDir>/src/domain/$1",
    "^@Infra/(.*)$": "<rootDir>/src/infra/$1",
    "^@Modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@Testing/(.*)$": "<rootDir>/src/testing/$1"
  }
}
```

- [ ] **Step 3: Subir o Postgres local**

`docker-compose.yml` na raiz do monorepo:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: porto-hub-afiliados-db
    environment:
      POSTGRES_USER: porto
      POSTGRES_PASSWORD: porto
      POSTGRES_DB: hub_afiliados
    ports: ['5432:5432']
    volumes: ['porto-hub-afiliados-pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U porto -d hub_afiliados']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  porto-hub-afiliados-pgdata:
```

```bash
docker compose up -d postgres
docker compose ps
```

Esperado: container `porto-hub-afiliados-db` com status `healthy`.

- [ ] **Step 4: Escrever a validação de ambiente e o serviço de variáveis**

`apps/api/.env.example`:

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://porto:porto@localhost:5432/hub_afiliados
JWT_SECRET=change-me-in-every-environment
APP_BASE_URL=https://afiliados.porto.example
PANEL_BASE_URL=http://localhost:3005
```

`apps/api/src/infra/config/env.validation.ts`:

```ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  JWT_SECRET: Joi.string().min(32).required(),
  APP_BASE_URL: Joi.string().uri().required(),
  PANEL_BASE_URL: Joi.string().uri().required(),
});
```

`apps/api/src/infra/config/environment-variable.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentVariableService {
  constructor(private readonly config: ConfigService) {}

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return value;
  }

  get nodeEnv(): string { return this.required('NODE_ENV'); }
  get isProduction(): boolean { return this.nodeEnv === 'production'; }
  get port(): number { return Number(this.config.get('PORT') ?? 3000); }
  get databaseUrl(): string { return this.required('DATABASE_URL'); }
  get jwtSecret(): string { return this.required('JWT_SECRET'); }
  get appBaseUrl(): string { return this.required('APP_BASE_URL'); }
  get panelBaseUrl(): string { return this.required('PANEL_BASE_URL'); }
}
```

`apps/api/src/infra/config/config.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { EnvironmentVariableService } from './environment-variable.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
  providers: [EnvironmentVariableService],
  exports: [EnvironmentVariableService],
})
export class AppConfigModule {}
```

- [ ] **Step 5: Escrever o teste e2e do health check — ele deve falhar**

`apps/api/test/health.e2e-spec.ts`:

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('responde 200 com status ok', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', uptime: expect.any(Number) });
  });
});
```

- [ ] **Step 6: Rodar o teste e confirmar a falha**

```bash
npm run test:e2e --workspace apps/api
```

Esperado: FAIL — `Cannot find module '../src/app.module'`.

- [ ] **Step 7: Implementar o health, os módulos de canal e o `app.module`**

`apps/api/src/modules/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'Aplicação no ar' })
  check(): { status: string; uptime: number } {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }
}
```

`apps/api/src/modules/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

Os quatro módulos de canal nascem vazios. Cada task seguinte registra o seu controller no módulo correspondente.

`apps/api/src/modules/shared/shared.module.ts`:

```ts
import { Module } from '@nestjs/common';

@Module({})
export class SharedModule {}
```

`apps/api/src/modules/mobile/mobile.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SharedModule } from '@Modules/shared/shared.module';

@Module({ imports: [SharedModule] })
export class MobileModule {}
```

`apps/api/src/modules/admin/admin.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SharedModule } from '@Modules/shared/shared.module';

@Module({ imports: [SharedModule] })
export class AdminModule {}
```

`apps/api/src/modules/webhooks/webhook.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SharedModule } from '@Modules/shared/shared.module';

@Module({ imports: [SharedModule] })
export class WebhookModule {}
```

`apps/api/src/infra/database/typeorm/typeorm.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvironmentVariableService],
      useFactory: (env: EnvironmentVariableService) => ({
        type: 'postgres' as const,
        url: env.databaseUrl,
        entities: [`${__dirname}/entities/*.entity{.ts,.js}`],
        migrations: [`${__dirname}/migrations/*{.ts,.js}`],
        synchronize: false,
        migrationsRun: false,
        logging: !env.isProduction ? ['error', 'warn'] : ['error'],
      }),
    }),
  ],
})
export class DatabaseModule {}
```

`apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from '@Infra/config/config.module';
import { DatabaseModule } from '@Infra/database/typeorm/typeorm.module';
import { AdminModule } from '@Modules/admin/admin.module';
import { HealthModule } from '@Modules/health/health.module';
import { MobileModule } from '@Modules/mobile/mobile.module';
import { WebhookModule } from '@Modules/webhooks/webhook.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, MobileModule, AdminModule, WebhookModule],
})
export class AppModule {}
```

- [ ] **Step 8: Escrever o `main.ts` com prefixo, Swagger e filtro de exceção**

`apps/api/src/infra/shared/filters/http-exception.filter.ts` — normaliza toda resposta de erro para o formato que o app e o painel consomem:

```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : { message: 'Erro interno' };
    const body = typeof payload === 'string' ? { message: payload } : (payload as Record<string, unknown>);

    if (status >= 500) this.logger.error(`${request.method} ${request.url}`, (exception as Error)?.stack);

    response.status(status).json({
      statusCode: status,
      code: body.code ?? null,
      message: body.message ?? 'Erro',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

`apps/api/src/main.ts`:

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { HttpExceptionFilter } from '@Infra/shared/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const env = app.get(EnvironmentVariableService);

  app.use(helmet());
  app.enableCors({ origin: [env.panelBaseUrl], credentials: true });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Hub de Afiliados — API')
    .setDescription('Canais: /v1/mobile (app do afiliado), /v1/admin (painel), /v1/webhooks')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('v1/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(env.port);
}

void bootstrap();
```

- [ ] **Step 9: Rodar o teste e confirmar que passa**

```bash
cp apps/api/.env.example apps/api/.env
npm run test:e2e --workspace apps/api
```

Esperado: PASS, 1 teste.

- [ ] **Step 10: Subir a API e conferir o Swagger**

```bash
npm run dev --workspace apps/api
```

Acesse `http://localhost:3000/v1/docs`. Esperado: página do Swagger com a tag `health`.

- [ ] **Step 11: Commit**

```bash
git add apps/api docker-compose.yml
git commit -m "feat(api): scaffold nest application with health check and swagger"
```
