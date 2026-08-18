# CLAUDE.md

Ponto de entrada do Claude Code neste repositório. Cobre o que vale para o monorepo inteiro — o específico de cada pacote está no `CLAUDE.md` dele.

## Visão geral

Porto Hub de Afiliados: parceiros divulgam um cupom exclusivo da Porto Serviços e são remunerados por resultado. A **Onda 1** vai do cadastro público do afiliado até ele entrar no app com a conta aprovada, mais o painel em que a Porto decide.

| Pacote | O que é | Ler antes de mexer em |
|---|---|---|
| [`apps/api`](apps/api/CLAUDE.md) | NestJS 11 + TypeORM + Postgres. Canais `/v1/mobile`, `/v1/admin`, `/v1/webhooks`. | rota, guard, use case, entidade, migration |
| [`apps/painel`](apps/painel/CLAUDE.md) | Next 15 + Refine + Ant Design sobre `/v1/admin`. | tela, formulário, recurso do Refine |
| [`packages/contracts`](packages/contracts/CLAUDE.md) | `@porto/contracts` — enums, tipos e schemas zod compartilhados. | enum, DTO ou schema que a API e o painel dividem |
| `packages/tsconfig` | `base.json`, `nest.json`, `next.json`. | — |

Setup local, portas e seed no [`README.md`](README.md); e-mails em [`apps/api/docs/EMAILS.md`](apps/api/docs/EMAILS.md). O app Flutter do afiliado fica em repositório próprio — a ponte é o `openapi.json` publicado pela API, nunca `@porto/contracts`.

## Comandos

A raiz só carrega o que é do repositório inteiro. **Script que pertence a um pacote mora nele** — migration, seed, openapi e e2e estão em [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md).

```bash
npm run dev          # API (3000) e painel (3005) em watch
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
2. **Vocabulário compartilhado** — enum, tipo de resposta ou schema zod que a API e o painel dividem sai de `@porto/contracts`.
3. **Ler o `CLAUDE.md` do pacote** antes de criar arquivo nele.
4. **TDD** — o teste que falha vem antes da implementação.

**Ambiguidade no pedido: perguntar antes de assumir.** As skills de cada pacote ficam em `.claude/skills/`.

## Regras invioláveis

Valem em todo pacote. Violação é bug, não preferência.

- **Toda rota HTTP sob `/v1`.** Sem exceção.
- **O identificador exposto é `public_id` (uuid).** O `id` serial nunca aparece em resposta, rota, URL do painel ou log.
- **Nenhuma rota sem guard por omissão.** Rota pública exige o decorator `@Public()` explícito.
- **CPF e chave PIX nunca vão para log.** Em listagem, CPF mascarado (`maskCpf`, `***.***.789-01`); completo só no detalhe.
- **Nenhum dado pessoal de cliente final** entra em tabela ou log.
- **Senha com bcrypt, custo 10.** Token de uso único só como hash SHA-256; em claro, apenas no e-mail.
- **Toda migration é reversível** — `down()` sempre implementado.
- **TDD** — o teste que falha vem antes da implementação.
- **npm**, nunca `pnpm` ou `yarn`. O `package-lock.json` da raiz é a fonte única.
- **Node >= 24** (`.nvmrc` pinha a LTS vigente; `engine-strict=true` faz o install falhar de propósito em versão anterior).

## Convenções de código

- **`function` declaration** para funções nomeadas; arrow function só em callback inline.
- **Sem `any`** e **sem `console.log`** — erro no Biome, não aviso. Na API, use o `Logger` do Nest.
- **Variável não usada só passa com prefixo `_`.**
- **Comentário explica *por quê*, nunca *o quê*.**
- **kebab-case** em arquivos, `PascalCase` em classes e componentes, `camelCase` em funções e variáveis.
- **Não criar arquivo desnecessário** — adaptar o existente sempre que possível.

**Idioma:** tudo em inglês — identificador, arquivo, pasta, tabela, coluna, descrição de teste, log, mensagem de CLI, mensagem de commit (assunto e corpo), nome de branch. **Em pt-BR só o que uma pessoa lê:** string de usuário (erro da API, mensagem dos schemas zod, texto do painel, e-mail) e comentário de código.

## Vocabulário compartilhado

Fonte única em `packages/contracts/src/enums/index.ts`, nunca redeclarado em `apps/api` nem em `apps/painel`:

`UserTypeEnum` · `UserRoleEnum` · `AffiliateStatusEnum` · `PixKeyTypeEnum` · `TokenPurposeEnum` · `AuthAudienceEnum` · `AuthErrorCodeEnum` · `MailTemplateEnum`

**O pacote é consumido compilado.** Depois de editar `packages/contracts/src`, rode `npm run build --workspace packages/contracts` — o `turbo` faz isso sozinho nas tasks, comando direto (`seed`, `openapi:generate`, `ts-node`) não.

## Git

- **Conventional Commits**, validados por commitlint no hook `commit-msg` (lefthook). O escopo é o pacote: `feat(api):`, `fix(painel):`, `chore:`.
- **A mensagem inteira em inglês — assunto e corpo.** Nome de branch também. Commit em pt-BR é para reescrever antes do push.
- O `pre-commit` roda `biome check --staged` nos arquivos `.ts`, `.tsx`, `.js`, `.mjs` e `.json`.
- Nunca commitar `.env` nem `apps/api/openapi.json` — o contrato é artefato de build, gerado pela CI a cada push.

## Quality gate

```bash
npm run lint && npm run type-check && npm run test
```

Mexeu em rota, DTO ou migration: `npm run test:e2e --workspace apps/api` também (exige `npm run db:up` e `npm run typeorm:run --workspace apps/api`). A CI roda exatamente isso, mais `build` e a geração do `openapi.json`.

## Stack

TypeScript strict · npm workspaces · Turborepo · NestJS 11 · TypeORM 0.3 · PostgreSQL 16 · Jest 30 · Next.js 15 · Refine 5 · Ant Design 5 · Tailwind 4 · zod · bcrypt · Joi · MailerSend · Biome 2 · lefthook · commitlint
