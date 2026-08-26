# Porto Hub de Afiliados

Monorepo da API e da aplicação web do Hub de Afiliados da Porto Serviços.

| Pacote | O que é |
|---|---|
| `apps/api` | API NestJS. Três canais: `/v1/affiliate` (portal), `/v1/admin` (painel), `/v1/webhooks`. |
| `apps/web` | Next.js 15 + React 19 + shadcn. Landing page, cadastro do afiliado e painel de análise. |
| `packages/contracts` | Tipos e schemas zod dos DTOs que a web consome da API. |
| `packages/tsconfig` | Configurações TypeScript compartilhadas. |

O canal do afiliado é web responsivo. Não há aplicativo mobile.

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
cp apps/web/.env.example apps/web/.env.local

npm run db:up                                 # sobe o Postgres
npm run typeorm:run --workspace apps/api      # cria e atualiza o schema
npm run seed --workspace apps/api             # operadores do painel

npm run dev                                   # sobe API e web juntos
```

| Serviço | URL |
|---|---|
| API | http://localhost:3000/v1 |
| Swagger | http://localhost:3000/v1/docs |
| Landing page | http://localhost:3005 |
| Painel de análise | http://localhost:3005/admin/login |

Se a porta 3000 já estiver em uso na sua máquina, mude `PORT` no `apps/api/.env`
e ajuste `API_BASE_URL` no `apps/web/.env.local`.

### O painel fala com a API

Entre em http://localhost:3005/admin/login com um dos operadores do seed abaixo.
A fila, o detalhe, o histórico, a aprovação e a reprovação passam pelo canal
`/v1/admin`, então a API precisa estar no ar, com as migrations aplicadas e o
seed rodado.

Aprovar um cadastro dispara o e-mail `REGISTRATION_APPROVED` com o link de
definir senha, válido por 48 horas. Em desenvolvimento o provider é o `logger`:
o link sai no console da API, e a tela `/definir-senha` ainda não existe.

### O ciclo do afiliado, de ponta a ponta

Para ver o fluxo inteiro rodando contra a API:

1. Cadastre-se em http://localhost:3005/cadastro.
2. Aprove o cadastro no painel, em http://localhost:3005/admin/afiliados.
3. O e-mail de aprovação sai no **console da API** (`MAIL_PROVIDER=logger` em
   desenvolvimento). Copie o link de `/definir-senha` — ele vale 48 horas e
   funciona uma vez só.
4. Crie a senha e entre em http://localhost:3005/entrar.

### A carteira ainda roda contra dublê

`GET /v1/affiliate/me/wallet` não existe na API — saldo e extrato dependem de
tabelas que a Onda 1 não tem. Com `API_MOCKING=enabled` no `apps/web/.env.local`,
um dublê em memória responde no lugar dela.

O dublê cobre apenas esse prefixo; todo o resto vai para a API de verdade com a
mesma flag ligada. Quando a rota nascer, tire a flag.

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
| `npm run dev` | API e web em modo watch |
| `npm run dev:web` | Só a web (3005), sem subir a API |
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
| `npm run seed --workspace apps/api` | Popula os operadores |
| `npm run openapi:generate --workspace apps/api` | Gera `apps/api/openapi.json` |

Migration nova: `npm run typeorm:create --workspace apps/api --name=MinhaMigration`. O
timestamp vem da CLI do TypeORM — nunca escreva o nome do arquivo à mão.

## E-mails

Em desenvolvimento e teste, `MAIL_PROVIDER=logger` simula o envio e imprime o
conteúdo no log — sem custo e sem risco de disparar para endereço real. Em
homologação e produção, use `resend`. Os templates são componentes React Email
versionados em `apps/api/src/infra/services/email/templates/`, não ficam no
painel do fornecedor. Detalhes em
[`apps/api/docs/EMAILS.md`](apps/api/docs/EMAILS.md).

## Contrato da API

O `openapi.json` é artefato de build, não fonte — não é versionado no git. A CI
o gera a cada push e publica como artefato, nomeado pelo SHA do commit.

## Documentação

As regras de cada pacote ficam no `CLAUDE.md` dele — [`apps/api`](apps/api/CLAUDE.md),
[`apps/web`](apps/web/CLAUDE.md) e
[`packages/contracts`](packages/contracts/CLAUDE.md). O
[`CLAUDE.md` da raiz](CLAUDE.md) traz o que vale no repositório inteiro:
convenções de código, regras invioláveis e o estado atual da implementação.
