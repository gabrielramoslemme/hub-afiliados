---
name: create-web-screen
description: Use ao criar ou alterar tela em apps/web do porto-hub-afiliados — "nova página", "cria a tela", "adiciona a seção na landing", "monta o formulário", "tela do painel" — na landing page, no cadastro ou no painel de análise.
---

# Criar tela em `apps/web`

## Antes de escrever

1. **De quem é a tela?** Do afiliado mora em `src/app/(affiliate)/`, com a feature em `src/affiliate/features/<nome>/`; da Porto, em `src/app/(admin)/admin/(shell)/`, com a feature em `src/admin/features/<nome>/`. O route group decide layout e bundle, e o Biome não deixa uma fatia importar da outra — ver `CLAUDE.md` do pacote.
2. **A rota já existe na API?** `/v1/admin`, `/v1/affiliate/auth`, `GET /v1/affiliate/me` e `PATCH /v1/affiliate/me/pix-key` existem. Só a carteira (`/v1/affiliate/me/wallet`) ainda é dublada, em `src/shared/http/mocks/mock-api.ts`.
3. **A resposta ou o schema já estão em `@porto/contracts`?** Se a API e a web dividem o tipo, ele sai de lá — skill `create-contract`. **Não redeclare.**

## Ordem

1. **Teste primeiro**, para o que é lógica: parser de query string, máscara, tradução de `code` em mensagem, schema, Server Action. **Componente não tem teste** — nem de apresentação, nem formulário. Regra que mora dentro de um componente (qual campo vai no PATCH, para onde um link aponta) sai para uma função pura ao lado e ganha o teste ali, como `coupon-changes.ts` e `site-destinations.ts`.

2. **A rota é casca.** `page.tsx` importa e monta a tela da feature (`src/<fatia>/features/<nome>/`), e nada mais. `metadata` e leitura de `params`/`searchParams` ficam na rota; o resto, na feature.

3. **Server Component por padrão.** `'use client'` só onde há estado, efeito ou Radix. Se a tela precisa de filtro, ordenação ou página, o estado mora na **URL** e a rota lê `searchParams` — não crie estado de cliente para isso.

4. **Leitura** por `authedApiFetch` (painel), `affiliateApiFetch` (área do afiliado) ou `publicApiFetch` (rota pública), sempre no `data.ts` da feature — que importa `server-only` e por isso **não** é reexportado pelo `index.ts`. Backoffice lê com `cache: 'no-store'`. **Nunca chame `fetch` direto** e nunca exponha `API_BASE_URL` ao navegador.

5. **Escrita** é Server Action em `*.action.ts`:
   - revalida a entrada com o mesmo schema zod do formulário;
   - devolve resultado tipado (`{ status: 'invalid' | 'failed' | 'success' }`), **nunca lança para a UI**;
   - traduz `ApiError.code` em erro de campo — a tela escolhe a mensagem pelo `code`, nunca pelo texto;
   - chama `revalidatePath` de **toda** rota que a escrita muda: a lista e o detalhe, não só uma.

6. **Formulário:** `react-hook-form` + `zodResolver` com o schema de `@porto/contracts`. Campo dentro de `<Field>` (`src/shared/components/ui/field.tsx`) e `fieldAria` no controle — sem isso o erro não é anunciado por leitor de tela.

7. **Componente** de `src/shared/components/ui/`. Falta algum? `npx shadcn add <nome>` respeita o `components.json` e já usa os nossos aliases. Não recrie o que o Radix resolve — foco, portal, rolagem travada e teclado são o motivo de ele existir.

## Regras que o lint não pega

- **Nenhuma cor, sombra ou raio literal.** Só token do `@theme`. Valor novo entra no `globals.css` **e** em `extendTailwindMerge`, em `src/shared/lib/cn.ts` — senão o `tailwind-merge` descarta a classe em silêncio.
- **CPF mascarado em listagem**, completo só no detalhe.
- **`public_id` na URL**, nunca o id serial.
- **Texto de usuário em pt-BR**; identificador, arquivo e descrição de teste em inglês.
- **Número que depende da Porto** (comissão, desconto, prazo) vive em `pendingFromPorto`, em `src/affiliate/shared/content.ts`. Nunca no JSX.
- **Seção nova na landing não repete o ritmo da anterior** — ver as sete regras no `CLAUDE.md` do pacote.

## Fechamento

```bash
npm run lint && npm run type-check --workspace apps/web && npm run test --workspace apps/web
npm run build --workspace apps/web
```

O `build` é obrigatório: erro de prerender e de client manifest só aparece nele.
