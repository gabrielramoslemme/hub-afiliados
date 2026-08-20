# Porto Hub de Afiliados

Monorepo da API e do painel do Hub de Afiliados da Porto Serviços.

| Pacote | O que é |
|---|---|
| `apps/api` | API NestJS. Três canais: `/v1/mobile` (app), `/v1/admin` (painel), `/v1/webhooks`. |
| `apps/painel` | Painel de backoffice em Next.js + Refine. |
| `packages/contracts` | Tipos e schemas zod dos DTOs que o painel consome da API. |
| `packages/tsconfig` | Configurações TypeScript compartilhadas. |

O aplicativo Flutter do afiliado fica em repositório próprio e consome o
`openapi.json` publicado pela API.

## Pré-requisitos

- **Node 24 ou superior** (`nvm use` ou `fnm use` lê o `.nvmrc`, que pinha a LTS
  vigente). O `engine-strict` está ligado: em versão anterior o `npm install`
  falha de propósito.
- **npm** — nunca `pnpm` ou `yarn`. O `package-lock.json` da raiz é a fonte única.
- **Docker**, para o Postgres local.

## Começando

```bash
nvm use                                   # ou: fnm use
npm install

cp apps/api/.env.example apps/api/.env
cp apps/painel/.env.example apps/painel/.env.local

npm run db:up                                 # sobe o Postgres
npm run typeorm:run --workspace apps/api      # cria e atualiza o schema
npm run seed --workspace apps/api             # termos vigentes + operadores do painel

npm run dev                                   # sobe API e painel juntos
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

A raiz só tem o que vale para o repositório inteiro:

| Comando | O que faz |
|---|---|
| `npm run dev` | API e painel em modo watch |
| `npm run lint` | Biome: lint, formatação e ordem de imports no repositório inteiro |
| `npm run type-check` | `tsc --noEmit` em todos os pacotes |
| `npm run test` | Testes unitários |
| `npm run build` | Build de todos os pacotes |
| `npm run format` | Biome aplicando as correções automáticas |
| `npm run db:up` / `db:down` | Sobe / derruba o Postgres |

O que pertence a um pacote mora nele:

| Comando | O que faz |
|---|---|
| `npm run test:e2e --workspace apps/api` | Testes de integração da API (exige Postgres no ar) |
| `npm run typeorm:create --workspace apps/api --name=X` | Cria migration com timestamp real da CLI |
| `npm run typeorm:run --workspace apps/api` | Aplica as migrations |
| `npm run typeorm:revert --workspace apps/api` | Reverte a última migration |
| `npm run seed --workspace apps/api` | Popula termos vigentes e operadores |
| `npm run openapi:generate --workspace apps/api` | Gera `apps/api/openapi.json` |

Migration nova: `npm run typeorm:create --workspace apps/api --name=MinhaMigration`. O
timestamp vem da CLI do TypeORM — nunca escreva o nome do arquivo à mão.

## E-mails

Em desenvolvimento e teste, `MAIL_PROVIDER=logger` simula o envio e imprime o
conteúdo no log — sem custo e sem risco de disparar para endereço real. Em
homologação e produção, use `mailersend`. Detalhes em
[`apps/api/docs/EMAILS.md`](apps/api/docs/EMAILS.md).

## Termos e condições

O aceite do afiliado aponta para a linha de `terms_versions` vigente no momento
do cadastro, e é isso que dá valor jurídico ao registro. Duas consequências
operacionais:

- **Versão publicada nunca é editada.** Corrigir o texto de uma versão já aceita
  reescreve o que as pessoas aceitaram. Texto novo é linha nova.
- **Só uma linha pode ter `is_current = true`** — o índice parcial
  `uq_terms_versions_current` recusa a segunda. Publicar é, portanto, despromover
  a vigente e promover a nova **na mesma transação**:

```sql
BEGIN;
UPDATE terms_versions SET is_current = false WHERE is_current = true;
INSERT INTO terms_versions (version, content_url, published_at, is_current)
VALUES ('2.0', 'https://.../termos/2.0', now(), true);
COMMIT;
```

Quem já aceitou a `1.0` continua apontando para ela. Cadastro enviado com uma
versão que não é mais a vigente é recusado com `OUTDATED_TERMS`, e o app relê os
termos em `GET /v1/mobile/terms/current`.

Em desenvolvimento, `npm run seed --workspace apps/api` publica a `1.0-homolog`
provisória — o texto oficial é dependência do Jurídico da Porto.

## Contrato para o aplicativo

O `openapi.json` é artefato de build, não fonte — não é versionado no git. A CI
o gera a cada push e publica como artefato, nomeado pelo SHA do commit.

## Documentação

As regras de cada pacote ficam no `CLAUDE.md` dele — [`apps/api`](apps/api/CLAUDE.md),
[`apps/painel`](apps/painel/CLAUDE.md) e
[`packages/contracts`](packages/contracts/CLAUDE.md). O
[`CLAUDE.md` da raiz](CLAUDE.md) traz o que vale no repositório inteiro:
convenções de código, regras invioláveis e o estado atual da implementação.
