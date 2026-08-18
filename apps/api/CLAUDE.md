# API — `@porto/api`

NestJS 11 + TypeORM 0.3 + PostgreSQL 16. Uma aplicação, três canais de entrada separados por audiência de JWT.

Regras globais do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md). Este arquivo cobre o que é específico da API.

## Três canais, uma API

| Módulo | Consumidor | Autenticação | Guard |
|---|---|---|---|
| `mobile` | App Flutter do afiliado | JWT com audiência `affiliate` | `AffiliateGuard` |
| `admin` | Painel da Porto e da Mesa | JWT com audiência `admin` | `AdminGuard`, com `@Roles(...)` por rota |
| `webhooks` | Sistemas externos | Assinatura própria, sem JWT | — |
| `health` | Monitoração | pública | `@Public()` |

Identidade é unificada em `users`, com perfil 1:1 em `affiliates`. **Esquecer de checar a audiência numa rota é escalação de privilégio** — por isso nada é público por omissão.

## Camadas

| Pasta | O que mora | Depende de |
|---|---|---|
| `src/domain/<agregado>/` | repositórios, DTOs, filtros, eventos e utilitários do agregado | TypeORM e `@porto/contracts` |
| `src/infra/` | `config/`, `database/typeorm/` (entities e migrations), `services/` (email, crypto), `shared/` (filtros) | nada de `modules/` |
| `src/modules/<canal>/` | controllers e use cases por canal; `shared/` guarda o que dois canais usam | domain e infra |
| `src/testing/` | factories e mocks — fora do build (`tsconfig.build.json`) | — |

Path aliases: `@Domain/*` · `@Infra/*` · `@Modules/*` · `@Testing/*`.

**Atenção:** os aliases estão declarados em **três** lugares — `tsconfig.json`, `jest.config.ts` e `test/jest-e2e.json`. Alias novo exige editar os três, senão o unitário ou o e2e quebra com "Cannot find module".

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
| Teste unitário | ao lado do arquivo, `.spec.ts` |
| Teste de integração | `test/<assunto>.e2e-spec.ts` |

## Repositórios

O acesso ao banco fica no repositório. **Use case nunca injeta `Repository<T>` do TypeORM.**

- `@Injectable()` com `@InjectRepository(Entity)` privado.
- Métodos devolvem `Promise<Entity | null>` sem lançar — quem decide 404 é o use case.
- Todos são registrados e exportados pelo `SharedModule`. Um módulo de canal só precisa importar `SharedModule` para ter acesso a qualquer um.
- Entidade nova: registrar no `TypeOrmModule.forFeature([...])` **e** nos arrays `providers` e `exports` do `SharedModule`.

## Entidades

- Tabela e coluna em `snake_case` via `name:`; propriedade em `camelCase`.
- `id` serial PK interno **mais** `public_id` uuid `@Generated('uuid')` único — o `public_id` é o único identificador que sai da API.
- Timestamps `timestamptz` via `@CreateDateColumn` / `@UpdateDateColumn`. Soft delete (`@DeleteDateColumn`) só onde o modelo pede — hoje, `users`.
- Enums vêm de `@porto/contracts` e são gravados como `varchar`. Não use o tipo `enum` do Postgres: adicionar valor viraria migration de schema.
- `email` é `citext` (case-insensitive), não `varchar`.

## Migrations

- `synchronize: false` sempre. Nenhum schema nasce de entidade.
- Criar: `npm run typeorm:create --workspace apps/api --name=MinhaMigration` — **o timestamp vem da CLI, nunca escrito à mão**. Aplicar: `npm run typeorm:run --workspace apps/api`. Reverter: `npm run typeorm:revert --workspace apps/api`.
- `typeorm:generate` não produz a migration final aqui (não sabe expressar `citext` nem índice parcial); serve como **detector de drift** entre entidade e schema. Skill `create-migration`.
- As migrations existentes são SQL escrito à mão em `queryRunner.query`. Siga o mesmo estilo, com índices nomeados `ix_<tabela>_<colunas>` e índice parcial onde a consulta é sempre filtrada (`WHERE "revoked_at" IS NULL`).
- `down()` sempre implementado, derrubando na ordem inversa.

**Atenção: `ormconfig.ts` e o `DatabaseModule` são dois DataSources.** O `ormconfig.ts` é o do CLI (lê `.env` por `dotenv`, aponta para os `.ts`); o `DatabaseModule` é o da aplicação (lê o `EnvironmentVariableService`, aponta para `__dirname`). Mexeu em um, confira o outro — o sintoma de divergência é migration que roda no CLI e some em runtime.

## Configuração e ambiente

Variável nova entra em **quatro** lugares, sempre os quatro:

1. `src/infra/config/env.validation.ts` — schema Joi. Variável ausente ou inválida derruba a aplicação na subida, de propósito.
2. `src/infra/config/environment-variable.service.ts` — getter tipado.
3. `.env.example` — com comentário quando o valor não for óbvio.
4. `.github/workflows/ci.yml`, bloco `env:` — quando for obrigatória.

**Nunca leia `process.env` fora do `EnvironmentVariableService`.** As exceções são `ormconfig.ts`, `seeds/` e `scripts/`, que rodam fora do container de DI do Nest.

