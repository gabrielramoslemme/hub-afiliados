# API — `@porto/api`

NestJS 11 + TypeORM 0.3 + PostgreSQL 16. Uma aplicação, três canais de entrada separados por audiência de JWT. Regras do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md).

## Três canais, uma API

| Módulo | Consumidor | Autenticação | Guard |
|---|---|---|---|
| `affiliate` | Portal web do afiliado (`apps/web`) | JWT com audiência `affiliate` | `AffiliateGuard` |
| `admin` | Painel da Porto e da Mesa | JWT com audiência `admin` | `AdminGuard`, com `@Roles(...)` por rota |
| `webhooks` | Sistemas externos | Assinatura HMAC, sem JWT | `@Public()` + `WebhookSignatureGuard` |
| `health` | Monitoração | pública | `@Public()` |

Identidade unificada em `users`, perfil 1:1 em `affiliates`. **Esquecer de checar a audiência é escalação de privilégio.**

**Só o `/v1` é global** (`setGlobalPrefix`) — não há `RouterModule`. Estar dentro do `AdminModule` **não** prefixa `admin`: o canal vai no path, `@Controller('admin/affiliates')`. Esquecer publica a rota fora do canal, sem o guard de audiência.

**Exceção: rota pública sem guard de audiência não carrega canal no path.** `POST /v1/affiliates` — o cadastro público — é o recurso no plural e nada mais; não há `affiliate/` na frente porque não há audiência a marcar, e prefixar teria só reintroduzido a palavra "affiliate" duas vezes. A ação é sempre o verbo HTTP, nunca um segmento a mais no path.

### Dois guards, duas perguntas

`AuthenticatedGuard` é global, registrado como `APP_GUARD` no `AppModule`: **sem `@Public()` explícito, requisição sem token válido é 401** — inclusive a rota que alguém criar amanhã e esquecer de proteger. Ele verifica a assinatura uma vez e deixa os claims em `request.auth`.

`AdminGuard` e `AffiliateGuard` ficam nos controllers dos canais e respondem a outra pergunta: este token é **deste** canal. Conferem `aud`, o do painel aplica o `@Roles(...)` quando a rota declara, e os dois publicam `request.actor` — que chega ao handler pelo decorator de parâmetro `@Actor()`, nunca por `@Req()`. Eles leem o que o primeiro deixou, então a assinatura não é verificada duas vezes.

**Trocar de canal é 403, nos dois sentidos**, e há e2e para isso: token de afiliado em `/v1/admin/coupons/availability` e token de operador em `/v1/affiliate/me`. Além disso, o `route-protection.e2e-spec.ts` percorre as rotas registradas e confere que toda rota `admin/...` tem o `AdminGuard` e toda `affiliate/...` o `AffiliateGuard` — o guard do canal certo, e não só algum.

Hoje `@Public()` marca exatamente dez rotas: `GET /v1/health`, `POST /v1/affiliates`, os dois `POST .../auth/login`, `POST /v1/affiliate/auth/set-password`, os dois pares `POST .../auth/forgot-password` e `POST .../auth/reset-password`, um em cada canal, e `POST /v1/webhooks/porto/incentives`. As de senha são públicas porque são o que a pessoa tem **antes** de ter senha — ou depois de perdê-la: quem autentica a chamada é o token de uso único no corpo, e quem pede recuperação não tem sessão nenhuma para apresentar. A de webhook é pública só para o JWT: quem a fecha é o `WebhookSignatureGuard`, e o mesmo spec reprova rota `webhooks/...` sem ele. Acrescentar a próxima é decisão de segurança, não de conveniência; a lista literal em `test/route-protection.e2e-spec.ts` é o que obriga a decisão a passar por um diff.

**As duas rotas de recuperação existem em cada canal, e o canal é quem diz a audiência.** O `RequestPasswordResetUseCase` e o `ResetPasswordUseCase` recebem `AuthAudienceEnum` na entrada, nunca no corpo: é isso que faz o link do painel não redefinir senha pela tela do afiliado. Os dois ficam em silêncio — 204 — para conta que não existe, não pode entrar ou pediu demais, porque responder diferente entregaria quem participa do programa.

