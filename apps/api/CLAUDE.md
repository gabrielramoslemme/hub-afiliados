# API — `@porto/api`

NestJS 11 + TypeORM 0.3 + PostgreSQL 16. Uma aplicação, três canais de entrada separados por audiência de JWT. Regras do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md).

## Três canais, uma API

| Módulo | Consumidor | Autenticação | Guard |
|---|---|---|---|
| `affiliate` | Portal web do afiliado (`apps/web`) | JWT com audiência `affiliate` | `AffiliateGuard` |
| `admin` | Painel da Porto e da Mesa | JWT com audiência `admin` | `AdminGuard`, com `@Roles(...)` por rota |
| `webhooks` | Sistemas externos | Assinatura própria, sem JWT | — |
| `health` | Monitoração | pública | `@Public()` |

Identidade unificada em `users`, perfil 1:1 em `affiliates`. **Esquecer de checar a audiência é escalação de privilégio.**

**Só o `/v1` é global** (`setGlobalPrefix`) — não há `RouterModule`. Estar dentro do `AdminModule` **não** prefixa `admin`: o canal vai no path, `@Controller('admin/affiliates')`. Esquecer publica a rota fora do canal, sem o guard de audiência.

**Exceção: rota pública sem guard de audiência não carrega canal no path.** `POST /v1/affiliates` — o cadastro público — é o recurso no plural e nada mais; não há `affiliate/` na frente porque não há audiência a marcar, e prefixar teria só reintroduzido a palavra "affiliate" duas vezes. A ação é sempre o verbo HTTP, nunca um segmento a mais no path.

## Arquitetura

**A dependência aponta para dentro.** O núcleo — domínio e application — não sabe que Nest, TypeORM ou HTTP existem; cada camada de fora conhece só as de dentro. O que o domínio precisa do mundo, ele **declara** como contrato — quem implementa é infra. Inverter isso não é questão de estilo: é o bug que este desenho existe para impedir.

| Camada | O que mora | Conhece |
|---|---|---|
| `src/domain/<agregado>/` | tipos do agregado, contratos de repositório (interface + token), erros de domínio, regra pura (`cpf.util.ts`) | só `@porto/contracts` |
| `src/application/<agregado>/` | use cases: classes TypeScript puras que implementam `UseCase`, orquestram contratos e decidem a regra de negócio | domain |
| `src/infra/` | adapters que **implementam** contratos: `database/typeorm/`, `services/email/`, mais `config/`, `shared/filters/` e `di/`, o wiring | domain — e application, só em `di/` |
| `src/http/<canal>/` | controllers, DTOs, guards e o `*.module.ts` do canal | application, domain |
| `src/testing/` | factories e mocks — fora do build (`tsconfig.build.json`) | domain, application |

### Como uma requisição atravessa

Aprovar um afiliado pelo painel. **Os arquivos de `http/` e `application/` abaixo são ilustrativos** — a Onda 1 ainda não tem nenhuma dessas rotas; o resto existe.

```
POST /v1/admin/affiliates/:publicId/approve
│
├─ http/admin/affiliates/admin-affiliates.controller.ts
│     guard de audiência, ValidationPipe no DTO, chama o use case. Sem regra.
│
├─ application/affiliates/approve-affiliate.use-case.ts
│     a regra: só PENDING_APPROVAL vira APPROVED; senão lança DomainError.
│     Classe pura — sem decorator, sem Nest, sem infra. Conhece duas interfaces:
│       AffiliateRepository → domain/affiliates/affiliate.repository.ts
│       Mailer              → domain/notifications/mailer.ts
│
├─ infra/di/use-cases.module.ts
│     o wiring: liga cada token a um parâmetro do construtor.
│
├─ infra/database/typeorm/repositories/affiliate.typeorm-repository.ts
│     implementa o contrato: SELECT ... FOR UPDATE, status e histórico na mesma transação.
│
├─ infra/services/email/mail.service.ts
│     implementa Mailer: envia e nunca lança.
│
└─ infra/shared/filters/http-exception.filter.ts
      traduz o DomainError para status e monta o corpo do erro.
```

Quem liga token a implementação é `*.module.ts`, em dois passos: o `RepositoriesModule` diz **qual adapter** atende cada contrato, o `UseCasesModule` diz **qual token** entra em cada parâmetro do construtor. O use case não vê nem um nem outro.

### Dependência externa fica na borda

**A regra vale para qualquer biblioteca, não só para o ORM.** Se a regra de negócio precisa do que uma dependência externa faz, ela declara o contrato e a borda implementa. O teste é sempre o mesmo: **trocar o fornecedor não pode tocar arquivo de regra.**

