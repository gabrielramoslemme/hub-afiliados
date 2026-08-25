# Canal `/v1/admin` na API — o painel deixa de rodar contra dublê

**Data:** 2026-08-25 · **Escopo:** `apps/api`, `apps/web` (só o transporte), `packages/contracts`

O painel da Porto já existe inteiro em `apps/web`: fila com filtro, ordenação e paginação,
detalhe com CPF e chave PIX, histórico de status, aprovar e reprovar, login do operador. O
que não existe é o outro lado. `admin.module.ts` é um `@Module` vazio, e o repositório não
tem **nenhuma** autenticação — sem `@nestjs/jwt`, sem guard, sem `@Public()`.

Esta entrega constrói o canal `/v1/admin` e desliga o dublê do painel. Nenhuma tela muda.

## Recorte

| Entra | Fica de fora |
|---|---|
| Ports de autenticação no domínio e adapters na borda | Refresh token, logout no servidor, rate limit |
| `AuthenticatedGuard` global, `AdminGuard` do canal, `@Public()`, `@Roles()` | Restrição por perfil — os três decidem, o decorator fica pronto |
| `POST /v1/admin/auth/login` | Troca de senha e recuperação do operador |
| Fila, detalhe, histórico, aprovar e reprovar em `/v1/admin/affiliates` | Suspender, reativar, exportar, reenviar e-mail |
| `AffiliateRepository.search()` | `/v1/affiliate/auth` e `/v1/affiliate/me`, que seguem dublados |
| E-mail de aprovação com o link de definir senha (48h) | A tela `/definir-senha` na web e a rota que consome o token |
| Desligar o dublê no prefixo `/admin` | Qualquer mudança de tela, rota ou copy |

**Sem migration.** `users`, `affiliates`, `affiliate_status_history` e `password_reset_tokens`
já têm todas as colunas que a decisão grava — inclusive `approved_by_user_id` e o
`ck_affiliates_rejection_reason`, que obriga motivo em toda reprovação.

## Decisões de desenho

### A biblioteca de auth não entra no núcleo

Assinar JWT, comparar hash de senha, sortear token de uso único e ler o relógio são quatro
dependências externas. O use case declara o contrato; quem importa `@nestjs/jwt`, `bcrypt` e
`node:crypto` é infra.

| Port (`src/domain/`) | Método | Adapter (`src/infra/services/auth/`) |
|---|---|---|
| `PasswordHasher` (`auth/`) | `compare(plain, hash)` | `BcryptPasswordHasher` |
| `AccessTokenIssuer` (`auth/`) | `issue(claims)` | `JwtAccessTokenService` |
| `AccessTokenVerifier` (`auth/`) | `verify(token)` | `JwtAccessTokenService` |
| `TokenGenerator` (`auth/`) | `generate()` → `{ token, hash }` | `CryptoTokenGenerator` |
| `Clock` (`shared/`) | `now()` | `SystemClock` |

**Emitir e verificar são dois ports com uma implementação só.** Quem verifica é o guard, e
guard que recebe a capacidade de emitir token pode assinar um. O adapter é um; o que cada
lado enxerga, não.

O `Clock` não é preciosismo de teste: `approvedAt` e o vencimento do token de 48h são regra
de negócio decidida no use case, e `new Date()` dentro dele torna a asserção impossível sem
congelar o relógio global do Jest.

### O JWT carrega `public_id`, nunca o id serial

```ts
{ sub: user.publicId, aud: AuthAudienceEnum.ADMIN, role: user.role, name: user.name }
```

O token viaja para o navegador — em cookie `httpOnly`, mas viaja. O `id` serial não sai da
API, e é a mesma regra que vale para rota, resposta e log. Quando o use case precisa do id
interno (`approved_by_user_id` é FK), ele resolve pelo `UserRepository.findByPublicId`.

Expiração de **8 horas**, casando com o `SESSION_MAX_AGE_SECONDS` do cookie do Next: token
que morre antes do cookie vira 401 numa tela que se acha logada. Vem de `JWT_EXPIRES_IN`,
variável nova nos quatro lugares de sempre.

### Negar por omissão é do guard global; a audiência é do canal

`AuthenticatedGuard` entra como `APP_GUARD`: sem `@Public()` explícito, rota sem token
válido é 401 — inclusive rota que alguém criar amanhã e esquecer de proteger. Ele deixa o
payload verificado em `request.auth`.

`AdminGuard` fica nos controllers do canal e checa o resto: `aud` igual a `admin`, `role`
dentro do `@Roles(...)` quando declarado, e publica o ator em `request.actor` — que chega no
controller pelo decorator de parâmetro `@Actor()`, não por `@Req()`.

São dois guards porque as perguntas são diferentes: "este token é válido" vale para a API
inteira; "este token é deste canal" só existe onde há canal. Verificar a assinatura duas
vezes seria desperdício, e por isso o segundo guard lê o que o primeiro deixou.

`@Public()` passa a marcar três rotas: `GET /v1/health`, `POST /v1/affiliates` e
`POST /v1/admin/auth/login`.

### A fila é uma consulta só, e a ordenação é um tipo

```ts
interface SearchAffiliatesInput {
  page: number;
  limit: number;
  status: AffiliateStatusEnum | null;
  search: string | null;
  sortBy: 'createdAt' | 'name';
  sortOrder: 'asc' | 'desc';
}
```

`sortBy` é união fechada no contrato do domínio, não `string`. O adapter interpola o nome da
coluna no `ORDER BY`, e uma `string` livre atravessando três camadas até virar SQL é a forma
mais discreta de abrir injeção. O compilador fecha o caminho na origem.

