# Portal web do afiliado — LP, cadastro e painel num só Next

**Data:** 2026-08-21 · **Épico:** SIS-508 · **RF:** RF-01 (invertido), RF-02, RF-06, RF-07

Substitui o canal mobile pelo canal web. **Inverte o RF-01**, que hoje afirma no repositório
de docs que o aplicativo mobile é o canal único e que *"não há versão web responsiva no
escopo"*. Não há mais app Flutter: a jornada do afiliado passa a ser web responsiva, no
mesmo Next que serve o backoffice.

> **Pendência de documentação.** `porto-hub-afiliados-docs` continua descrevendo o canal
> mobile em `01-visao-e-fronteiras.md`, `02-requisitos-funcionais.md` (RF-01) e nas specs
> 03, 09, 10 e 12. Atualizar é trabalho daquele repositório, fora deste commit.

## Recorte

| Entra | Fica de fora |
|---|---|
| Landing page pública | Área logada do afiliado |
| Cadastro do afiliado, **integrado de verdade** com a API | Aceite de Termos (card 2.1) |
| Painel administrativo completo, **contra dublê em memória** | Rotas de auth e de aprovação na API (cards 3.x, 4.x) |
| Renomear o canal `/v1/mobile` → `/v1/affiliate` | Deploy e infraestrutura (spec 19) |

O painel nasce inteiro contra dublê porque a API não tem uma linha de login nem de fila.
O dublê finge **a API**, nunca o nosso encanamento: quando as rotas nascerem, a flag
sai e nenhuma tela muda.

## Decisões de desenho

### O TanStack Query fica fora desta entrega

Foi pedido no enunciado e estou recusando com o aval do solicitante. A fila do admin é
filtro, ordenação e página — estado de URL. `searchParams` num Server Component resolve
isso com URL compartilhável, streaming por `Suspense` e zero JavaScript de dados no
cliente; aprovar e reprovar são Server Actions com `revalidatePath`. Uma camada de cache
de cliente para gerenciar o que já está na URL é peso morto.

Se uma tela futura precisar de polling ou de lista otimista, o React Query volta em um
arquivo. Não é porta fechada, é porta que ainda não precisou abrir.

### O navegador não fala com a API

`API_BASE_URL` deixa de ser `NEXT_PUBLIC_`. Todo acesso à API sai do servidor do Next —
Server Action no cadastro, RSC no painel. Três consequências, todas boas: o CORS deixa de
existir como superfície, o token de sessão vive em cookie `httpOnly` (hoje o painel guarda
em `js-cookie`, legível por qualquer script), e existe um ponto natural para rate limit
antes de a requisição chegar na API.

### O aceite de termos não vira checkbox

O RF-03 exige registrar **qual versão** a pessoa aceitou e **quando**. O card 2.1 saiu de
escopo: não há tabela, não há rota, e o `ValidationPipe` da API rejeita campo desconhecido.
Um checkbox aqui registraria nada e daria aparência de prova jurídica onde não há prova.

No lugar vai a frase de consentimento sob o botão, com link para Regulamento e Política de
Privacidade. É o máximo honesto sem o card 2.1, e está registrado como lacuna, não como
esquecimento.

### Os números que a Porto ainda não definiu não aparecem inventados

Percentual de desconto, valor por venda e prazo de análise são definição da Porto
(dependência D10) e estão fora deste recorte. Viram constantes em `core/content/`, hoje
`null`. A copy é escrita para funcionar sem eles — *"você é remunerado a cada venda
validada com o seu cupom"*, não *"ganhe R$ 25"*. Quando a Porto definir, troca-se um valor
num arquivo e a seção passa a exibir o número.

### O canal se chama `affiliate`

`/v1/mobile` foi batizado pelo app que deixou de existir. Vira `/v1/affiliate`, que casa
com `AuthAudienceEnum.AFFILIATE` e com o `AffiliateGuard` do card 3.1. Custa um commit
hoje — uma rota, um módulo, um e2e, três documentos. Com seis rotas, custaria um dia.

`POST /v1/affiliate/affiliates` é redundante e eu sei. A regra — o primeiro segmento nomeia
a audiência, o segundo nomeia o recurso — vale mais que a estética de uma rota.

> **Revisto em 2026-08-24:** decisão revertida. O cadastro não tem audiência — é a única
> rota pública do domínio, sem guard — então marcar canal nela só duplicava "affiliate". A
> rota é `POST /v1/affiliates`: recurso no plural, sem segmento de canal, ação sempre pelo
> verbo HTTP. A regra canal/recurso continua valendo para toda rota com guard de audiência.

## Estrutura

`apps/painel` → `apps/web` por `git mv`. Saem `antd`, `@ant-design/*`, `@refinedev/*`,
`dayjs` e `js-cookie`, e com eles `refine-provider.tsx`, `data-provider.ts` e
`core/theme/theme.ts`.

```
apps/web/src/
  app/
    layout.tsx              <html lang="pt-BR">, next/font, <Toaster/>
    globals.css             @theme com os tokens Porto
    (site)/                 LP, /cadastro, /cadastro/sucesso
    (admin)/                /admin/login, /admin/afiliados[/publicId]
  features/
    landing/                as seções da LP
    registration/           formulário, server action, máscaras
    admin-affiliates/       fila, detalhe, decisões
    admin-auth/
  components/ui/            shadcn — components.json versionado
  core/http/                api-client server-only
  core/content/             copy da LP e os números pendentes
  mocks/                    o dublê do canal /admin e as fixtures
  middleware.ts             matcher ['/admin/:path*']
```

Vale a regra que o `CLAUDE.md` do painel já fixou: **`page.tsx` é casca** — importa e monta
a tela de `features/`. `resources/` vira `features/` porque *resource* era vocabulário do
Refine.

