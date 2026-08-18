# CLAUDE.md

Ponto de entrada do Claude Code neste repositório. Contém o contexto do monorepo, o checklist antes de implementar e o índice de onde ler o resto.

## Visão geral

Porto Hub de Afiliados: canal de aquisição da Porto Serviços em que parceiros divulgam um cupom exclusivo e são remunerados por resultado. A venda acontece nos canais da Porto; a Mesa opera a jornada do parceiro.

A **Onda 1** recorta *acesso e aprovação*: do cadastro público do afiliado até ele entrar no app com a conta aprovada, mais o painel que a Porto usa para decidir.

| Pacote | O que é | Regras próprias |
|---|---|---|
| `apps/api` | NestJS 11 + TypeORM + Postgres. Três canais: `/v1/mobile`, `/v1/admin`, `/v1/webhooks`. | [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) |
| `apps/painel` | Next 15 + Refine + Ant Design, backoffice sobre `/v1/admin`. | [`apps/painel/CLAUDE.md`](apps/painel/CLAUDE.md) |
| `packages/contracts` | `@porto/contracts` — enums, tipos e schemas zod compartilhados. | [`packages/contracts/CLAUDE.md`](packages/contracts/CLAUDE.md) |
| `packages/tsconfig` | `base.json`, `nest.json`, `next.json`. | — |

O app Flutter do afiliado fica em repositório próprio. A ponte é o `openapi.json` publicado pela API — nunca `@porto/contracts`.

## Onde a implementação está

Specs 01 a 06 e 08 implementadas: monorepo, esqueleto da API e do painel, contratos e CI, modelo de dados completo, e-mail transacional. Da 07 em diante — autenticação, guards, casos de uso e telas — nada existe ainda: `AdminModule`, `MobileModule` e `WebhookModule` são cascas que só importam `SharedModule`, e o painel tem uma página de placeholder.

Consequência prática: **a primeira rota autenticada exige implementar a Spec 07 antes** — sem o guard global de negação, ela nasce aberta. Se esta seção parecer defasada, confira `git log --oneline`.

## Comandos

**A raiz só carrega o que é do repositório inteiro:** orquestração via Turborepo, Biome, o hook `prepare` e o Postgres do `docker-compose.yml`.

```bash
npm run dev            # API (3000) e painel (3005) em watch
npm run lint           # Biome: lint, formato e ordem de imports no repo inteiro
npm run type-check     # tsc --noEmit em todos os pacotes
npm run test           # unitários (Jest) em todos os pacotes
npm run build          # build de todos os pacotes
npm run format         # Biome aplicando as correções automáticas
npm run db:up          # sobe o Postgres
npm run db:down        # derruba o Postgres
```

**Script que pertence a um pacote mora nele** — a raiz não duplica em proxy:

```bash
npm run test:e2e         --workspace apps/api            # integração — exige Postgres no ar
npm run typeorm:create   --workspace apps/api --name=X   # nova migration, timestamp da CLI
npm run typeorm:run      --workspace apps/api            # aplica as migrations
npm run typeorm:revert   --workspace apps/api            # reverte a última
npm run seed             --workspace apps/api            # termos vigentes + operadores
npm run openapi:generate --workspace apps/api            # gera apps/api/openapi.json
```

## Antes de implementar

Antes de escrever qualquer código novo, percorrer estes cinco passos:

1. **Ler a spec.** Toda tarefa desta onda tem uma spec numerada em `docs/specs/` com os arquivos exatos, as interfaces produzidas e consumidas e os passos em TDD. Não desenhe um caminho paralelo.
2. **Conferir as dependências da spec.** A tabela de ordem em `docs/specs/README.md` diz o que precisa existir antes. Se a spec da qual esta depende não estiver implementada, ela vem primeiro.
3. **Vocabulário compartilhado.** Enum, tipo de resposta ou schema zod que a API e o painel dividem sai de `@porto/contracts`. Não redeclare.
4. **Ler o `CLAUDE.md` do pacote** que vai tocar, antes de criar arquivo nele.
5. **TDD.** O teste que falha vem antes da implementação, sempre.

**Em caso de ambiguidade na spec ou no card: perguntar antes de assumir.**

### Qual documento ler conforme a tarefa

| Tarefa | Documento |
|---|---|
| Entender o desenho completo | `docs/specs/00-arquitetura.md` |
| Implementar qualquer item da Onda 1 | a spec numerada em `docs/specs/` |
| Ordem, dependências e constraints globais | `docs/specs/README.md` |
| Critérios de aceite em linguagem de produto | `docs/tasks/` |
| Rota, guard, use case, entidade, migration | `apps/api/CLAUDE.md` |
| Tela, formulário, recurso do Refine | `apps/painel/CLAUDE.md` |
| Enum, DTO ou schema zod compartilhado | `packages/contracts/CLAUDE.md` |
| Template ou envio de e-mail | `apps/api/docs/EMAILS.md` |
| Setup local, portas, seed | `README.md` |

## Regras invioláveis

Valem em todo pacote. Violação é bug, não preferência.

