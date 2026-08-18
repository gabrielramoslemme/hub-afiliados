# Painel — `@porto/painel`

Next 15 (App Router) + Refine 5 + Ant Design 5 + Tailwind 4. Backoffice da fila de aprovação, consumindo o canal `/v1/admin` da API. Regras do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md).

## Onde cada coisa mora

| Pasta | O que mora |
|---|---|
| `src/app/` | rotas do App Router. Grupos: `(auth)` públicas, `(painel)` autenticadas |
| `src/resources/<recurso>/` | as telas do recurso Refine: `list.tsx`, `show.tsx` e componentes próprios |
| `src/core/http/` | `apiClient` e o tipo de erro da API |
| `src/core/providers/` | `RefineProvider`, `dataProvider`, `authProvider` |
| `src/core/auth/` | leitura e escrita da sessão em cookie |
| `src/core/theme/` | tema do Ant Design |

Alias `@/*` → `src/*`.

**A rota é casca:** `page.tsx` importa e monta o componente de `src/resources/`, nada mais. A tela mora no recurso, não na rota — isso mantém a rota do Next trocável sem reescrever a tela.

## Dados

`dataProvider` (Refine) → `apiClient` (fetch). **Nunca chame `fetch` direto.**

- `apiClient<T>(path, init?)` prefixa `NEXT_PUBLIC_API_BASE_URL`, injeta `Authorization: Bearer` do cookie `porto_access_token`, trata `204` como `undefined` e converte o corpo de erro padrão da API em `ApiError`, com `statusCode` e `code`. **A tela escolhe a mensagem pelo `code`, nunca pelo texto.**
- Rota pública (login, esqueci a senha): `apiClient(path, { auth: false })`.
- `dataProvider` monta `/admin/<resource>` — o nome do recurso no Refine é o segmento da rota da API (`affiliates`).
- Paginação: envia `page` e `limit`, lê `{ data, total }` (`PaginatedResult<T>` de `@porto/contracts`). Filtro vira query string pelo nome do campo; ordenação, `sortBy` e `sortOrder`.

## Tipos e validação

- **Resposta:** importar de `@porto/contracts` (`AffiliateListItem`, `AffiliateDetail`, `AffiliateStatusHistoryItem`, `AdminLoginResponse`). Não redeclare — é essa importação que faz o painel quebrar em build quando o DTO muda na API.
- **Formulário:** `react-hook-form` + `@hookform/resolvers/zod` com o schema de `@porto/contracts` (`adminLoginSchema`, `rejectAffiliateSchema`, `resetPasswordSchema`). As mensagens já vêm em pt-BR do schema — não duplique texto de validação no componente.

## UI

- **Ant Design é o sistema de componentes.** Não recrie o que ele já tem (`Table`, `Tag`, `Modal`, `Timeline`, `Form`). Tailwind entra só para layout pontual.
- **Tema** em `src/core/theme/theme.ts` (`colorPrimary: #0046C0`, `borderRadius: 8`), mesclado com `RefineThemes.Blue` no `ConfigProvider`. Cor ou raio novo vira token do tema, não valor solto no componente.
- **Notificação:** `useNotificationProvider` do `@refinedev/antd`, já registrado no `RefineProvider`. Sem wrapper de toast nem hook de loading global.
- **`'use client'` só onde há estado, efeito ou hook do Refine.** `layout.tsx` e as `page.tsx` de casca ficam no servidor.
- Textos em pt-BR, hardcoded no JSX. Não há i18n nesta onda.

## Atenção: `useSearchParams` exige boundary de Suspense

O `RouteChangeHandler` do `@refinedev/nextjs-router` usa `useSearchParams()`, que o Next exige dentro de um `<Suspense>` para prerenderizar — daí o boundary em volta do `<Refine>` em `refine-provider.tsx`. Componente próprio que leia a query string precisa do mesmo tratamento. Sem ele o `next build` falha, e o erro aponta para a rota, não para o hook.

## Atenção: pacote do workspace precisa entrar em `transpilePackages`

`next.config.mjs` lista `['@porto/contracts']`. Pacote novo do monorepo consumido pelo painel precisa ser adicionado ali, senão o Next tenta carregar o build como dependência externa e falha em runtime.

## Comandos

```bash
npm run dev --workspace apps/painel          # porta 3005
npm run build --workspace apps/painel        # o erro de prerender só aparece aqui
npm run type-check --workspace apps/painel
```

`NEXT_PUBLIC_API_BASE_URL` vive em `.env.local` (modelo em `.env.example`). Trocou a porta da API? Ajuste aqui e o `PANEL_BASE_URL` no `.env` da API, que é a origem liberada no CORS.