## Erros

O `HttpExceptionFilter` global normaliza toda resposta de erro no formato que o app e o painel consomem:

```json
{ "statusCode": 403, "code": "REGISTRATION_UNDER_REVIEW", "message": "...", "path": "/v1/mobile/auth/login", "timestamp": "..." }
```

- `code` vem de `AuthErrorCodeEnum` quando o cliente precisa distinguir o caso para escolher a mensagem; nas demais respostas é `null`.
- Para emitir: `throw new ForbiddenException({ code: AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW, message: 'Cadastro em análise.' })`.
- 5xx é logado com stack; 4xx não. Não logue a exceção você mesmo — o filtro já faz.

O `ValidationPipe` global usa `whitelist`, `forbidNonWhitelisted` e `transform`: campo fora do DTO devolve 400, não é silenciosamente ignorado.

## Swagger e o contrato do app

O `openapi.json` é o contrato do app Flutter — rota sem decorator vira contrato incompleto e o app não a enxerga.

- Toda rota precisa de `@ApiTags`, decorator de resposta (`@ApiOkResponse`, `@ApiCreatedResponse`, …) e DTO de **classe** com `@ApiProperty`.
- DTO de resposta é classe do Nest em `src/domain/<agregado>/dtos/`, não `interface` de `@porto/contracts` — o Swagger precisa do metadado em runtime. Os dois coexistem: a classe descreve, o tipo compartilhado tipa o painel.
- Gerar sem subir servidor: `npm run openapi:generate --workspace apps/api`.

## E-mail

`MailService.send` **nunca lança** — falha vira log de erro e o fluxo de negócio segue. É deliberado: um e-mail que não saiu é incidente operacional; uma aprovação revertida por causa dele seria incidente de negócio. Não embrulhe em `try/catch` nem trate o retorno.

O provider é escolhido por `MAIL_PROVIDER` (`logger` em dev e teste, `mailersend` em homologação e produção). IDs de template vêm de variável de ambiente, nunca de código. Templates, gatilhos e variáveis em [`docs/EMAILS.md`](docs/EMAILS.md).

## Testes

- **Unitário** — `*.spec.ts` ao lado do arquivo, sem banco. Use as factories de `src/testing/factories/` (`buildUser`, `buildAdminUser`, `buildAffiliate`) e os mocks de `src/testing/mocks/`. Cobertura obrigatória por caso de uso.
- **Integração** — `test/*.e2e-spec.ts`, com Postgres real, `--runInBand`, compilando o `AppModule` inteiro. Isolamento por `TRUNCATE <tabelas> RESTART IDENTITY CASCADE` no `beforeEach`, e `dataSource.destroy()` no `afterAll`.
- Nomes de teste em pt-BR, descrevendo o comportamento: `it('responde 200 com status ok')`, `it('não encontra token expirado')`.
- Objeto de teste novo e reutilizável vira factory em `src/testing/`, não literal repetido.

## Atenção: `import type` quebra a injeção de dependência

O Nest resolve dependência lendo o metadata `design:paramtypes`, que o
`emitDecoratorMetadata` grava a partir do tipo do parâmetro do construtor. Um
`import type` apaga a referência em runtime e o metadata vira `[Function]` — a
injeção falha, e **lint, type-check, build e os testes unitários passam**. O
sintoma só aparece quando o container sobe.

```ts
import type { ConfigService } from '@nestjs/config';   // ERRADO
import { ConfigService } from '@nestjs/config';        // certo

@Injectable()
export class EnvironmentVariableService {
  constructor(private readonly config: ConfigService) {}
}
```

Por isso a regra `style/useImportType` está desligada para `apps/api` no
`biome.jsonc` da raiz. Não a religue, e não adicione `import type` em arquivo com
decorator. Para conferir o que foi emitido:

```bash
grep -o '__metadata("design:paramtypes".\{0,80\}' apps/api/dist/<caminho>.js
```

## Atenção: os módulos de canal ainda são cascas

`AdminModule`, `MobileModule` e `WebhookModule` só importam `SharedModule` — não existe controller, guard nem use case além do health. A Spec 07 traz `AffiliateGuard`, `AdminGuard`, `@Public()`, `@Roles()`, `@CurrentUser()` e o guard global de negação.

**Enquanto a Spec 07 não existir, não adicione rota autenticada:** sem o guard global, ela nasce aberta e o `@Public()` que a excepcionaria ainda não foi escrito.

## Skills

| Skill | Quando |
|---|---|
| `create-migration` | Criar ou alterar schema do Postgres |
| `create-entity` | Entidade e repositório novos |
| `create-api-endpoint` | Rota HTTP em qualquer canal |
| `create-unit-test` | Spec unitário — antes da implementação |
| `create-e2e-test` | Teste de integração com Postgres real |

## Comandos

```bash
npm run dev --workspace apps/api          # nest start --watch, porta 3000
npm run test --workspace apps/api         # unitários
npm run test:e2e --workspace apps/api     # integração, exige Postgres
npm run type-check --workspace apps/api
```

Swagger em `http://localhost:3000/v1/docs`.
