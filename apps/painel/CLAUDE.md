# Painel — `@porto/painel`

Next 15 (App Router) + Refine 5 + Ant Design 5 + Tailwind 4. Backoffice da fila de aprovação, consumindo o canal `/v1/admin` da API.

Regras globais do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md). Este arquivo cobre o que é específico do painel.

## Estrutura

| Pasta | O que mora |
|---|---|
| `src/app/` | rotas do App Router. Grupos: `(auth)` públicas, `(painel)` autenticadas |
| `src/core/http/` | `apiClient` e o tipo de erro da API |
| `src/core/providers/` | `RefineProvider`, `dataProvider`, `authProvider` |
| `src/core/theme/` | tema do Ant Design |
| `src/core/auth/` | leitura e escrita da sessão em cookie |
| `src/resources/<recurso>/` | as telas do recurso Refine: `list.tsx`, `show.tsx` e componentes próprios |

Alias: `@/*` → `src/*`.

**Regra de divisão:** `src/app/**/page.tsx` é casca — importa e monta o componente de `src/resources/`. A tela mora no recurso, não na rota. Isso mantém a rota do Next trocável sem reescrever a tela.

## Dados

Toda chamada à API passa por `dataProvider` (Refine) → `apiClient` (fetch). **Nunca chame `fetch` direto.**

- `apiClient<T>(path, init?)` prefixa `NEXT_PUBLIC_API_BASE_URL`, injeta `Authorization: Bearer` a partir do cookie `porto_access_token`, trata `204` como `undefined` e converte o corpo de erro padrão da API em `ApiError` — com `statusCode` e `code`. É pelo `code` que a tela escolhe a mensagem, não pelo texto.
- Rota pública (login, esqueci a senha): `apiClient(path, { auth: false })`.
- `dataProvider` monta `/admin/<resource>`, então o nome do recurso no Refine é o segmento da rota da API (`affiliates`).
- Paginação: envia `page` e `limit`, lê `{ data, total }` — é o `PaginatedResult<T>` de `@porto/contracts`. Filtro vira query string pelo nome do campo; ordenação vira `sortBy` e `sortOrder`.

## Tipos e validação

- **Tipo de resposta:** importar de `@porto/contracts` (`AffiliateListItem`, `AffiliateDetail`, `AffiliateStatusHistoryItem`, `AdminLoginResponse`). Não redeclare — é essa importação que faz o painel quebrar em build quando o DTO muda na API.
- **Formulário:** `react-hook-form` + `@hookform/resolvers/zod`, com o schema de `@porto/contracts` (`adminLoginSchema`, `rejectAffiliateSchema`, `resetPasswordSchema`). As mensagens de erro já vêm em pt-BR do schema — não duplique texto de validação no componente.

## UI

- **Ant Design é o sistema de componentes.** Tailwind 4 está disponível para layout pontual. Não recrie um componente que o antd já tem (`Table`, `Tag`, `Modal`, `Timeline`, `Form`).
- **Tema** em `src/core/theme/theme.ts` (`colorPrimary: #0046C0`, `borderRadius: 8`), mesclado com `RefineThemes.Blue` no `ConfigProvider`. Cor ou raio novo entra como token do tema, não hardcoded no componente.
- **Notificação:** `useNotificationProvider` do `@refinedev/antd`, já registrado no `RefineProvider`. Não crie wrapper de toast nem hook de loading global.
- **`'use client'` só onde há estado, efeito ou hook do Refine.** `layout.tsx` e as `page.tsx` de casca ficam no servidor.
- Textos em pt-BR, hardcoded no JSX. Não há i18n nesta onda.

## Atenção: `useSearchParams` exige boundary de Suspense

O `RouteChangeHandler` do `@refinedev/nextjs-router` usa `useSearchParams()`, que o Next exige dentro de um `<Suspense>` para prerenderizar — daí o boundary em volta do `<Refine>` em `refine-provider.tsx`. Qualquer componente próprio que leia `useSearchParams()` — a página de redefinir senha lê o `token` da URL — precisa do mesmo tratamento. Sem ele o `next build` falha, e o erro aponta para a rota, não para o hook.

## Atenção: pacote do workspace precisa entrar em `transpilePackages`

`next.config.mjs` lista `['@porto/contracts']`. Pacote novo do monorepo consumido pelo painel precisa ser adicionado ali, senão o Next tenta carregar o build como dependência externa e falha em runtime.

## Atenção: o painel ainda é só o esqueleto

Existem `layout.tsx`, uma `page.tsx` de placeholder, `apiClient`, `dataProvider`, tema e `RefineProvider`. **Não existem** `authProvider`, `middleware.ts`, os grupos de rota `(auth)` e `(painel)`, nem o recurso de afiliados — são as Specs 16 e 17, e elas dependem das rotas `/admin` da API (Specs 13 a 15).

## Skills

`create-panel-screen` — criar tela ou recurso do Refine.

## Comandos

```bash
npm run dev --workspace apps/painel        # porta 3005
npm run build --workspace apps/painel
npm run type-check --workspace apps/painel
```

`NEXT_PUBLIC_API_BASE_URL` vive em `.env.local` (modelo em `.env.example`). Trocou a porta da API? Ajuste aqui e o `PANEL_BASE_URL` no `.env` da API, que é a origem liberada no CORS.