## Sistema de componentes

shadcn de verdade: `components.json` versionado, `npx shadcn add` continua funcionando.
Tokens no `@theme` do Tailwind 4, com a paleta Porto mapeada nos tokens semânticos do
shadcn. **Nenhuma cor literal em componente.**

| Token | Valor |
|---|---|
| `brand-900` | `#003399` |
| `brand-600` | `#0046C0` |
| `brand-500` | `#2662C9` |
| `brand-400` | `#00A1FC` |
| `brand-300` | `#66CAFC` |
| `brand-100` | `#CCE3FC` |
| `brand-50` | `#F0F7FF` |

### As sete regras que impedem a cara de template gerado

As duas referências (`agoravoceresolve.com.br`, `aliancasdesucesso.com`) foram elas próprias
geradas por IA — `importmap` para `aistudiocdn.com`, Tailwind por CDN, sem build. Aproveito
paleta, arquitetura de seções e tom de voz; descarto a execução.

1. **Uma família só, escala rígida.** Inter por `next/font`, tracking negativo no display,
   numeral tabular nos dados. Fonte de novidade é tell.
2. **Fio de 1px no lugar de sombra.** Sombra só onde há elevação real: dropdown, dialog.
3. **Um destaque, usado pouco.** O azul carrega; o ciano aparece no máximo duas vezes por
   tela.
4. **Nenhuma seção repete o ritmo da anterior.** Hero assimétrico, processo em régua
   numerada, benefícios em bento de tamanhos diferentes.
5. **Zero emoji, zero blob flutuante, zero glass decorativo.**
6. **Copy específica:** síndico, creator do mercado imobiliário, clube de compra — nunca
   "profissionais".
7. **Movimento discreto,** CSS puro, respeitando `prefers-reduced-motion`.

## A landing page

Header → hero → para quem é → como funciona (5 passos) → o que você recebe → como explicar
ao cliente → perguntas frequentes → formulário → footer.

O hero traz o **cupom desenhado**, não foto de banco de imagem: o cupom é o produto. "Como
explicar ao cliente" mostra o campo de cupom do checkout sendo preenchido — concreto, do
jeito que a referência acerta.

O formulário fica no fim da LP, e a mesma ilha atende `/cadastro` para link direto. A LP
inteira é RSC estático; o formulário é a única ilha de cliente, com o menu mobile.

Cinco campos, espelhando o DTO da API: nome completo, e-mail, CPF, tipo de chave PIX,
chave PIX.

## Fluxo do cadastro

1. `react-hook-form` + `zodResolver` com `createAffiliateSchema` de `@porto/contracts` —
   erro inline, mensagens pt-BR vindas do schema.
2. Envio pelo Server Action `registerAffiliate`, que revalida com o mesmo schema.
3. O action chama `POST /v1/affiliate/affiliates` pelo servidor.
4. `RegistrationErrorCodeEnum` vira erro no campo certo: `EMAIL_ALREADY_REGISTERED` no
   e-mail, `CPF_ALREADY_REGISTERED` e `INVALID_CPF` no CPF, `PIX_KEY_INVALID` e
   `PIX_KEY_MISMATCH` na chave.
5. Sucesso redireciona para `/cadastro/sucesso`, que é estática e não expõe `publicId`.

**O DTO da API continua sendo a autoridade.** O schema zod serve ao formulário; divergência
entre os dois degrada para uma mensagem de servidor, nunca para uma UX quebrada.

## Painel

| Rota | Tela |
|---|---|
| `/admin/login` | e-mail e senha, `adminLoginSchema` |
| `/admin/afiliados` | fila: busca, filtro por status, ordenação, paginação |
| `/admin/afiliados/[publicId]` | detalhe, trilha, aprovar e reprovar |

CPF mascarado na listagem, completo no detalhe — regra inviolável do `CLAUDE.md`. A
reprovação exige motivo, validado por `rejectAffiliateSchema`.

`middleware.ts` protege `/admin/:path*`, liberando só `/admin/login`. Sessão em cookie
`httpOnly`, `sameSite: lax`, `secure` fora de dev.

Dublê em `src/mocks/mock-api.ts`, atrás de `API_MOCKING=enabled`: o `api-client`
troca a função de transporte, e o dublê devolve `null` para o que não é do canal
`/admin`, deixando o cadastro público seguir para a API de verdade. Fixtures
determinísticas cobrindo os quatro status de `AffiliateStatusEnum`.

> **Por que não MSW.** Foi a primeira tentativa e quebrou: o MSW remenda o
> `globalThis.fetch` uma vez, no boot, e o Next reaplica o próprio patch de cache
> a cada recompilação — o interceptador some no primeiro Fast Refresh e o painel
> passa a receber `ECONNREFUSED` sem nada no log explicar. Trocar a função de
> transporte não depende de estado global sobreviver ao recarregamento.

## Testes

`apps/web` não tem setup de teste hoje. Entra `next/jest` — Jest 30 já está no monorepo, não
trago Vitest. O teste que falha vem antes da implementação, em:

- máscaras de CPF e telefone: funções puras
- `createAffiliateSchema`: aceita e recusa o que o DTO aceita e recusa
- tradução de `RegistrationErrorCodeEnum` em erro de campo
- o server action, com `fetch` dublado
- o formulário: renderiza erro e trava durante o envio

## Contratos

Entram em `@porto/contracts`: `createAffiliateSchema` (zod, pt-BR) e
`CreateAffiliateResponse`.

## Quality gate

```bash
npm run lint && npm run type-check && npm run test
npm run build
```

Mexeu na rota da API: `npm run test:e2e --workspace apps/api` e `openapi:generate`.