| Dependência externa | O que o núcleo declara | Quem importa a biblioteca |
|---|---|---|
| Postgres, via TypeORM | `AffiliateRepository` (`src/domain/affiliates/`) | `AffiliateTypeormRepository` |
| MailerSend | `Mailer` (`src/domain/notifications/`) | `MailService` e os providers |
| Nest, como container de DI | nada — o use case é classe comum | `src/infra/di/use-cases.module.ts` |

O terceiro é o menos óbvio, e por isso o mais fácil de deixar passar. `@Injectable` e `@Inject` parecem anotação, mas emitem `require('@nestjs/common')` no arquivo compilado: um use case decorado carrega o framework junto, e passa a só existir dentro do container. Sem decorator, quem monta o use case é o wiring — em infra, porque o container é infraestrutura como qualquer outra:

```ts
const USE_CASES = [
  provideUseCase(CreateAffiliateUseCase, [USER_REPOSITORY, AFFILIATE_REPOSITORY, MAILER]),
];
```

- **Use case novo: uma linha em `USE_CASES`.** O `exports` é derivado da lista, e o token do provider é a própria classe — o controller continua injetando pelo tipo, sem `@Inject`.
- **Todo use case implementa `UseCase<TInput, TOutput>`** (`src/application/use-case.ts`). Nenhum código trata use case genericamente — o contrato existe para o compilador recusar o próximo que nascer com `handle` ou `run`. Sem entrada é `UseCase<void, T>`, com `execute()` sem parâmetro: TypeScript aceita o método mais curto e deixa omitir o argumento na chamada.
- **A saída é tipo próprio do use case, nunca a entidade do domínio crua.** `CreateAffiliateOutput`, não `AffiliateEntity`: devolver a entidade entrega junto o `id` serial, e contar com o controller para descartá-lo é confiar a regra à camada errada. `Date` sai como `Date` — formatar para o fio é do DTO de resposta.
- **O array é posicional, e o compilador cobra a posição.** O `provideUseCase` é tipado sobre os parâmetros do construtor, e cada token carrega o contrato que promete (`Token<UserRepository>`), então **token a menos e token trocado são erro de type-check** — o segundo aponta o método que falta:

  ```
  Type 'Token<AffiliateRepository>' is not assignable to type 'Token<UserRepository>'.
    Type 'AffiliateRepository' is missing the following properties from type 'UserRepository': findByEmail, findById
  ```
- O canal importa `UseCasesModule`, não `RepositoriesModule`: controller não alcança repositório nem por wiring.
- Precisa logar dentro de um use case? O `Logger` do Nest também está barrado aqui, pela mesma regra — declare um port no domínio, como o `Mailer`.

### Quem decide o quê

| Decisão | Camada |
|---|---|
| CPF é válido; a transição de status é permitida | domain |
| Afiliado ausente é erro, e qual erro | application — lança `DomainError` |
| Isso vira 404, 409 ou 403 | infra — o filtro, a partir do `kind` |
| A escrita é atômica; o que é lido com lock | infra — o adapter |
| Qual audiência de JWT pode chamar | http — guard do canal |
| O formato do JSON que sai | http — DTO de resposta |

### Cobrado por lint, não por boa vontade

| Camada | Não pode importar |
|---|---|
| `src/domain/**` | `typeorm`, `@nestjs/typeorm`, `@Infra/*`, `@Http/*`, `@Application/*` |
| `src/application/**` | `@nestjs/common` **inteiro**, `@nestjs/swagger`, `class-validator`, `express`, `typeorm`, `@nestjs/typeorm`, `@Infra/*`, `@Http/*` |
| `src/infra/**` | `@Application/*` e `@Http/*` — infra implementa contrato do domínio, não chama use case |
| `src/http/**` | `@Infra/database/*` — controller chama use case, não repositório |

**As exceções são o wiring, e só ele:** `src/infra/di/**` conhece a application porque montar o use case é o trabalho dele, e o `*.module.ts` do canal conhece infra pelo mesmo motivo. **`src/application/**` não tem exceção nenhuma** — não existe arquivo dessa camada que possa importar Nest.

Aliases `@Domain/*` · `@Application/*` · `@Infra/*` · `@Http/*` · `@Testing/*`, declarados em **três** lugares: `tsconfig.json`, `jest.config.ts` e `test/jest-e2e.json`. Alias novo exige editar os três, senão o unitário ou o e2e quebra com "Cannot find module".

### Três falhas que passam por lint, type-check e build

E só aparecem quando o container sobe ou a rota é chamada. Se algo quebrou em runtime com tudo verde, comece por aqui:

1. **Adapter fora do `RepositoriesModule`** — provider não encontrado na primeira chamada da rota.
2. **`import type` em arquivo com decorator** resolvido por classe — o metadata vira `[Function]`. Ver a seção no fim deste guia.
3. **Relação prometida no tipo de retorno e não carregada no adapter** — `undefined` em produção, sem o compilador reclamar.

Token trocado de posição no `provideUseCase` **era** a quarta, e a pior: dois tokens invertidos compilavam e injetavam o colaborador errado. Hoje o `Token<T>` fecha esse caminho no type-check.

## Onde cada coisa mora

| Coisa | Caminho |
|---|---|
| Tipo do agregado | `src/domain/<agregado>/<nome>.entity.ts` (interface) |
| Contrato de repositório | `src/domain/<agregado>/<nome>.repository.ts` (interface + token) |
| Token de contrato | `src/domain/shared/token.ts` (`createToken`, `Token<T>`) |
| Entidade TypeORM | `src/infra/database/typeorm/entities/<nome>.typeorm-entity.ts` |
| Adapter do repositório | `src/infra/database/typeorm/repositories/<nome>.typeorm-repository.ts` |
| Migration | `src/infra/database/typeorm/migrations/<timestamp>-<Nome>.ts` |
| Use case | `src/application/<agregado>/<nome>.use-case.ts` |
| Contrato do use case | `src/application/use-case.ts` |
| Wiring dos use cases | `src/infra/di/use-cases.module.ts` |
| Erro de domínio | `src/domain/<agregado>/<agregado>.errors.ts` (base em `src/domain/errors/`) |
| Controller | `src/http/<canal>/<agregado>/<canal>-<agregado>.controller.ts` |
| DTO de request/response | `src/http/<canal>/<agregado>/dtos/<nome>.request.dto.ts` |
| Módulo do canal | `src/http/<canal>/<canal>.module.ts` |
| Variável de ambiente | `src/infra/config/` |
| Factory e mock de teste | `src/testing/` |
| Teste unitário | ao lado do arquivo, `.spec.ts` |
| Teste de integração | `test/<assunto>.e2e-spec.ts` |
| Seed | `seeds/seed.ts` |

## Nome da dependência injetada

**A propriedade é o camelCase do nome do tipo, sufixo de categoria incluído.** Sem exceção e sem apelido: o construtor precisa dizer *o que* cada colaborador é — use case, repositório, provider, service — sem obrigar quem lê a ir atrás do tipo.

```ts
// no use case: contrato e nada mais
constructor(
  private readonly userRepository: UserRepository,
  private readonly affiliateRepository: AffiliateRepository,
  private readonly mailer: Mailer,
) {}

// em infra e http, onde a classe é o token: @Inject só quando o alvo é contrato
constructor(@Inject(MAIL_PROVIDER) private readonly mailProvider: MailProvider) {}
```

| Tipo | Propriedade |
|---|---|
| `CreateAffiliateUseCase` | `createAffiliateUseCase` |
| `MailProvider` | `mailProvider` |
| `EnvironmentVariableService` | `environmentVariableService` |
| `Mailer` | `mailer` — o port não tem sufixo de categoria, e o nome dele já basta |
| `Repository<UserTypeormEntity>` | `repository` — dentro do adapter, é o único que existe |

Nada de `users`, `affiliates`, `provider`, `env`, `config`. O nome curto some no meio das outras dependências, e num construtor de cinco linhas vira adivinhação.

## Repositórios

Contrato no domínio, implementação em infra. **Use case nunca recebe `Repository<T>` do TypeORM nem a classe do adapter — só o contrato.**

- O contrato é uma `interface` em `src/domain/<agregado>/<nome>.repository.ts`, com o token no mesmo arquivo. A interface some na compilação; o token é o que o Nest resolve em runtime, e mantê-los juntos impede que o par se separe.

  ```ts
  export const USER_REPOSITORY = createToken<UserRepository>('USER_REPOSITORY');
  ```

  **`createToken` (`src/domain/shared/token.ts`), nunca `Symbol` cru.** O `Token<UserRepository>` continua sendo um `Symbol` comum em runtime — o contrato é fantasma, só existe para o compilador. É ele que faz o `UseCasesModule` recusar o token certo na posição errada. (O `app.get(TOKEN)` do e2e continua devolvendo `any` — o overload do Nest não tem onde inferir a partir de um `symbol`; siga passando o genérico explícito.)
