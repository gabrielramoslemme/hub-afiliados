# CLAUDE.md

Ponto de entrada do Claude Code neste repositório. Cobre o que vale para o monorepo inteiro — o específico de cada pacote está no `CLAUDE.md` dele.

## Visão geral

Porto Hub de Afiliados: parceiros divulgam um cupom exclusivo da Porto Serviços e são remunerados por resultado. A **Onda 1** vai do cadastro público do afiliado até ele entrar com a conta aprovada, mais o painel em que a Porto decide.

O canal do afiliado é **web responsivo**, no mesmo Next que serve o backoffice — não há aplicativo mobile. Isso inverte o RF-01 do repositório de docs, que ainda descreve o app como canal único.

| Pacote | O que é | Ler antes de mexer em |
|---|---|---|
| [`apps/api`](apps/api/CLAUDE.md) | NestJS 11 + TypeORM + Postgres. Canais `/v1/affiliate`, `/v1/admin`, `/v1/webhooks`. | rota, guard, use case, entidade, migration |
| [`apps/web`](apps/web/CLAUDE.md) | Next 15 + React 19 + shadcn sobre Radix. Landing page, cadastro, área do afiliado e painel. | tela, formulário, Server Action, componente |
| [`packages/contracts`](packages/contracts/CLAUDE.md) | `@porto/contracts` — enums, tipos e schemas zod compartilhados. | enum, DTO ou schema que a API e a web dividem |
| `packages/tsconfig` | `base.json`, `nest.json`, `next.json`. | — |
| [`infra`](infra/cloudformation/README.md) | CloudFormation do ambiente de desenvolvimento, compose de produção e script de release. | stack, deploy, Dockerfile, variável do ambiente provisionado |

Setup local, portas e seed no [`README.md`](README.md); e-mails em [`apps/api/docs/EMAILS.md`](apps/api/docs/EMAILS.md); a stack de dev em [`infra/cloudformation/README.md`](infra/cloudformation/README.md).

## Comandos

A raiz só carrega o que é do repositório inteiro. **Script que pertence a um pacote mora nele** — migration, seed, openapi e e2e estão em [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md).

```bash
npm run dev          # API (3000) e web (3005) em watch
npm run dev:web      # só a web (3005), sem subir a API
npm run lint         # Biome: lint, formato e ordem de imports
npm run type-check   # tsc --noEmit em todos os pacotes
npm run test         # unitários (Jest)
npm run build
npm run format       # Biome aplicando as correções
npm run db:up        # sobe o Postgres
npm run db:down      # derruba o Postgres
```

## Antes de implementar

1. **Conferir o que já existe** — repositório, factory, provider, utilitário. Não abra caminho paralelo.
2. **Vocabulário compartilhado** — enum, tipo de resposta ou schema zod que a API e a web dividem sai de `@porto/contracts`.
3. **Ler o `CLAUDE.md` do pacote** antes de criar arquivo nele.
4. **TDD** — o teste que falha vem antes da implementação.

**Ambiguidade no pedido: perguntar antes de assumir.** As skills de cada pacote ficam em `.claude/skills/`.

## Testes: regra, não cobertura

**Teste existe para proteger regra de negócio e o que só quebra de verdade em produção — nunca para somar cobertura.** Antes de escrever, e antes de manter, a pergunta é a mesma: *se eu apagar ou inverter a linha da regra, este teste falha?* Teste que não falharia por mudança nenhuma que importe sobra; regra que nenhum teste pegaria falta. Teste novo sobre código que já existe passa de primeira — prove que ele protege quebrando a linha.

| Onde | O que testa | O que não testa |
|---|---|---|
| Unitário do use case (`apps/api`) | cada ramo da regra, a ordem que é regra, o que **não** acontece quando falha | mapeamento campo a campo, eco do próprio mock |
| E2e da API (`apps/api/test`) | DTO, SQL, transação e índice único, guard de canal, o que a resposta não pode vazar, o fluxo ponta a ponta | regra que o unitário já decide; o repositório isolado |
| Jest da web | lógica: Server Action, schema, tradução de `code`, redirecionamento, função pura | **componente** — regra que mora num componente sai para uma função pura |

Detalhes e armadilhas no `CLAUDE.md` de cada pacote e nas skills `create-unit-test` e `create-e2e-test`.

## Regras invioláveis

Valem em todo pacote. Violação é bug, não preferência.

