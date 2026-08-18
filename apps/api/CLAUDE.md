# API — `@porto/api`

NestJS 11 + TypeORM 0.3 + PostgreSQL 16. Uma aplicação, três canais de entrada separados por audiência de JWT. Regras do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md).

## Três canais, uma API

| Módulo | Consumidor | Autenticação | Guard |
|---|---|---|---|
| `mobile` | App Flutter do afiliado | JWT com audiência `affiliate` | `AffiliateGuard` |
| `admin` | Painel da Porto e da Mesa | JWT com audiência `admin` | `AdminGuard`, com `@Roles(...)` por rota |
| `webhooks` | Sistemas externos | Assinatura própria, sem JWT | — |
| `health` | Monitoração | pública | `@Public()` |

Identidade unificada em `users`, perfil 1:1 em `affiliates`. **Esquecer de checar a audiência é escalação de privilégio.**

**Só o `/v1` é global** (`setGlobalPrefix`) — não há `RouterModule`. Estar dentro do `AdminModule` **não** prefixa `admin`: o canal vai no path, `@Controller('admin/affiliates')`. Esquecer publica a rota fora do canal, sem o guard de audiência.

## Camadas

| Pasta | O que mora | Depende de |
|---|---|---|
| `src/domain/<agregado>/` | repositórios, DTOs, filtros, eventos e utilitários do agregado | TypeORM e `@porto/contracts` |
| `src/infra/` | `config/`, `database/typeorm/`, `services/`, `shared/` (filtros) | nada de `modules/` |
| `src/modules/<canal>/` | controllers e use cases; `shared/` guarda o que dois canais usam | domain e infra |
| `src/testing/` | factories e mocks — fora do build (`tsconfig.build.json`) | — |

Aliases `@Domain/*` · `@Infra/*` · `@Modules/*` · `@Testing/*`, declarados em **três** lugares: `tsconfig.json`, `jest.config.ts` e `test/jest-e2e.json`. Alias novo exige editar os três, senão o unitário ou o e2e quebra com "Cannot find module".

## Onde cada coisa mora

| Coisa | Caminho |
|---|---|
| Entidade | `src/infra/database/typeorm/entities/<nome>.entity.ts` |
| Migration | `src/infra/database/typeorm/migrations/<timestamp>-<Nome>.ts` |
| Repositório | `src/domain/<agregado>/<nome>.repository.ts` |
| DTO de request/response | `src/domain/<agregado>/dtos/<nome>.request.dto.ts` |
| Use case usado por dois canais | `src/modules/shared/<agregado>/<nome>.use-case.ts` |
| Use case de um canal só | `src/modules/<canal>/<agregado>/<nome>.use-case.ts` |
| Controller | `src/modules/<canal>/<agregado>/<canal>-<agregado>.controller.ts` |
| Variável de ambiente | `src/infra/config/` |
| Factory e mock de teste | `src/testing/` |
| Teste unitário | ao lado do arquivo, `.spec.ts` |
| Teste de integração | `test/<assunto>.e2e-spec.ts` |
| Seed | `seeds/seed.ts` |

## Repositórios

Todo acesso ao banco fica aqui. **Use case nunca injeta `Repository<T>` do TypeORM.**

- `@Injectable()` com `@InjectRepository(Entity)` privado.
- Métodos devolvem `Promise<Entity | null>` sem lançar — quem decide 404 é o use case.
- Registrados e exportados pelo `SharedModule`; o canal só precisa importá-lo.
- Entidade nova entra em **três** arrays do `SharedModule`: `TypeOrmModule.forFeature`, `providers` e `exports`. Faltou um, é `Repository not found` só em runtime.

## Entidades

- Tabela e coluna em `snake_case` via `name:`; propriedade em `camelCase`.
- `id` serial PK interno **mais** `public_id` uuid `@Generated('uuid')` único — só o `public_id` sai da API.
- Timestamps `timestamptz` via `@CreateDateColumn` / `@UpdateDateColumn`. Soft delete (`@DeleteDateColumn`) só onde o modelo pede (`users`).
- Enum vem de `@porto/contracts` e é gravado como `varchar`. Não use o tipo `enum` do Postgres: adicionar valor viraria migration de schema.
- `email` é `citext` (case-insensitive), não `varchar`.

## Migrations

- `synchronize: false` sempre. Nenhum schema nasce de entidade.
- **O timestamp vem da CLI, nunca escrito à mão.**
- SQL escrito à mão em `queryRunner.query`, no estilo das existentes: índices nomeados `ix_<tabela>_<colunas>` e índice parcial onde a consulta é sempre filtrada (`WHERE "revoked_at" IS NULL`).
- `down()` sempre implementado, derrubando na ordem inversa.
- `typeorm:generate` não produz a migration final aqui (não expressa `citext` nem índice parcial): serve como **detector de drift** entre entidade e schema — o esperado é "No changes".

**Atenção: `ormconfig.ts` e o `DatabaseModule` são dois DataSources.** O `ormconfig.ts` é o do CLI (lê `.env` por `dotenv`, aponta para os `.ts`); o `DatabaseModule` é o da aplicação (lê o `EnvironmentVariableService`, aponta para `__dirname`). Mexeu em um, confira o outro — o sintoma de divergência é migration que roda no CLI e some em runtime.