- **Todas as rotas HTTP sob o prefixo `/v1`.** Sem exceção.
- **O identificador exposto é sempre `public_id` (uuid).** O `id` serial nunca aparece em resposta, rota, URL do painel ou log.
- **Nenhuma rota sem guard por omissão.** Rota pública exige o decorator `@Public()` explícito.
- **CPF e chave PIX nunca vão para log.** Em listagem, CPF vai mascarado (`maskCpf`, `***.***.789-01`); completo só no detalhe.
- **Nenhum dado pessoal de cliente final** entra em tabela ou log — não há integração de vendas nesta onda.
- **Senha com bcrypt, custo 10.** Token de uso único é armazenado só como hash SHA-256; o token em claro existe apenas no e-mail.
- **Toda migration é reversível** — `down()` sempre implementado.
- **TDD:** o teste que falha vem antes da implementação.
- **npm**, nunca `pnpm` ou `yarn`. O `package-lock.json` da raiz é a fonte única.
- **Node >= 24** (`.nvmrc` pinha a LTS vigente; `engine-strict=true` faz o install falhar de propósito em versão anterior).

## Vocabulário compartilhado

Fonte única em `packages/contracts/src/enums/index.ts`. Não invente sinônimos e não redeclare em `apps/api` nem em `apps/painel`.

`UserTypeEnum` · `UserRoleEnum` · `AffiliateStatusEnum` · `PixKeyTypeEnum` · `TokenPurposeEnum` · `AuthAudienceEnum` · `AuthErrorCodeEnum` · `MailTemplateEnum`

**`@porto/contracts` é consumido compilado.** Depois de editar `packages/contracts/src`, rode `npm run build --workspace packages/contracts` — o `turbo` faz isso sozinho nas tasks, comandos diretos (`db:seed`, `openapi`, `ts-node`) não. Detalhes em `packages/contracts/CLAUDE.md`.

## Convenções de código

- **`function` declaration** para funções nomeadas; arrow function só em callback inline.
- **Sem `any`** — `suspicious/noExplicitAny` é erro, não aviso.
- **Sem `console.log`** — `no-console` é erro (só `warn` e `error` passam). Na API, use o `Logger` do Nest.
- **Variável não usada só passa com prefixo `_`.**
- **Sem comentário descritivo** — comentário explica *por quê*, nunca *o quê*.
- **kebab-case** em arquivos, `PascalCase` em classes e componentes, `camelCase` em funções e variáveis.
- **Idioma:** código em inglês, string de usuário em pt-BR. Ver a seção abaixo.
- **Não criar arquivo desnecessário** — adaptar o existente sempre que possível.

## Idioma no código

**O código é escrito em inglês.** A exceção é o que uma pessoa lê.

| O que | Idioma |
|---|---|
| Identificador: classe, função, variável, propriedade, tipo, enum e seus valores | inglês |
| Nome de arquivo e de pasta | inglês |
| Tabela, coluna e índice no banco | inglês |
| Descrição de teste (`describe`, `it`) | inglês |
| Log, mensagem de CLI e erro interno (`Missing environment variable: X`) | inglês |
| Mensagem de commit e nome de branch | inglês |
| **Comentário de código e JSDoc** | **pt-BR** |
| **String voltada ao usuário final** | **pt-BR** |

String voltada ao usuário é o que a pessoa lê no produto: mensagem de erro da API (`'Cadastro em análise.'`), mensagem de validação dos schemas zod (`'Informe um e-mail válido'`), texto do painel, assunto e corpo de e-mail. Continuam em pt-BR — o produto é brasileiro.

O comentário explica *por quê*, nunca *o quê* — e pode ser em pt-BR, como já é em `cpf.util.ts` e `mail.service.ts`.

## Skills

Cada pacote traz as suas em `.claude/skills/`. Invoque pelo nome quando a tarefa bater.

| Skill | Pacote | Quando |
|---|---|---|
| `create-migration` | `apps/api` | Criar ou alterar schema do Postgres |
| `create-entity` | `apps/api` | Entidade e repositório novos |
| `create-api-endpoint` | `apps/api` | Rota HTTP em qualquer canal |
| `create-unit-test` | `apps/api` | Spec unitário — antes da implementação |
| `create-e2e-test` | `apps/api` | Teste de integração com Postgres real |
| `create-contract` | `packages/contracts` | Enum, DTO ou schema zod compartilhado |
| `create-panel-screen` | `apps/painel` | Tela ou recurso do Refine |

## Git

- **Conventional Commits**, validados por commitlint no hook `commit-msg` (lefthook). O escopo é o pacote: `feat(api):`, `fix(painel):`, `chore:`.
- O `pre-commit` roda `turbo run lint --filter=...[HEAD]`.
- Nunca commitar `.env` nem `apps/api/openapi.json` — o contrato é artefato de build, gerado pela CI a cada push.

## Quality gate

Antes de dar uma tarefa por concluída:

```bash
npm run lint && npm run type-check && npm run test
```

Mexeu em rota, DTO ou migration: `npm run test:e2e --workspace apps/api` também (exige `npm run db:up` e `npm run typeorm:run --workspace apps/api`). A CI roda exatamente isso, mais `build` e a geração do `openapi.json`.

## Stack

TypeScript strict · npm workspaces · Turborepo · NestJS 11 · TypeORM 0.3 · PostgreSQL 16 · Jest 30 · Next.js 15 · Refine 5 · Ant Design 5 · Tailwind 4 · zod · bcrypt · Joi · MailerSend · Biome 2 · lefthook · commitlint