- **Dependência externa fica na borda.** Framework, ORM, SDK de fornecedor, cliente HTTP, relógio, gerador de id: a regra de negócio declara o contrato do que precisa, a camada de fora implementa, e só o wiring importa a biblioteca. Vale para decorator e tipo, não só para chamada. O teste: **trocar o fornecedor não pode tocar arquivo de regra** — se toca, o contrato está faltando.
- **Toda rota HTTP sob `/v1`.** Sem exceção.
- **O identificador exposto é `public_id` (uuid).** O `id` serial nunca aparece em resposta, rota, URL do painel ou log.
- **Nenhuma rota sem guard por omissão.** Rota pública exige o decorator `@Public()` explícito.
- **CPF e chave PIX nunca vão para log.** Em listagem, CPF mascarado (`maskCpf`, `***.***.789-01`); completo só no detalhe.
- **O navegador nunca fala com a API.** Quem chama é o servidor do Next; a sessão vive em cookie `httpOnly`. `API_BASE_URL` não é `NEXT_PUBLIC_`.
- **Nenhum dado pessoal de cliente final** entra em tabela ou log.
- **Senha com bcrypt, custo 10.** Token de uso único só como hash SHA-256; em claro, apenas no e-mail.
- **Toda migration é reversível** — `down()` sempre implementado.
- **TDD** — o teste que falha vem antes da implementação.
- **npm**, nunca `pnpm` ou `yarn`. O `package-lock.json` da raiz é a fonte única.
- **Node >= 24** (`.nvmrc` pinha a LTS vigente; `engine-strict=true` faz o install falhar de propósito em versão anterior).

## Convenções de código

- **`function` declaration** para funções nomeadas; arrow function só em callback inline.
- **Sem `any`** e **sem `console.log`** — erro no Biome, não aviso. Na API, use o `Logger` do Nest; na camada de application, nem ele — ver [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md).
- **Variável não usada só passa com prefixo `_`.**
- **Comentário explica *por quê*, nunca *o quê*.**
- **kebab-case** em arquivos, `PascalCase` em classes e componentes, `camelCase` em funções e variáveis.
- **Não criar arquivo desnecessário** — adaptar o existente sempre que possível.

**Idioma:** tudo em inglês — identificador, arquivo, pasta, tabela, coluna, descrição de teste, log, mensagem de CLI, mensagem de commit (assunto e corpo), nome de branch. **Em pt-BR só o que uma pessoa lê:** string de usuário (erro da API, mensagem dos schemas zod, texto das telas, e-mail) e comentário de código.

## Vocabulário compartilhado

Fonte única em `packages/contracts/src/enums/index.ts`, nunca redeclarado em `apps/api` nem em `apps/web`:

`UserTypeEnum` · `UserRoleEnum` · `AffiliateStatusEnum` · `CouponStatusEnum` · `PixKeyTypeEnum` · `SocialNetworkEnum` · `TokenPurposeEnum` · `AuthAudienceEnum` · `AuthErrorCodeEnum` · `MailTemplateEnum` · `RegistrationErrorCodeEnum` · `CouponErrorCodeEnum` · `StatementEntryKindEnum` · `ReferralStatusEnum` · `ReferralPeriodEnum` · `IncentiveStatusEnum` · `IncentiveErrorCodeEnum`

**O pacote é consumido compilado.** Depois de editar `packages/contracts/src`, rode `npm run build --workspace packages/contracts` — o `turbo` faz isso sozinho nas tasks, comando direto (`seed`, `openapi:generate`, `ts-node`) não.

## Git

- **Conventional Commits**, validados por commitlint no hook `commit-msg` (lefthook). O escopo é o pacote: `feat(api):`, `fix(web):`, `chore:`.
- **A mensagem inteira em inglês — assunto e corpo.** Nome de branch também. Commit em pt-BR é para reescrever antes do push.
- O `pre-commit` roda `biome check --staged` nos arquivos `.ts`, `.tsx`, `.js`, `.mjs` e `.json`.
- Nunca commitar `.env` nem `apps/api/openapi.json` — o contrato é artefato de build, gerado pela CI a cada push.

## Quality gate

```bash
npm run lint && npm run type-check && npm run test
```

Mexeu em rota, DTO ou migration: `npm run test:e2e --workspace apps/api` também (exige `npm run db:up`; o banco `_test` é criado e migrado sozinho). A CI roda exatamente isso, mais `build` e a geração do `openapi.json`.

**O e2e não toca o banco de desenvolvimento:** roda em `hub_afiliados_test`, sem porta fixa, e convive com o `npm run dev` de pé.

## Stack

TypeScript strict · npm workspaces · Turborepo · NestJS 11 · TypeORM 0.3 · PostgreSQL 16 · Jest 30 · Next.js 15 · React 19 · shadcn/ui sobre Radix · Tailwind 4 · react-hook-form · zod · bcrypt · Joi · Resend · React Email · Biome 2 · lefthook · commitlint