**O claim `sub` é o `public_id`.** O token viaja para fora da API, e o id serial não sai daqui; quando o use case precisa do id interno — `approved_by_user_id` é FK —, ele resolve pelo `UserRepository.findByPublicId`.

O tempo de vida vem de `JWT_EXPIRES_IN_SECONDS` (oito horas), casado com o cookie de sessão do painel: token que morre antes do cookie vira 401 numa tela que se acha logada.

## Arquitetura

**A dependência aponta para dentro.** O núcleo — domínio e application — não sabe que Nest, TypeORM ou HTTP existem; cada camada de fora conhece só as de dentro. O que o domínio precisa do mundo, ele **declara** como contrato — quem implementa é infra. Inverter isso não é questão de estilo: é o bug que este desenho existe para impedir.

| Camada | O que mora | Conhece |
|---|---|---|
| `src/domain/<agregado>/` | tipos do agregado, contratos de repositório (interface + token), erros de domínio, regra pura (`cpf.util.ts`) | só `@porto/contracts` |
| `src/application/<agregado>/` | use cases: classes TypeScript puras que implementam `UseCase`, orquestram contratos e decidem a regra de negócio | domain |
| `src/infra/` | adapters que **implementam** contratos: `database/typeorm/`, `services/email/`, mais `config/`, `shared/filters/` e `di/`, o wiring | domain — e application, só em `di/` |
| `src/http/<canal>/` | controllers, DTOs, guards e o `*.module.ts` do canal | application, domain |
| `src/testing/` | factories, mocks e fakes — fora do build (`tsconfig.build.json`) | domain, application |

### Como uma requisição atravessa

Aprovar um afiliado pelo painel — o caminho real, arquivo por arquivo.