## Configuração

Variável nova entra em **quatro** lugares, sempre os quatro:

1. `src/infra/config/env.validation.ts` — schema Joi. Ausente ou inválida derruba a aplicação na subida, de propósito.
2. `src/infra/config/environment-variable.service.ts` — getter tipado.
3. `.env.example` — com comentário quando o valor não for óbvio.
4. `.github/workflows/ci.yml`, bloco `env:` — quando for obrigatória.

**Nunca leia `process.env` fora do `EnvironmentVariableService`** — exceto em `ormconfig.ts`, `seeds/` e `scripts/`, que rodam fora do container de DI do Nest.

## Erros

O `HttpExceptionFilter` global normaliza toda resposta de erro:

```json
{ "statusCode": 403, "code": "REGISTRATION_UNDER_REVIEW", "message": "...", "path": "/v1/mobile/auth/login", "timestamp": "..." }
```

- Emitir: `throw new ForbiddenException({ code: AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW, message: 'Cadastro em análise.' })`.
- `code` vem de `AuthErrorCodeEnum` quando o cliente precisa distinguir o caso para escolher a mensagem; nas demais respostas é `null`.
- 5xx é logado com stack, 4xx não. **Não logue a exceção você mesmo** — o filtro já faz.
- O `ValidationPipe` global usa `whitelist`, `forbidNonWhitelisted` e `transform`: campo fora do DTO devolve 400 sozinho.

## Swagger

O `openapi.json` é o contrato do app Flutter — rota sem decorator vira contrato incompleto, o app não a enxerga e nenhum teste daqui acusa.

- Toda rota precisa de `@ApiTags`, decorator de resposta (`@ApiOkResponse`, `@ApiCreatedResponse`, …) e DTO de **classe** com `@ApiProperty`.
- DTO de resposta é classe em `src/domain/<agregado>/dtos/`, nunca a `interface` de `@porto/contracts` — o Swagger precisa do metadado em runtime. Os dois coexistem: a classe descreve, o tipo compartilhado tipa o painel.

## E-mail

`MailService.send` **nunca lança** — falha vira log e o fluxo segue. Deliberado: e-mail não enviado é incidente operacional; aprovação revertida por causa dele seria incidente de negócio. Não embrulhe em `try/catch`.

Provider por `MAIL_PROVIDER` (`logger` em dev e teste, `mailersend` fora). IDs de template vêm de variável de ambiente, nunca de código. Templates, gatilhos e variáveis em [`docs/EMAILS.md`](docs/EMAILS.md).

## Testes

- **Unitário** — `*.spec.ts` ao lado do arquivo, sem banco. Factories em `src/testing/factories/` (`buildUser`, `buildAdminUser`, `buildAffiliate`) e mocks em `src/testing/mocks/`. Obrigatório por caso de uso.
- **Integração** — `test/*.e2e-spec.ts`, Postgres real, `--runInBand`, compilando o `AppModule` inteiro. Isolamento por `TRUNCATE <tabelas> RESTART IDENTITY CASCADE` no `beforeEach`, `dataSource.destroy()` no `afterAll`.
- Descrição em inglês, pelo comportamento: `it('responds 200 with status ok')`.
- Objeto de teste reutilizável vira factory em `src/testing/`, não literal repetido.

## Atenção: `import type` quebra a injeção de dependência

O Nest resolve dependência pelo metadata `design:paramtypes`, que o `emitDecoratorMetadata` grava do tipo do parâmetro do construtor. `import type` apaga a referência em runtime e o metadata vira `[Function]`: a injeção falha, mas **lint, type-check, build e unitários passam**. O sintoma só aparece quando o container sobe.

```ts
import type { ConfigService } from '@nestjs/config';   // ERRADO
import { ConfigService } from '@nestjs/config';        // certo
```

Por isso `style/useImportType` está desligada para `apps/api` no `biome.jsonc` da raiz. Não religue, e nada de `import type` em arquivo com decorator. Conferir o emitido:

```bash
grep -o '__metadata("design:paramtypes".\{0,80\}' apps/api/dist/<caminho>.js
```

## Comandos

```bash
npm run dev --workspace apps/api                             # nest start --watch, porta 3000
npm run test --workspace apps/api                            # unitários
npm run test:e2e --workspace apps/api                        # integração, exige Postgres no ar
npm run type-check --workspace apps/api
npm run typeorm:create --workspace apps/api --name=X         # nova migration, timestamp da CLI
npm run typeorm:run --workspace apps/api                     # aplica as migrations
npm run typeorm:revert --workspace apps/api                  # reverte a última
npm run typeorm:generate --workspace apps/api --name=Drift   # detector de drift, espera "No changes"
npm run seed --workspace apps/api                            # termos vigentes + operadores
npm run openapi:generate --workspace apps/api                # gera apps/api/openapi.json
```

Swagger em `http://localhost:3000/v1/docs`.
