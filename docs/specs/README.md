# Specs técnicas — Porto Hub de Afiliados, Onda 1

Referência de implementação. Cada spec traz arquivos exatos, interfaces produzidas e consumidas, e os passos em TDD com o código dos testes e da implementação.

**Os cards do Jira ficam em [`docs/tasks/`](../tasks/)**, em linguagem de produto. Cada card aponta para a spec correspondente no campo **Links**. Esta pasta não vai para o Jira.

> **Para quem executa:** siga a ordem abaixo, uma spec por vez, com commit em cada passo de commit. Use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`.

**Arquitetura:** monorepo npm workspaces + Turborepo com `apps/api` (Nest 11 + TypeORM + Postgres) e `apps/painel` (Next 15 + Refine + Ant Design), compartilhando `packages/contracts`. A API expõe três canais separados por audiência de JWT: `/v1/mobile` para o app Flutter, `/v1/admin` para o painel e `/v1/webhooks` para sistemas externos. Identidade unificada em `users`, com perfil 1:1 em `affiliates`. O app Flutter fica fora do monorepo e consome o `openapi.json` publicado pela API.

**Stack:** TypeScript, NestJS 11, TypeORM 0.3, PostgreSQL 16, Jest 30, Next.js 15, Refine 5, Ant Design 5, Tailwind 4, zod, bcrypt, MailerSend, Turborepo.

**Desenho completo:** [`00-arquitetura.md`](00-arquitetura.md)

---

## Global Constraints

Valem para todas as specs. Os requisitos de cada uma incluem esta seção implicitamente.

- **Node** `>= 20`. Gerenciador: **npm** com workspaces. Nunca `pnpm` ou `yarn`.
- **Escopo dos pacotes:** `@porto/*` (`@porto/api`, `@porto/painel`, `@porto/contracts`, `@porto/tsconfig`, `@porto/eslint-config`).
- **Todas as rotas HTTP sob o prefixo `/v1`.** Sem exceção.
- **Identificador exposto é sempre `public_id` (uuid).** `id` serial nunca aparece em resposta, rota ou log.
- **Nenhuma rota sem guard por omissão.** Rotas públicas exigem o decorator `@Public()` explícito.
- **CPF e chave PIX nunca aparecem em log.** Em listagem, CPF vai mascarado (`***.***.789-01`).
- **Nenhum dado pessoal de cliente final** entra em qualquer tabela ou log — não há integração de vendas nesta onda.
- **Senha com bcrypt**, custo 10. Token de uso único armazenado apenas como hash SHA-256.
- **Commits em Conventional Commits** (`feat:`, `fix:`, `test:`, `chore:`), validados por commitlint.
- **Path aliases da API:** `@Domain/*` → `src/domain/*`, `@Infra/*` → `src/infra/*`, `@Modules/*` → `src/modules/*`, `@Testing/*` → `src/testing/*`.
- **Toda migration é reversível.** `down()` sempre implementado.
- **TDD:** o teste que falha vem antes da implementação, sempre.

## Vocabulário compartilhado

Definido na Spec 04 e usado por todas as seguintes. Não invente sinônimos.

```ts
enum UserTypeEnum      { AFFILIATE = 'AFFILIATE', ADMIN = 'ADMIN' }
enum UserRoleEnum      { PORTO_ANALYST = 'PORTO_ANALYST', PORTO_ADMIN = 'PORTO_ADMIN', MESA_ADMIN = 'MESA_ADMIN' }
enum AffiliateStatusEnum { PENDING_APPROVAL = 'PENDING_APPROVAL', APPROVED = 'APPROVED', REJECTED = 'REJECTED', SUSPENDED = 'SUSPENDED' }
enum PixKeyTypeEnum    { EMAIL = 'EMAIL', PHONE = 'PHONE', CPF = 'CPF' }
enum TokenPurposeEnum  { SET_PASSWORD = 'SET_PASSWORD', RESET_PASSWORD = 'RESET_PASSWORD' }
enum AuthAudienceEnum  { AFFILIATE = 'affiliate', ADMIN = 'admin' }
enum AuthErrorCodeEnum {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  REGISTRATION_UNDER_REVIEW = 'REGISTRATION_UNDER_REVIEW',
  REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
  PASSWORD_NOT_SET = 'PASSWORD_NOT_SET',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
}
enum MailTemplateEnum {
  REGISTRATION_RECEIVED = 'REGISTRATION_RECEIVED',
  REGISTRATION_APPROVED = 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY',
}
```

## Ordem e dependências

```
01 ──┬── 02 ──┬── 05 ── 06 ── 07 ──┬── 09 ── 10 ──┬── 12 ── 18
     │        │                    │              │
     ├── 03 ──┤                    ├── 08 ─────── 11
     │        │                    │
     └── 04 ──┘                    ├── 13 ── 14 ── 15 ──┬── 16 ── 17
                                   │                     │
                                   └─────────────────────┘
```

| # | Spec | Card no Jira | Depende de |
|---|---|---|---|
| [01](01-monorepo-e-ferramental.md) | Fundação do monorepo | 1.1 Monorepo e ferramental | — |
| [02](02-api-base.md) | Esqueleto da API | 1.2 Base da API | 01 |
| [03](03-painel-base.md) | Esqueleto do painel | 1.3 Base do painel | 01 |
| [04](04-contratos-e-openapi.md) | Contratos compartilhados e CI | 1.4 Contrato de API publicado | 01–03 |
| [05](05-modelo-de-dados-nucleo.md) | Entidades núcleo | 1.5 Modelo de dados e ambiente local | 02 |
| [06](06-modelo-de-dados-tokens-e-trilha.md) | Tokens e trilha de status | 1.5 Modelo de dados e ambiente local | 05 |
| [07](07-controle-de-acesso.md) | Hash, JWT, guards e rate limit | 3.1 Controle de acesso por canal | 06 |
| [08](08-emails-transacionais.md) | E-mail transacional | 1.6 Envio de e-mails transacionais | 02 |
| [09](09-cadastro-e-termos.md) | Termos vigentes e pré-cadastro | 2.1 e 2.2 | 07 |
| [10](10-login-do-app.md) | Login do afiliado | 3.2 Login do aplicativo | 09 |
| [11](11-senha-e-recuperacao.md) | Definição e recuperação de senha | 3.3 e 3.4 | 07, 08 |
| [12](12-sessao-e-perfil.md) | Refresh, logout e `/mobile/me` | 3.5 Sessão do aplicativo | 10 |
| [13](13-login-do-painel.md) | Login do painel | 3.6 Login do painel | 07, 11 |
| [14](14-fila-de-aprovacao-api.md) | Fila de aprovação (API) | 4.1 e 4.2 | 13 |
| [15](15-decisao-de-cadastro.md) | Aprovar e reprovar (API) | 4.3 e 4.4 | 14, 11 |
| [16](16-painel-autenticacao.md) | Painel: autenticação | 3.6 Login do painel | 03, 13 |
| [17](17-painel-fila-de-afiliados.md) | Painel: fila e decisão | 4.1 a 4.4 | 16, 15 |
| [18](18-testes-ponta-a-ponta.md) | E2E do ciclo completo | 4.5 Validação do ciclo completo | 15, 12 |

## Fora desta onda

SIS-510 (Home), SIS-516 (Carteira), SIS-517 (Edição de Perfil), SIS-520 (Gestão de Pagamentos), INT-01 (cupom), INT-02 (link de divulgação), INT-03 (eventos de venda), ledger, comissionamento, Transfeera, push, upload de documentos. A seção 12 de [`00-arquitetura.md`](00-arquitetura.md) detalha onde cada um pluga.
