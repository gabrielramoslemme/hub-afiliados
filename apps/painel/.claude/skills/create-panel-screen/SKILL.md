---
name: create-panel-screen
description: Use ao criar tela ou recurso no painel do porto-hub-afiliados — "cria a tela", "lista de afiliados", "tela de detalhe", "novo recurso do Refine", "adiciona a rota do painel" — em Next 15 + Refine + Ant Design.
---

# Criar tela do painel

## Antes: a fundação existe?

O painel hoje é esqueleto — há `layout.tsx`, uma `page.tsx` de placeholder, `apiClient`, `dataProvider`, tema e `RefineProvider`. **Não existem** `authProvider`, `middleware.ts` nem os grupos de rota `(auth)` e `(painel)`.

A primeira tela autenticada exige a **Spec 16** (autenticação do painel) antes. E toda tela depende das rotas `/v1/admin` correspondentes já existirem na API.

`docs/specs/17-painel-fila-de-afiliados.md` tem a lista exata de arquivos da fila de afiliados.

## Ordem

1. **Tipos primeiro.** A resposta vem de `@porto/contracts` (`AffiliateListItem`, `AffiliateDetail`). Não redeclare — é essa importação que faz o painel quebrar em build quando o DTO muda na API.

2. **Componentes do recurso** em `src/resources/<recurso>/`:
   ```
   src/resources/affiliates/list.tsx
   src/resources/affiliates/show.tsx
   src/resources/affiliates/status-tag.tsx
   ```
   É aqui que a tela mora.

3. **Rota como casca** em `src/app/(painel)/<rota>/page.tsx` — importa e monta o componente do recurso, nada mais:
   ```tsx
   import { AffiliateList } from '@/resources/affiliates/list';

   export default function AffiliatesPage(): JSX.Element {
     return <AffiliateList />;
   }
   ```
   Isso mantém a rota do Next trocável sem reescrever a tela.

4. **Registrar o recurso** no `RefineProvider`, em `resources`. O `name` do recurso é o segmento da rota da API: `affiliates` → o `dataProvider` chama `/admin/affiliates`.

5. **Verificar o build** — o erro de prerender só aparece aqui:
   ```bash
   npm run build --workspace apps/painel
   ```

## Dados

Nunca chame `fetch` direto. `dataProvider` (Refine) → `apiClient`.

- `apiClient` prefixa a base URL, injeta `Authorization` do cookie `porto_access_token`, e converte o erro padrão da API em `ApiError` com `statusCode` e `code`. **A tela escolhe a mensagem pelo `code`, nunca pelo texto.**
- Rota pública: `apiClient(path, { auth: false })`.
- Paginação: o `dataProvider` envia `page`/`limit` e lê `{ data, total }` — o `PaginatedResult<T>` do contrato.

## UI

- **Ant Design é o sistema de componentes.** Não recrie `Table`, `Tag`, `Modal`, `Timeline`, `Form`. Tailwind entra só para layout pontual.
- Cor ou raio novo vira token em `src/core/theme/theme.ts`, não valor solto no componente.
- Notificação: `useNotificationProvider` do `@refinedev/antd`, já registrado. Sem wrapper de toast.
- `'use client'` só onde há estado, efeito ou hook do Refine. `page.tsx` de casca fica no servidor.
- Formulário: `react-hook-form` + `@hookform/resolvers/zod` com o schema de `@porto/contracts`. A mensagem de validação já vem em pt-BR do schema.

## Atenção: `useSearchParams` exige boundary de Suspense

O Next exige `useSearchParams()` dentro de `<Suspense>` para prerenderizar — é por isso que o `<Refine>` já vem embrulhado em `refine-provider.tsx`. Qualquer componente próprio que leia a query string (a tela de redefinir senha lê o `token`) precisa do mesmo tratamento.

Sem isso o `next build` falha, e o erro aponta para a rota, não para o hook.

## Erros comuns

| Erro | Correção |
|---|---|
| Tela escrita dentro de `src/app/**/page.tsx` | A tela mora em `src/resources/`; a rota é casca |
| `fetch` direto | `dataProvider` → `apiClient` |
| Tipo de resposta redeclarado no painel | Importe de `@porto/contracts` |
| Mensagem de erro escolhida pelo texto da API | Use o `code` do `ApiError` |
| `'use client'` no topo de tudo | Só onde há estado, efeito ou hook do Refine |
| `next build` falha com erro de prerender | `useSearchParams()` sem `<Suspense>` |
| Componente recriado do zero | O antd provavelmente já tem |
| `id` na URL do painel | O identificador é `publicId` |
