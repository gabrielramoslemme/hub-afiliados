# Porto Hub de Afiliados

Monorepo da API e do painel do Hub de Afiliados da Porto Serviços.

| Pacote | O que é |
|---|---|
| `apps/api` | API NestJS. Três canais: `/v1/mobile` (app), `/v1/admin` (painel), `/v1/webhooks`. |
| `apps/painel` | Painel de backoffice em Next.js + Refine. |
| `packages/contracts` | Tipos e schemas zod dos DTOs que o painel consome da API. |
| `packages/tsconfig` | Configurações TypeScript compartilhadas. |
| `packages/eslint-config` | Configuração ESLint compartilhada. |

O aplicativo Flutter do afiliado fica em repositório próprio e consome o
`openapi.json` publicado pela API.

## Pré-requisitos

- **Node 20 ou superior** (`nvm use` ou `fnm use` lê o `.nvmrc`). O `engine-strict`
  está ligado: com Node 18 o `npm install` falha de propósito.
- **npm** — nunca `pnpm` ou `yarn`. O `package-lock.json` da raiz é a fonte única.
- **Docker**, para o Postgres local.

## Começando

```bash
nvm use                                   # ou: fnm use
npm install

cp apps/api/.env.example apps/api/.env
cp apps/painel/.env.example apps/painel/.env.local

npm run db:up                             # sobe o Postgres
npm run db:migrate                        # cria e atualiza o schema
npm run db:seed                           # termos vigentes + operadores do painel

npm run dev                               # sobe API e painel juntos
```

| Serviço | URL |
|---|---|
| API | http://localhost:3000/v1 |
| Swagger | http://localhost:3000/v1/docs |
| Painel | http://localhost:3005 |

Se a porta 3000 já estiver em uso na sua máquina, mude `PORT` no `apps/api/.env`
e ajuste `NEXT_PUBLIC_API_BASE_URL` no `apps/painel/.env.local`.

### Operadores criados pelo seed

Todos com `should_change_password = true` e senha `MudarAgora!2026`
(sobrescreva com `SEED_ADMIN_PASSWORD`).

| E-mail | Perfil |
|---|---|
| `analista@porto.example` | `PORTO_ANALYST` |
| `admin@porto.example` | `PORTO_ADMIN` |
| `admin@mesa.tech` | `MESA_ADMIN` |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | API e painel em modo watch |
| `npm run lint` | ESLint em todos os pacotes |
| `npm run type-check` | `tsc --noEmit` em todos os pacotes |
| `npm run test` | Testes unitários |
| `npm run test:e2e` | Testes de integração da API (exige Postgres no ar) |
| `npm run build` | Build de todos os pacotes |
| `npm run db:up` / `db:down` | Sobe / derruba o Postgres |
| `npm run db:migrate` / `db:revert` | Aplica / reverte a última migration |
| `npm run db:seed` | Popula termos vigentes e operadores |
| `npm run openapi` | Gera `apps/api/openapi.json` |

Migrations novas: `npm run typeorm:generate --workspace apps/api --name=MinhaMigration`.

## E-mails

Em desenvolvimento e teste, `MAIL_PROVIDER=logger` simula o envio e imprime o
conteúdo no log — sem custo e sem risco de disparar para endereço real. Em
homologação e produção, use `mailersend`. Detalhes em
[`apps/api/docs/EMAILS.md`](apps/api/docs/EMAILS.md).

## Contrato para o aplicativo

O `openapi.json` é artefato de build, não fonte — não é versionado no git. A CI
o gera a cada push e publica como artefato, nomeado pelo SHA do commit.

## Documentação

Escopo, arquitetura e planejamento em [`docs/`](docs/):
[`docs/specs/`](docs/specs/) é a referência técnica e
[`docs/tasks/`](docs/tasks/) são os cards do Jira.