- O adapter é `@Injectable()` em `src/infra/database/typeorm/repositories/<nome>.typeorm-repository.ts`, declara `implements <Contrato>` e é o **único** lugar com `@InjectRepository`.
- Métodos devolvem `Promise<T | null>` sem lançar — quem decide 404 é o use case.
- **O tipo de retorno diz quais relações vêm carregadas:** `AffiliateEntity` (só escalares), `AffiliateWithUser`, `AffiliateDetail`. Prometer no tipo uma relação que o adapter não carregou é `undefined` em produção sem o compilador reclamar.
- **Escrita que precisa ser atômica vira método do agregado** (`changeStatus`), com a transação inteira dentro do adapter. Nenhum `EntityManager` atravessa o contrato.
- No use case o construtor declara só a interface (`private readonly userRepository: UserRepository`); o token correspondente entra na linha do `UseCasesModule`. Dentro de infra e http, a injeção de contrato continua sendo `@Inject(TOKEN)` no construtor.
- Repositório novo entra em **dois** lugares do `RepositoriesModule` (`src/infra/database/typeorm/repositories/`): `TypeOrmModule.forFeature` (a entidade) e a lista `REPOSITORIES` (o par token/adapter). O `exports` é derivado dela, então não há terceiro array para esquecer.

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
{ "statusCode": 403, "code": "REGISTRATION_UNDER_REVIEW", "message": "...", "path": "/v1/affiliate/auth/login", "timestamp": "..." }
```

- **O use case lança `DomainError`, nunca exceção do Nest.** O `biome check` reprova `ForbiddenException` dentro de `src/application/**`: status HTTP não significa nada para um webhook ou um job chamando o mesmo use case.

  ```ts
  export class RegistrationUnderReviewError extends DomainError {
    readonly kind = DomainErrorKindEnum.FORBIDDEN;
    readonly code = AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW;

    constructor() {
      super('Cadastro em análise.');
    }
  }
  ```

- **Traduzir `kind` para status é do filtro**, e é a tabela inteira: `NOT_FOUND` 404 · `CONFLICT` 409 · `INVALID_INPUT` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403.
- `code` vem de `AuthErrorCodeEnum` quando o cliente precisa distinguir o caso para escolher a mensagem; nas demais respostas é `null`.
- **Guard e controller continuam podendo lançar exceção do Nest** — eles já são a camada de HTTP.
- 5xx é logado com stack e responde `Erro interno`: a mensagem original pode carregar nome de coluna ou detalhe de schema. 4xx não é logado. **Não logue a exceção você mesmo** — o filtro já faz.
- O `ValidationPipe` global usa `whitelist`, `forbidNonWhitelisted` e `transform`: campo fora do DTO devolve 400 sozinho.

## Swagger

O `openapi.json` é o contrato publicado da API — rota sem decorator vira contrato incompleto, e nenhum teste daqui acusa.

- Toda rota precisa de `@ApiTags`, decorator de resposta (`@ApiOkResponse`, `@ApiCreatedResponse`, …) e DTO de **classe** com `@ApiProperty`.
- DTO de resposta é classe em `src/http/<canal>/<agregado>/dtos/`, nunca a `interface` de `@porto/contracts` — o Swagger precisa do metadado em runtime. Os dois coexistem: a classe descreve, o tipo compartilhado tipa o painel.

## E-mail

O use case recebe o port `Mailer` (`src/domain/notifications/mailer.ts`) pelo construtor — o token `MAILER` fica no `UseCasesModule` — e não conhece fornecedor nenhum. Quem implementa é o `MailService`.

`Mailer.send` **nunca lança** — falha vira log e o fluxo segue. Deliberado: e-mail não enviado é incidente operacional; aprovação revertida por causa dele seria incidente de negócio. Não embrulhe em `try/catch`.

Dentro de infra, `MAIL_PROVIDER` escolhe o fornecedor concreto (`logger` em dev e teste, `mailersend` fora) — dois ports em camadas diferentes, de propósito: o domínio quer enviar, infra sabe por onde. IDs de template vêm de variável de ambiente, nunca de código. Templates, gatilhos e variáveis em [`docs/EMAILS.md`](docs/EMAILS.md).

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

**A exceção é a dependência resolvida por token** — `@Inject(MAIL_PROVIDER)` em infra, ou o `inject:` do `UseCasesModule`: o token não sai do metadata, e por isso um contrato só de tipo (`interface`) funciona ali. **No use case a regra nem chega a se aplicar**: sem decorator, o `design:paramtypes` não é emitido. Ela continua valendo para tudo que o Nest resolve pela classe — adapter, controller, guard, filtro. Conferir o emitido:

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
npm run seed --workspace apps/api                            # operadores
npm run openapi:generate --workspace apps/api                # gera apps/api/openapi.json
```

Swagger em `http://localhost:3000/v1/docs`.