```
POST /v1/admin/affiliates/:publicId/approve
│
├─ http/shared/guards/authenticated.guard.ts
│     guard global: sem @Public(), token inválido é 401. Publica os claims em request.auth.
│
├─ http/admin/affiliates/admin-affiliates.controller.ts
│     AdminGuard confere a audiência e publica o ator, ValidationPipe no DTO,
│     @Actor() entrega quem decidiu, chama o use case. Sem regra.
│
├─ application/affiliates/approve-affiliate.use-case.ts
│     a regra: só PENDING_APPROVAL vira APPROVED; senão lança DomainError.
│     Classe pura — sem decorator, sem Nest, sem infra. Conhece nove interfaces,
│     entre elas:
│       AffiliateRepository → domain/affiliates/affiliate.repository.ts
│       CouponGateway       → domain/coupons/coupon-gateway.ts
│       TokenGenerator      → domain/auth/token-generator.ts
│       Clock               → domain/shared/clock.ts
│       Mailer              → domain/notifications/mailer.ts
│
├─ infra/di/use-cases.module.ts
│     o wiring: liga cada token a um parâmetro do construtor.
│
├─ infra/database/typeorm/repositories/affiliate.typeorm-repository.ts
│     implementa o contrato: SELECT ... FOR UPDATE, confere o status esperado debaixo do
│     lock, grava status, histórico e cupom na mesma transação.
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
| Resend | `Mailer` (`src/domain/notifications/`) | `MailService` e o `ResendProvider` |
| Porto Serviços (INT-01), via Sensedia | `CouponGateway` (`src/domain/coupons/`) | `PortoCouponGateway` e o `SensediaTokenProvider` |
| React Email | `Mailer` (`src/domain/notifications/`) | `ReactEmailRenderer` e os templates |
| `@nestjs/jwt` | `AccessTokenIssuer` e `AccessTokenVerifier` (`src/domain/auth/`) | `JwtAccessTokenService` |
| bcrypt | `PasswordHasher` (`src/domain/auth/`) | `BcryptPasswordHasher` |
| `node:crypto` | `TokenGenerator` (`src/domain/auth/`) | `CryptoTokenGenerator` |
| HMAC do webhook e `PORTO_WEBHOOK_SECRET` | `WebhookSignatureVerifier` (`src/domain/auth/`) | `HmacWebhookSignatureVerifier` |
| O relógio | `Clock` (`src/domain/shared/`) | `SystemClock` |
| `APP_BASE_URL` | `LinkBuilder` (`src/domain/notifications/`) | `AppLinkBuilder` |
| Nest, como container de DI | nada — o use case é classe comum | `src/infra/di/use-cases.module.ts` |

**O relógio está na tabela pelo mesmo motivo que o ORM.** `approvedAt` e o vencimento do token de 48h são decisão de regra, e um `new Date()` dentro do use case torna a asserção impossível sem congelar o relógio global do Jest.

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
| Guard e decorator transversais | `src/http/shared/guards/`, `src/http/shared/decorators/` |
| Adapter de serviço (auth, relógio, link) | `src/infra/services/<assunto>/` |
| Variável de ambiente | `src/infra/config/` |
| Factory e mock de teste | `src/testing/` |
| Teste unitário | ao lado do arquivo, `.spec.ts` |
| Teste de integração | `test/<assunto>.e2e-spec.ts` |
| Seed | `src/infra/database/typeorm/seeds/` — `seed-operators.ts` (a lógica) e `run-seed.ts` (a entrada) |
| Prefixo, `ValidationPipe`, filtro, helmet e CORS | `src/configure-app.ts` — o `main.ts` e o e2e chamam a mesma função |
| Apoio do e2e | `test/e2e-app.ts` (app e reset), `test/e2e-fixtures.ts` (operador, cadastros, cupom, link do e-mail) |

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
| `ConfigService` | `configService` |
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
- **Os dois DataSources encontram as entidades por esse sufixo** (`typeorm.module.ts` e `data-source.ts`). Renomear arquivo sem trocar os dois globs derruba a aplicação na subida.
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

**Atenção: o DataSource do CLI mora em `src/`, e `ormconfig.ts` é só a casca.** O de verdade é `src/infra/database/typeorm/data-source.ts`, que resolve entidades e migrations por `__dirname` — assim o mesmo arquivo serve ao `ts-node` sobre `src/` em desenvolvimento e ao `node` sobre `dist/` na imagem de produção. O `ormconfig.ts` continua sendo o `-d` do CLI local porque precisa carregar o `.env` por `dotenv` antes.

**Ele exporta a instância uma vez só, como `default`.** O `migration:run -d <arquivo>` recusa o módulo que exporte duas — e a mesma instância exportada como nomeada *e* como default já conta como duas, com a mensagem `Given data source file must contain only one export of DataSource instance`. Há teste para isso em `data-source.spec.ts`.

O `DatabaseModule` continua sendo um DataSource à parte, o da aplicação, que lê o `ConfigService`. Os globs dos dois são iguais de propósito; divergir volta a produzir migration que roda no CLI e some em runtime.

**E o TLS dos dois sai da mesma função, `postgres-ssl.ts`.** O parameter group padrão do RDS PostgreSQL 16 traz `rds.force_ssl = 1`: sem TLS o servidor recusa a conexão antes de olhar a senha. Configurar só um dos dois DataSources é a mesma armadilha dos globs, de cabeça para baixo — a aplicação sobe e a migration não, ou o contrário.

Não adianta pendurar `?sslmode=require` na `DATABASE_URL`: o TypeORM quebra a URL em host, porta, usuário, senha e banco, e não repassa o query string ao driver. A opção é `ssl`, montada por `buildPostgresSsl`.

A CA da Amazon não está no trust store do Node, então a imagem carrega o bundle (`infra/certs/rds-global-bundle.pem` → `/app/certs/`) e a verificação fica ligada. Sem o arquivo a função **lança** em vez de cair para conexão sem verificação: o banco guarda CPF e chave PIX, e subir sem saber com quem se está falando é o que não se faz.

## Configuração

**Quem lê o ambiente é o `ConfigService` do `@nestjs/config`**, e mais ninguém. O `AppConfigModule` (`src/infra/config/config.module.ts`) registra o `ConfigModule.forRoot` com `isGlobal` e o schema Joi, então qualquer provider injeta o `ConfigService` sem importar módulo nenhum.

```ts
constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

