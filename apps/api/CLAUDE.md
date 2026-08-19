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
| `src/domain/<agregado>/` | contratos de repositório, tipos do agregado, DTOs, filtros, eventos e utilitários | só `@porto/contracts` |
| `src/infra/` | `config/`, `database/typeorm/` (entidades, adapters, migrations), `services/`, `shared/` (filtros) | domain; nada de `modules/` |
| `src/modules/<canal>/` | controllers e use cases; `shared/` guarda o que dois canais usam | domain e infra |
| `src/testing/` | factories e mocks — fora do build (`tsconfig.build.json`) | — |

Aliases `@Domain/*` · `@Infra/*` · `@Modules/*` · `@Testing/*`, declarados em **três** lugares: `tsconfig.json`, `jest.config.ts` e `test/jest-e2e.json`. Alias novo exige editar os três, senão o unitário ou o e2e quebra com "Cannot find module".

## Onde cada coisa mora

| Coisa | Caminho |
|---|---|
| Tipo do agregado | `src/domain/<agregado>/<nome>.entity.ts` (interface) |
| Contrato de repositório | `src/domain/<agregado>/<nome>.repository.ts` (interface + `Symbol`) |
| Entidade TypeORM | `src/infra/database/typeorm/entities/<nome>.typeorm-entity.ts` |
| Adapter do repositório | `src/infra/database/typeorm/repositories/<nome>.typeorm-repository.ts` |
| Migration | `src/infra/database/typeorm/migrations/<timestamp>-<Nome>.ts` |
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

Contrato no domínio, implementação em infra. **Use case nunca injeta `Repository<T>` do TypeORM nem a classe do adapter — só o contrato, pelo token.**

- O contrato é uma `interface` em `src/domain/<agregado>/<nome>.repository.ts`, com o `Symbol` no mesmo arquivo (`export const USER_REPOSITORY = Symbol('USER_REPOSITORY')`). A interface some na compilação; o `Symbol` é o que o Nest resolve em runtime, e mantê-los juntos impede que o par se separe.
- O adapter é `@Injectable()` em `src/infra/database/typeorm/repositories/<nome>.typeorm-repository.ts`, declara `implements <Contrato>` e é o **único** lugar com `@InjectRepository`.
- Métodos devolvem `Promise<T | null>` sem lançar — quem decide 404 é o use case.
- **O tipo de retorno diz quais relações vêm carregadas:** `AffiliateEntity` (só escalares), `AffiliateWithUser`, `AffiliateDetail`. Prometer no tipo uma relação que o adapter não carregou é `undefined` em produção sem o compilador reclamar.
- **Escrita que precisa ser atômica vira método do agregado** (`changeStatus`), com a transação inteira dentro do adapter. Nenhum `EntityManager` atravessa o contrato.
- Injeção sempre pelo token:
  ```ts
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
  ```
  **Esquecer o `@Inject` passa em lint, type-check e build** e falha quando o container sobe.
- Repositório novo entra em **dois** lugares do `SharedModule`: `TypeOrmModule.forFeature` (a entidade) e a lista `REPOSITORIES` (o par token/adapter). O `exports` é derivado dela, então não há terceiro array para esquecer.
- `biome check` falha se `src/domain/**` importar `typeorm`, `@nestjs/typeorm`, `@Infra/*` ou `@Modules/*`.

## Entidades

- Arquivo `<nome>.typeorm-entity.ts`, classe `<Nome>TypeormEntity`, declarando `implements <TipoDoDominio>` — é o compilador cobrando que a tabela atenda o contrato.
- **Os dois DataSources encontram as entidades por esse sufixo** (`typeorm.module.ts` e `ormconfig.ts`). Renomear arquivo sem trocar os dois globs derruba a aplicação na subida.
- Tabela e coluna em `snake_case` via `name:`; propriedade em `camelCase`.
- `id` serial PK interno **mais** `public_id` uuid `@Generated('uuid')` único — só o `public_id` sai da API.
- Timestamps `timestamptz` via `@CreateDateColumn` / `@UpdateDateColumn`. Soft delete (`@DeleteDateColumn`) só onde o modelo pede (`users`).
- Enum vem de `@porto/contracts` e é gravado como `varchar`. Não use o tipo `enum` do Postgres: adicionar valor viraria migration de schema.
- `email` é `citext` (case-insensitive), não `varchar`.
- Índice, `CHECK` e nome de FK do schema são declarados aqui também — ver *Migrations*.

## Migrations

- `synchronize: false` sempre. Nenhum schema nasce de entidade.
- **O timestamp vem da CLI, nunca escrito à mão.**
- SQL escrito à mão em `queryRunner.query`, no estilo das existentes: índices nomeados `ix_<tabela>_<colunas>` e índice parcial onde a consulta é sempre filtrada (`WHERE "revoked_at" IS NULL`).
- `down()` sempre implementado, derrubando na ordem inversa.
- **O que a migration cria, a entidade declara também:** índice (`@Index`, com `where` quando parcial), `CHECK` (`@Check`) e nome de FK (`@JoinColumn({ foreignKeyConstraintName })`). Não é enfeite — é o que mantém o detector de drift utilizável.
- `typeorm:generate` não escreve a migration final aqui (batiza constraint com hash e não expressa `DESC` em índice): serve como **detector de drift** entre entidade e schema, e o esperado é `No changes`. **Nesse caso ele sai com código ≠ 0** — é sucesso, não falha; não encadeie com `&&`.

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

Por isso `style/useImportType` está desligada para `apps/api` no `biome.jsonc` da raiz. Não religue, e nada de `import type` em arquivo com decorator.

**A exceção é a dependência resolvida por token.** Com `@Inject(USER_REPOSITORY)` o token vem do decorator e o metadata deixa de ser consultado — por isso um contrato só de tipo (`interface`) funciona ali. A regra continua valendo para tudo que o Nest resolve pela classe. Conferir o emitido:

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