A busca decide pelo conteúdo: entrada só de dígitos procura CPF, o resto procura nome e
e-mail com `ILIKE`. É a mesma regra do dublê, que a analista já usa.

Uma consulta com `leftJoinAndSelect` do usuário — a lista mostra nome e e-mail, e resolvê-los
depois seria N+1 numa tela paginada de dez em dez.

### A máscara de CPF é da regra, não do formato

`ListAffiliatesUseCase` devolve `maskedCpf` e **não** devolve `cpf`. Mascarar na camada HTTP
deixaria o CPF completo dentro do objeto que a application entrega — e um log de depuração
no controller vazaria a listagem inteira. O detalhe é rota própria justamente para o CPF
completo sair só quando alguém abriu aquele cadastro.

`Date` sai do use case como `Date`; quem serializa para ISO é o DTO de resposta.

### Aprovar e reprovar são dois use cases, não um com bandeira

Os dois compartilham a guarda de transição — só `PENDING_APPROVAL` decide, e decidido não
redecide (`AffiliateAlreadyDecidedError`, `CONFLICT`) — e divergem em tudo o mais: aprovação
grava `approvedAt` e `approvedByUserId`, cria o token `SET_PASSWORD` de 48h e manda o link;
reprovação exige motivo e grava `rejectionReason`. Um use case com `toStatus` no parâmetro
esconderia essa divergência atrás de dois `if`.

A atomicidade continua onde já estava: `changeStatus` grava status e histórico na mesma
transação, com a linha travada. O use case não vê `EntityManager`.

O e-mail sai depois da escrita e nunca lança — `Mailer.send` já é assim de propósito.

### A resposta é o contrato que a web já consome

`AffiliateListItem`, `AffiliateDetail`, `AffiliateStatusHistoryItem`, `PaginatedResult<T>` e
`AdminLoginResponse` existem em `@porto/contracts` e são o que `apps/web` tipa hoje contra o
dublê. Os DTOs de classe da API implementam esses tipos: o Swagger precisa do metadado em
runtime, e o tipo compartilhado é o que quebra o build da web quando a API mudar.

`rejectAffiliateSchema` (mínimo de 10, máximo de 500 caracteres) vira o `class-validator` do
`RejectAffiliateRequestDto`. Duas expressões da mesma regra, uma em cada ponta — o schema já
é a autoridade do formulário, o DTO é a autoridade da API.

### O dublê perde o `/admin` e nada mais

`DUBBED` passa a ser `['/affiliate/auth', '/affiliate/me']`, e as rotas `/admin/*` saem do
`mock-api.ts`. As fixtures ficam: `mockAffiliateAccount` sai de `mockAffiliates[2]`, e a área
do afiliado continua dublada até os cards 4.x.

A partir daí o painel precisa da API no ar e do `npm run seed` — que já cria os três
operadores com `MudarAgora!2026`.

## Rotas

| Método | Rota | Guard | Resposta |
|---|---|---|---|
| `POST` | `/v1/admin/auth/login` | `@Public()` | `AdminLoginResponse` |
| `GET` | `/v1/admin/affiliates` | `AdminGuard` | `PaginatedResult<AffiliateListItem>` |
| `GET` | `/v1/admin/affiliates/:publicId` | `AdminGuard` | `AffiliateDetail` |
| `GET` | `/v1/admin/affiliates/:publicId/history` | `AdminGuard` | `AffiliateStatusHistoryItem[]` |
| `POST` | `/v1/admin/affiliates/:publicId/approve` | `AdminGuard` | `204` |
| `POST` | `/v1/admin/affiliates/:publicId/reject` | `AdminGuard` | `204` |

Erros, todos pelo `HttpExceptionFilter`:

| Situação | `kind` | Status | `code` |
|---|---|---|---|
| E-mail ou senha errados, ou usuário não é operador | `UNAUTHORIZED` | 401 | `AUTH-001` |
| Operador sem senha definida | `UNAUTHORIZED` | 401 | `AUTH-004` |
| Operador inativo | `UNAUTHORIZED` | 401 | `AUTH-005` |
| `publicId` inexistente | `NOT_FOUND` | 404 | `null` |
| Cadastro já decidido | `CONFLICT` | 409 | `null` |
| Motivo ausente ou curto na reprovação | — | 400 | `null` |

**Usuário que não é `ADMIN` recebe `AUTH-001`, o mesmo do e-mail errado.** Distinguir
"existe, mas não é operador" de "não existe" transforma o login do painel em oráculo de
e-mails cadastrados.

## Testes

- **Unitário, obrigatório por use case:** `AdminLoginUseCase` (credencial errada, sem senha,
  inativo, não-operador, caminho feliz com `lastLoginAt`), `ListAffiliatesUseCase` (máscara e
  repasse dos critérios), `GetAffiliateUseCase` e `ListAffiliateStatusHistoryUseCase` (404),
  `ApproveAffiliateUseCase` e `RejectAffiliateUseCase` (transição inválida, token de 48h,
  e-mail, ator resolvido pelo `publicId`). Mocks novos em `src/testing/mocks/services/`.
- **Unitário dos guards:** `AuthenticatedGuard` (sem header, token inválido, `@Public()`) e
  `AdminGuard` (audiência de afiliado recusada, `@Roles` respeitado).
- **e2e:** `test/admin-auth.e2e-spec.ts` e `test/admin-affiliates.e2e-spec.ts` — Postgres real,
  token emitido de verdade, 401 sem header, fila filtrada e paginada, aprovação escrevendo
  histórico, segunda decisão em 409.
- **Web:** a suíte existente é a rede de segurança do desligamento do dublê; `mock-api.spec.ts`
  perde os casos de `/admin` e ganha a asserção de que `/admin/...` agora devolve `null`.