const baseUrl = this.configService.get('APP_BASE_URL', { infer: true }); // string
```

- **Sempre os dois genéricos e sempre `{ infer: true }`.** `EnvironmentVariables` (`src/infra/config/environment-variables.ts`) diz quais chaves existem e o tipo de cada uma; o `true` diz que o Joi já validou, e por isso `get` devolve `string`, e não `string | undefined`. Sem `{ infer: true }` a chave ainda é conferida, mas o retorno é `any` — e o Biome não reprova esse `any`, porque ninguém o escreveu.
- **O valor chega convertido.** O `get` devolve o que saiu do Joi: número como número, booleano como booleano, padrão já aplicado. Nada de `Number(...)`, `=== 'true'` ou `?? padrão` na leitura — o padrão mora no schema. É isso que impede a duração de chegar ao JWT como a string `"28800"`, que o `expiresIn` leria como 28,8 segundos.
- **Em factory de módulo, pelo `inject`:** `inject: [ConfigService]`, com o parâmetro tipado como acima. O token é a própria classe, então vale a seção sobre `import type` no fim deste guia: `import { ConfigService }`, nunca `import type`.
- **Só em infra e no wiring.** `ConfigService` é Nest: domain e application não o conhecem, e o lint já barra `@nestjs/*` ali. Regra de negócio que precisa de um valor de configuração declara um port, e infra o implementa lendo o `ConfigService` — como o `AppLinkBuilder` faz com `APP_BASE_URL` para o `LinkBuilder`.
- **Em teste unitário**, `configServiceMock({ CHAVE: valor })` (`src/testing/mocks/services/`) devolve um `ConfigService` de verdade, carregado só com o que o teste passa.

Variável nova entra em **quatro** lugares, sempre os quatro:

1. `src/infra/config/env.validation.ts` — schema Joi. Ausente ou inválida derruba a aplicação na subida, de propósito.
2. `src/infra/config/environment-variables.ts` — a chave na interface, com o tipo que sai **do Joi**: `number` para `Joi.number()`, `boolean` para `Joi.boolean()`, união literal para `.valid(...)`, e `?` só quando o schema não tem padrão nem `required()`.
3. `.env.example` — com comentário quando o valor não for óbvio.
4. `.github/workflows/ci.yml`, bloco `env:` — quando for obrigatória com `NODE_ENV=test`.

**Nunca leia `process.env` na aplicação** — exceto em `ormconfig.ts`, `scripts/`, `src/infra/database/typeorm/data-source.ts`, `src/infra/database/typeorm/seeds/` e `src/infra/database/typeorm/grants/`, que rodam fora do container de DI do Nest e não têm o `ConfigService`. Os três últimos estão em `src/` justamente por precisarem existir compilados na imagem de produção; continuam sendo código de CLI, não de aplicação.

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

- **Traduzir `kind` para status é do filtro**, e é a tabela inteira: `NOT_FOUND` 404 · `CONFLICT` 409 · `INVALID_INPUT` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `UNAVAILABLE` 503.
- `code` vem de um `*ErrorCodeEnum` de `@porto/contracts` (`AuthErrorCodeEnum`, `RegistrationErrorCodeEnum`, `CouponErrorCodeEnum`, `IncentiveErrorCodeEnum`) quando o cliente precisa distinguir o caso para escolher a mensagem; nas demais respostas é `null`.
- **Guard e controller continuam podendo lançar exceção do Nest** — eles já são a camada de HTTP.
- 5xx é logado com stack e responde `Erro interno`: a mensagem original pode carregar nome de coluna ou detalhe de schema. 4xx não é logado. **Não logue a exceção você mesmo** — o filtro já faz.
- O `ValidationPipe` global usa `whitelist`, `forbidNonWhitelisted`, `transform` e `stopAtFirstError`: campo fora do DTO devolve 400 sozinho, com uma mensagem por campo. Ele é montado em `configureApp` (`src/configure-app.ts`), junto com o filtro — nunca direto no `main.ts`, senão o e2e volta a testar uma configuração que produção não usa.

## Swagger

O `openapi.json` é o contrato publicado da API — rota sem decorator vira contrato incompleto, e nenhum teste daqui acusa.

- Toda rota precisa de `@ApiTags`, decorator de resposta (`@ApiOkResponse`, `@ApiCreatedResponse`, …) e DTO de **classe** com `@ApiProperty`.
- DTO de resposta é classe em `src/http/<canal>/<agregado>/dtos/`, nunca a `interface` de `@porto/contracts` — o Swagger precisa do metadado em runtime. Os dois coexistem: a classe descreve, o tipo compartilhado tipa o painel.

## E-mail

O use case recebe o port `Mailer` (`src/domain/notifications/mailer.ts`) pelo construtor — o token `MAILER` fica no `UseCasesModule` — e não conhece fornecedor nenhum. Quem implementa é o `MailService`.

`Mailer.send` **nunca lança** — falha vira log e o fluxo segue. Deliberado: e-mail não enviado é incidente operacional; aprovação revertida por causa dele seria incidente de negócio. Não embrulhe em `try/catch`.

O log da falha leva o template e o stack, **sem o endereço de quem receberia**: o fornecedor costuma citá-lo na mensagem do erro, e o `MailService` o troca por `[destinatário]` antes de logar.

Dentro de infra o trabalho se parte em dois contratos: `MailRenderer` monta o conteúdo e `MailProvider` despacha. `MAIL_PROVIDER` escolhe o fornecedor concreto (`logger` em dev e teste, `resend` fora) — três ports em camadas diferentes, de propósito: o domínio quer enviar, infra sabe o que escrever e por onde mandar. **O template mora em código**, como componente React Email em `services/email/templates/`, nunca no painel do fornecedor: o registry é um `Record<MailTemplateEnum, …>`, então template novo sem entrada ali é erro de type-check. Templates, gatilhos e variáveis em [`docs/EMAILS.md`](docs/EMAILS.md).

## Cupons

**O cupom é nosso: nasce e é gerenciado aqui, e a Porto Serviços só o registra**, pelo INT-01, para ele valer no checkout. `affiliate_coupons` é a fonte da verdade — código, percentual e situação são o que a analista escolheu, nunca o eco que a Porto devolve. O use case recebe o port `CouponGateway` (`src/domain/coupons/coupon-gateway.ts`) e não conhece fornecedor nenhum: `codigoCupom`, `percentualDesconto` e `flagCupomCumulativo` vivem inteiros em `services/coupons/`, e é isso que permite trocar quem registra sem tocar um arquivo de regra.

**A API sempre fala com a Porto** — nenhuma variável escolhe o emissor. Dentro de infra o trabalho se parte em dois, como no e-mail: `AccessTokenProvider` autentica, `CouponGateway` sabe o que é um cupom. O `FakeCouponGateway`, que registra em memória, mora em `src/testing/fakes/` e só entra no e2e.

**Fora de `test`, a API não sobe sem `PORTO_CLIENT_ID` e `PORTO_CLIENT_SECRET`** — em desenvolvimento também, e lá os endereços padrão são os de homologação: cada aprovação local registra cupom de verdade. Em `test` as duas não têm uso, porque o e2e troca o gateway pelo falso, e a CI não as carrega. No ambiente provisionado as duas são escritas à mão no parâmetro `/porto-hub/dev/config`, fora do template, e sem elas o deploy falha ([`infra/cloudformation/README.md`](../../infra/cloudformation/README.md)).

**O registro na Porto vem antes de qualquer escrita nossa.** Ser dono não é gravar primeiro: um cupom gravado aqui e não registrado lá chegaria ao afiliado sem valer no checkout. Se a Porto recusar ou não responder, o erro sobe e o cadastro fica exatamente como estava — em análise, sem e-mail enviado e sem trilha registrando decisão que não houve. As falhas são separadas pelo que a analista faz em seguida:

| Erro | Resposta | O que a analista faz |
|---|---|---|
| `CouponCodeUnavailableError` | 409 `CPN-001` | escolhe outro código |
| `CouponProviderUnavailableError` | 503 `CPN-002` | tenta de novo com o mesmo |
| `CouponRefusedError` | 409 `CPN-003` | revê o que pediu — é o 400 do INT-01, e trocar o código pode não ser o caso |
| `CouponProviderAccessDeniedError` | 503 `CPN-004` | avisa o suporte — a credencial da integração foi recusada, e repetir não resolve |

**Credencial recusada não é queda.** O OAuth que responde 400, 401 ou 403, o 401 que volta mesmo depois de trocar o token e o 403 do gateway viram `CPN-004`: dizer "tente novamente" mandaria a analista insistir no que só quem configura o ambiente corrige. O corpo da recusa fica no log. Timeout, rede, 5xx e 429 continuam `CPN-002` — e só eles levam a emissão a confirmar o cupom pela consulta, porque só eles deixam dúvida se o registro entrou.

**Resposta fora do INT-01 também é queda, nunca 500.** Um 200 que não é JSON, ou que não traz o campo que a rota documenta — `disponivel` na disponibilidade, `access_token` e `expires_in` no OAuth —, é página de proxy ou corpo cortado: vira `CPN-002`, e o token assim não fica guardado.

**`issue` e `change` não devolvem cupom nenhum.** O contrato só diz se a Porto registrou; o que ela responde não chega à regra e não sobrescreve nada aqui. Na alteração, o `PortoCouponGateway` compara a resposta com o pedido e deixa um aviso no log quando divergem — desencontro de integração, para alguém olhar, não um valor a adotar.

**Cupom registrado não fica sem dono.** Cada caminho que deixaria um cupom valendo no checkout sem afiliado do lado de cá tem a sua proteção:

- **Resposta perdida.** `PortoCouponGateway.issue` pergunta a disponibilidade antes de registrar. Se o registro ficar sem resposta — timeout, rede ou 5xx —, ele consulta `GET /cupons/{codigo}`: encontrado ativo e com o percentual pedido, o cupom é deste pedido, porque o código estava livre um instante antes, e a aprovação segue.
- **Duas aprovações ao mesmo tempo.** `changeStatus` recebe `expectedStatus` e o confere com a linha travada — a checagem do começo do use case não segura nada. Quem perde a corrida recebe 409. O mesmo código em dois cadastros diferentes é decidido pelo índice único de `affiliate_coupons.code`, que o adapter traduz para `CouponCodeUnavailableError` em vez de 500.
- **Aprovação que não grava.** Se `changeStatus` devolver nulo ou lançar depois do registro, o use case desativa o cupom na Porto antes de o erro subir — **só se nenhum afiliado tiver gravado aquele código aqui**. O código existe uma vez na Porto: se outra aprovação o gravou primeiro, o cupom de lá é dela, e desativá-lo derrubaria o desconto de quem ganhou a corrida. É o que acontece quando a consulta de uma resposta perdida confirma, com o mesmo percentual, o cupom que a outra aprovação acabou de registrar. Sem conseguir perguntar ao banco — o caso comum quando a gravação acabou de falhar —, desativa.

O que sobra é o registro **e** a consulta ficarem sem resposta seguidas: o cupom pode ter entrado lá, e a nova tentativa ouve "código em uso". Reconciliar esse caso pede à Porto um jeito de distinguir cupom de afiliado dos demais (P8).

**Alterar é `PATCH /v1/admin/affiliates/:publicId/coupon`** — desativar, reativar ou mudar o percentual, nunca o código, que é a chave da atribuição das vendas. Mesma ordem da aprovação: a Porto registra a mudança, e só então se grava o que a analista pediu.

**Divergência consciente da aprovação: a alteração não se desfaz na Porto se a gravação daqui falhar.** A aprovação desativa o cupom órfão porque perder a corrida é caminho normal; na alteração, falhar depois de a Porto aceitar exigiria o banco cair entre as duas chamadas ou o cupom sumir no meio — e não há fluxo que exclua cupom. Se acontecer, o painel mostra o valor anterior até alguém repetir a alteração — foi a escolha, no lugar de uma compensação que também pode falhar.

**Toda mudança de cupom vai para `affiliate_coupon_history`**, na mesma transação da mudança: a criação dentro do `changeStatus`, cada alteração dentro do `CouponRepository.change`. Tabela própria, e não a trilha do cadastro, porque o antes e o depois são outros; o painel junta as duas numa linha do tempo só, lendo `GET .../coupon/history`.

**O registro nunca esquece um código, nem o falso.** Teste e2e que aprova duas vezes precisa de dois códigos: o `TRUNCATE` entre os testes limpa a nossa tabela, não a memória de quem registrou.

## Webhook de incentivos (INT-03)

**`POST /v1/webhooks/porto/incentives` é por onde a venda feita com o cupom chega aqui.** A Porto Serviços decide se a venda comissiona e notifica três eventos: `VENDA_REGISTRADA` (pendente), `VENDA_CONCLUIDA` (liberado) e `VENDA_NAO_CONCLUIDA` (cancelado). O contrato devolvido à Porto — URL, assinatura, respostas e reprocessamento — está em [`docs/INT-03-incentivos.md`](docs/INT-03-incentivos.md).

- **Autenticação por HMAC-SHA256 de `"<timestamp>.<corpo cru>"`**, nos headers `X-Timestamp` e `X-Signature`, com janela de `PORTO_WEBHOOK_TOLERANCE_SECONDS`. A assinatura cobre bytes: por isso a aplicação sobe com `rawBody: true`, no `main.ts` **e** no `createE2eApp` — sem o segundo, toda chamada assinada do e2e volta 401. **`PORTO_WEBHOOK_SECRET` vazio fecha a rota**, nunca a abre: é opcional para não derrubar a subida de ambiente sem o segredo combinado.
- **Duas tabelas.** `affiliate_sales` guarda o estado atual — é a fonte da tela de Vendas e do extrato. `porto_incentive_events` guarda toda chamada que passou pela assinatura, aplicada, repetida ou recusada, com o corpo inteiro em `payload`.
- **A idempotência é `venda.id` + tipo de evento**, a chave do contrato da Porto; o `idEvento` muda a cada envio e não é único. Repetição é 200 `ALREADY_APPLIED`, sem escrita na venda.
- **Fora de ordem é 409 `INC-002`**, decisão da Mesa: conclusão sem registro prévio não cria a venda, e a Porto reprocessa o registro. Venda encerrada não reabre (`INC-003`).
- **A corrida é decidida no banco**: `external_id` único com `ON CONFLICT DO NOTHING` no registro, `SELECT ... FOR UPDATE` conferindo pendente no encerramento. Quem perde relê e vira repetição ou conflito.
- **Campo desconhecido é descartado, não recusado.** O `@WebhookBody()` valida com um `ValidationPipe` próprio, sem `forbidNonWhitelisted`; o global não alcança decorator customizado. Um 400 porque a Porto acrescentou um campo derrubaria a integração, e ela não reenvia sozinha.
- **O valor do incentivo ainda não existe**: o payload só traz `valorVenda`, guardado em centavos. `incentivo.valor` e a data real da venda foram pedidos à Porto.

## Testes

**O objetivo é proteger regra, não somar cobertura.** A pergunta que decide se um teste fica é sempre a mesma: *se eu apagar ou inverter a linha da regra, este teste falha?* Teste novo sobre código que já existe passa de primeira — prove que ele protege quebrando a linha e vendo falhar.

| Camada | O que testa | O que não testa |
|---|---|---|
| **Unitário do use case** — `*.spec.ts` ao lado do arquivo, sem banco | Cada ramo da regra: guarda de status, erro lançado, ordem que é regra (Porto antes do banco), o que **não** acontece quando falha, anti-enumeração | Mapeamento campo a campo; eco do próprio mock; `toHaveBeenCalled()` onde o comportamento responde |
| **Unitário de domínio e de adapter** | Util puro com borda de verdade (CPF, máscara, limite); adapter com semântica própria (401 que renova token, SDK que resolve com erro, cache com margem); lista de segurança com igualdade exata | Reimplementar a biblioteca no teste; o dublê de teste além do que o e2e confia dele |
| **E2e** — `test/*.e2e-spec.ts`, Postgres real | DTO, SQL (filtro, busca, ordenação, paginação), transação e índice único, wiring de audiência e guard, o que a resposta não pode vazar, fluxo ponta a ponta | Regra que o unitário já decide; 401 sem token repetido por rota; o repositório isolado |

**Não há suíte de repositório.** O adapter é exercitado pela rota, que é o contrato: token vencido e já usado, a busca por CPF digitado com pontuação, a paginação com join, a transação que volta inteira quando o índice único recusa. Dependência que só o banco decide se prova forçando a corrida — o gateway segura as duas requisições, ou um `jest.spyOn` faz a checagem do use case não ver o registro e deixa o índice responder.

- **Unitário:** factories em `src/testing/factories/` (`buildUser`, `buildAdminUser`, `buildAffiliate`, `buildCoupon`), mocks em `src/testing/mocks/`. Obrigatório por caso de uso. **Relógio com instante explícito** no spec (`const NOW = …`, `clockMock(NOW)`), nunca a data padrão escondida no mock. Detalhes na skill `create-unit-test`.
- **Rode pelo script, não por `npx jest`:** o React Email carrega por import dinâmico e precisa do `--experimental-vm-modules` que o `npm run test` liga.
- **E2e roda num banco `_test`, sempre.** `test/e2e-env.ts` acrescenta o sufixo ao nome que vier da `DATABASE_URL`, e `test/e2e-global-setup.ts` cria o banco e aplica as migrations antes do primeiro spec. Antes disso a suíte, que começa com `TRUNCATE ... CASCADE`, rodava no banco do `npm run dev` e apagava os operadores do seed.
- **O app do e2e sai de `createE2eApp()`** (`test/e2e-app.ts`), nunca de `Test.createTestingModule` direto. Ele troca o `COUPON_GATEWAY` pelo `FakeCouponGateway` (o `AppModule` cru registraria cupom de verdade na Porto — há um e2e em `admin-affiliates` que falha se a troca sumir) e o `MAIL_PROVIDER` pelo `FakeMailProvider`, que guarda o e-mail **já renderizado**: é o que pega variável que o use case e o template chamam por nomes diferentes. Também aplica o `configureApp` e escuta em `127.0.0.1` — em `::`, o `supertest` às vezes conecta num outro servidor local da mesma porta e recebe 404 de outra aplicação.
- Isolamento por `resetDatabase(e2e)` no `beforeEach`; estado montado pela rota pública (`register`, `approve` de `test/e2e-fixtures.ts`), não por literal de repositório. Detalhes na skill `create-e2e-test`.
- Descrição em inglês, pelo comportamento: `it('refuses a link past its expiry')`.
- Objeto de teste reutilizável vira factory em `src/testing/` (unitário) ou fixture em `test/e2e-fixtures.ts` (e2e), não literal repetido.

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
npm run test:e2e --workspace apps/api                        # integração, exige Postgres no ar; cria e migra o banco _test
npm run type-check --workspace apps/api
npm run typeorm:create --workspace apps/api --name=X         # nova migration, timestamp da CLI
npm run typeorm:run --workspace apps/api                     # aplica as migrations
npm run typeorm:revert --workspace apps/api                  # reverte a última
npm run typeorm:generate --workspace apps/api --name=Drift   # detector de drift, espera "No changes"
npm run seed --workspace apps/api                            # operadores
npm run openapi:generate --workspace apps/api                # gera apps/api/openapi.json
```

Os três `:prod` rodam contra `dist/`, sem `ts-node`, e existem para a imagem de
produção — é o `install-release.sh` que os chama, nessa ordem, a cada deploy:

```bash
npm run typeorm:run:prod --workspace apps/api                # migrations em dist/
npm run db:grants:prod --workspace apps/api                  # papel hub_rw, com DB_RW_PASSWORD
npm run seed:prod --workspace apps/api                       # operadores em dist/
```

Swagger em `http://localhost:3000/v1/docs`.
