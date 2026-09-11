# Web — `@porto/web`

Next 15 (App Router) + React 19 + Tailwind 4 + shadcn sobre Radix. **Dois públicos que não se encontram:** o afiliado, que chega pela landing, se cadastra e entra na própria área; e o analista da Porto, que entra no painel para aprovar ou reprovar. Regras do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md).

## Onde cada coisa mora

O primeiro nível de `src/` é o **dono**, não o domínio. Três fatias, e o Biome não deixa uma importar da outra — ver [Fronteira entre as fatias](#fronteira-entre-as-fatias).

| Pasta | O que mora |
|---|---|
| `src/affiliate/features/<nome>/` | `landing`, `registration`, `auth`, `area` — as telas do afiliado |
| `src/affiliate/shared/` | o que a fatia inteira divide: `content.ts` (toda a copy), `routes.ts`, `components/` |
| `src/admin/features/<nome>/` | `auth`, `affiliates`, `campaigns`, `dashboard`, `shell` — as telas da Porto |
| `src/admin/shared/routes.ts` | as rotas do painel |
| `src/shared/` | transversal de verdade: `components/ui/` (shadcn), `components/porto-logo`, `hooks/`, `lib/`, `http/` |
| `src/app/` | só casca de rota, espelhando as fatias em `(affiliate)/` e `(admin)/` |

Alias `@/*` → `src/*`. Um só: o caminho já nomeia o dono.

Dentro de uma feature: `components/`, `index.ts` e, quando há leitura de servidor, `data.ts`.

**A rota é casca:** `page.tsx` importa e monta a tela, nada mais. Isso mantém a rota do Next trocável sem reescrever a tela — e é o que permite `/cadastro` e a seção da landing servirem o mesmo componente.

**O route group não aparece na URL.** `(affiliate)/(public)`, `(affiliate)/(account)` e `(admin)` existem para separar layout e bundle: a landing page não carrega uma linha de código do painel.

**`/admin` é o dashboard, e é a home do painel:** `safeAdminTarget` e o `middleware` mandam para lá depois do login, e a fila virou destino escolhido. O item do dashboard casa a rota por igualdade e não por `startsWith` — sendo a raiz de `/admin`, ele ficaria aceso em toda tela do painel.

### Fronteira entre as fatias

Quatro `overrides` com `noRestrictedImports` no [`biome.jsonc`](../../biome.jsonc) da raiz, no mesmo formato dos que o `apps/api` usa para as camadas:

| Origem | Não importa | Por quê |
|---|---|---|
| `src/admin/**`, `src/app/(admin)/**` | `@/affiliate/**` | o painel não conhece o portal |
| `src/affiliate/**`, `src/app/(affiliate)/**` | `@/admin/**` | e o portal não conhece o painel |
| `src/shared/**` | `@/admin/**`, `@/affiliate/**`, `@/app/**` | a seta aponta para dentro |
| `src/**` | o miolo de outra feature | de fora, só pelo `index.ts` |

O que os dois lados precisam sobe para `src/shared/`. **Nunca** faça `src/shared/` alcançar uma feature: foi essa inversão que colocou a máscara de CPF dentro de `features/registration` com o painel dependendo dela.

`src/middleware.ts` enxerga as duas fatias e **não precisa de exceção escrita** — mora na raiz de `src/`, fora dos globs das regras. Não acrescente um `!` para ele.

### O barrel é a API pública, e `data.ts` fica fora dele

`index.ts` exporta o que atravessa a fronteira da feature, e é **client-safe**: componente, tipo e action `'use server'`.

`data.ts` e `session.ts` importam `server-only`. Reexportá-los do `index.ts` quebraria o build no primeiro `'use client'` que importasse a feature — com erro apontando para o barrel, não para a causa. Por isso são entrada própria, e a regra de deep-import abre exceção só para esses dois nomes:

```ts
import { WalletCard } from '@/affiliate/features/area';        // barrel
import { fetchWallet } from '@/affiliate/features/area/data';  // leitura de servidor
```

**Dentro da feature, import relativo** — nunca o próprio barrel.

## Dados: o navegador não fala com a API

`API_BASE_URL` **não** é `NEXT_PUBLIC_`. Todo acesso à API sai do servidor do Next.

| Função | Quando | Onde |
|---|---|---|
| `publicApiFetch` | rota pública: cadastro, os dois logins | `src/shared/http/api-client.ts` |
| `authedApiFetch` | canal `/admin`; lê o cookie do operador | idem |
| `affiliateApiFetch` | canal `/affiliate/me`; lê o cookie do afiliado | idem |

São três funções e não um parâmetro `auth` de propósito: esquecer um booleano é fácil, escolher o nome errado da função não é. E as duas autenticadas leem **cookies diferentes** — trocar de audiência por engano abriria o canal errado com o token errado. As duas convertem o corpo de erro padrão da API em `ApiError`, com `statusCode` e `code`. **A tela escolhe a mensagem pelo `code`, nunca pelo texto** — a tradução mora em `registration/errors.ts` e em `auth/errors.ts`.

**Escrita é Server Action**, sempre em `*.action.ts` com `'use server'`. O action revalida a entrada com o mesmo schema zod do formulário — é isso que impede um POST montado à mão de contornar a tela — e devolve resultado tipado, nunca lança para a UI.

**Leitura é Server Component.** A fila do admin lê `searchParams`, então filtro, ordenação e página vivem na URL: recarregar, voltar e compartilhar o endereço funcionam de graça, e não há uma linha de JavaScript de dados no cliente. Não há TanStack Query neste app — se uma tela precisar de polling ou lista otimista, ele volta; enquanto não precisar, a URL resolve.

## Tipos e validação

- **Resposta e schema** vêm de `@porto/contracts`. Não redeclare: é essa importação que faz o app quebrar em build quando o DTO muda na API.
- **Formulário:** `react-hook-form` + `@hookform/resolvers/zod` com o schema do contrato. As mensagens em pt-BR já vêm do schema — não duplique texto de validação no componente.
- `createAffiliateSchema` **não valida dígito verificador de CPF**. Quem valida é a API, com `cpf-cnpj-validator`; reimplementar aqui criaria uma segunda fonte da mesma regra. O `INVALID_CPF` da resposta vira erro no campo.

## Design system

Tokens no `@theme` de `src/app/globals.css`: escala `blue-*` para a marca, `cyan-*` para o destaque, `ink-*` para os neutros, mais `--text-display|title|lead|eyebrow`, `--radius-card|panel|pill`, os quatro degraus de sombra, os dois gradientes e os pares de status. Os tokens semânticos do shadcn (`--primary`, `--ring`, `--border`…) apontam para eles.

**Nenhuma cor, sombra, raio ou gradiente literal em componente.** Valor novo vira token; trocar a marca tem que ser reescrever um bloco de CSS, não caçar hex no JSX.

Oito regras que mantêm a página com cara de projetada:

1. Uma família tipográfica (Open Sans, por `next/font`, no peso variável — o token de display pede 800, que o conjunto estático 400/600/700 não cobre), escala rígida, numeral tabular nos dados.
2. **Quatro degraus de elevação e nada além.** `shadow-card` no card que responde ao ponteiro, `shadow-pop` no menu suspenso, `shadow-float` no objeto que paira sobre a faixa escura, `shadow-overlay` no diálogo. Bloco que não se destaca de nada continua com fio de 1px.
3. **Uma faixa escura por documento, e ela é o topo.** `surface-brand` veste o hero e o rodapé; o miolo alterna branco, `ink-50` e `blue-50`.
4. Nenhuma seção repete o fundo da anterior.
5. O ciano é destaque e não cor de apoio: no máximo três aparições por tela.
6. **Gradiente é superfície, nunca enfeite.** `--gradient-brand` e `--gradient-card` vestem uma seção inteira; `surface-mesh` e `surface-grid` só existem para tirar a faixa escura da chapa lisa. Zero emoji, zero blob flutuante.
7. Copy específica — "síndico", "creator do mercado imobiliário" —, nunca "profissionais".
8. Movimento discreto, sempre com saída e sempre degradável — ver abaixo.

Sobre fundo escuro o `Button` tem duas variantes próprias, `inverse` e `inverse-outline`: `primary` é azul e some sobre a faixa da marca. Elas existem para que ninguém resolva isso com um `bg-white` solto no JSX.

### Atenção: a trava da marca não usa o `<text>` do kit

O kit oficial mora em `public/brand/`: a trava em horizontal e vertical, cada uma nas três versões de cor (`primary` colorida, `positive` escura, `negative` branca). Nesses seis arquivos o descritor "Influenciadores" é `<text>` composto em **Porto Roobert**, fonte que o projeto não serve — e SVG dentro de `<img>` não enxerga a fonte da página. Servir um deles direto na tela imprime o descritor na serifada padrão do navegador, com os avanços errados.

Por isso `PortoLogo` monta a trava em duas partes: os dois `porto-servico-wordmark-*.svg`, que são só traçado recortado do arquivo oficial, mais o descritor como texto do documento em Open Sans. **Ao trocar o logotipo, refaça os dois `wordmark` a partir do kit** — não aponte o componente para a trava inteira. As versões `positive` e `negative` do kit ainda trazem um retângulo de fundo chapado, que também precisa sair.

### Ícone da aba

O App Router injeta os `<link>` sozinho a partir do nome do arquivo. São dois conjuntos, um por fatia:

| Arquivo | Vale em | Para quê |
|---|---|---|
| `src/app/icon.svg` | tudo que não é `/admin` | navegador moderno |
| `src/app/favicon.ico` | toda rota | 16, 32 e 48, para quem não lê SVG |
| `src/app/apple-icon.png` | toda rota | 180, tela de início do iOS |
| `src/app/(admin)/admin/icon.svg` | `/admin/**` | a aba do painel |

O desenho é o mesmo nos dois: o símbolo do kit, traçado idêntico ao de `porto-servico-horizontal-primary.svg`, sem redesenho. **A diferença é só o tom do azulejo** — `#4499d4` do kit no portal, `color-blue-900` no painel —, porque quem analisa cadastro abre os dois lado a lado e a 16px a cor é o que separa uma aba da outra. `icon.spec.ts` trava as duas coisas: que o traçado continua vindo do kit e que os dois tons continuam diferentes.

Particularidades que não são enfeite:

- **As velas, no kit, são vazado e não forma branca.** Por isso cada `icon.svg` leva o contorno do azulejo em branco por baixo — sem essa camada elas mostrariam o fundo da aba, e no tema escuro o desenho apareceria invertido.
- **O `apple-icon` é sangrado, sem canto arredondado**, porque o iOS compõe transparência sobre preto e aplica a própria máscara de canto.
- **O painel não tem `.ico` nem `apple-icon` próprios.** Com `icon.ico` e `icon.svg` na mesma pasta o Next linka o `.ico` e **descarta o SVG em silêncio** — a precedência de extensão do `icon.*` escolhe um só. Quem não lê SVG cai no `favicon.ico` da raiz, que o painel continua linkando.
- **O ícone do painel é a única exceção do `middleware`.** Ele é servido de dentro do segmento guardado (`/admin/icon-<hash>.svg`); sem o desvio de `isPanelIconPath`, a tela de login — a única do painel que abre sem sessão — receberia o HTML do redirecionamento no lugar do SVG.

**Os dois raster saem do `src/app/icon.svg`**, e não do kit: mexeu no SVG, refaça os dois com o `sharp` que o Next já traz.

### Gráfico

`recharts` por baixo do `chart.tsx` do shadcn, em `src/shared/components/ui/` — a única biblioteca de desenho do app, e ela entra só na rota que a usa. **Cor de série sai de `--color-chart-1..4`**, nunca de literal no `ChartConfig`: o `ChartContainer` publica cada uma como `var(--color-<série>)`, e é isso que o traço lê. O gráfico é ilha `'use client'` porque o recharts mede o container para desenhar; a tela em volta continua Server Component.

### Movimento

**A rolagem move a página, não o JavaScript.** A entrada das seções usa as timelines nativas do CSS: `.reveal` numa seção, `.reveal-stagger` num container cujos filhos entram escalonados. Onde o navegador não suporta `animation-timeline: view()`, o bloco `@supports` inteiro é ignorado e o conteúdo aparece normalmente — **nunca** deixe um `opacity-0` no JSX esperando um observer, que é como toda biblioteca de scroll-reveal esconde conteúdo quando o JS falha. A barra de progresso do header segue o mesmo desenho, com `scroll()`.

Além dessas duas, mais três presas à mesma timeline: `.reveal-pop` (entrada com escala, para cartão e painel), `.draw-line`/`.draw-line-y` (traço que se preenche no eixo do nome) e `.draw-check` (check de SVG que se risca). Todas moram no mesmo bloco `@supports` e degradam para o estado final.

**Peça acima da dobra não usa `view()`.** A timeline mede a posição do elemento na rolagem, então o que já está na tela quando a página abre nasce no estado final — sem animação nenhuma. Aí o movimento é por tempo: `animate-rise`, `animate-draw`, e o atraso num `[animation-delay:…]`.

Sobrou movimento que o CSS não faz? Só então JavaScript, e com as três garantias do `Typewriter` (`affiliate/features/landing/components/typewriter.tsx`): o conteúdo completo está sempre no acessível, a ausência de `IntersectionObserver` mostra tudo de uma vez, e `prefers-reduced-motion` pula a animação. Hoje são três componentes: `Typewriter`, `CountUp` (`affiliate/shared/components/count-up.tsx`, o saldo do hero) e `Tilt` (`affiliate/features/landing/components/tilt.tsx`, a inclinação dos cartões — que ainda ignora ponteiro que não seja `mouse`, porque no toque arrastar sobre o cartão é o gesto de rolar).

Duas animações no mesmo elemento pedem **um token composto**, como `--animate-alert`: duas classes `animate-*` escrevem a mesma propriedade `animation` e a última vence.

Componente do Radix precisa de **entrada e saída**: `data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out`. Só entrada faz o menu sumir seco depois de aparecer suave.

Animação nova é token `--animate-*` no `@theme` com os keyframes no fim do `globals.css`. Nada de `animation:` solto em componente.

Toda a copy da landing está em `src/affiliate/shared/content.ts`, num arquivo só. Os números que dependem da Porto vivem em `pendingFromPorto` — só o `reviewWindow` está fechado, o resto ainda é `null`: a copy funciona sem eles e passa a exibir quando forem preenchidos. **Não escreva número de comissão, desconto ou prazo direto no JSX.**

O extrato do hero é a exceção declarada: `showcase` guarda valores de exemplo e a peça imprime `showcase.disclaimer` colado no saldo, não em nota de rodapé. As linhas somam exatamente `totalCents` — extrato ilustrativo que não fecha a conta ensina a não conferir o extrato de verdade. Quando `pendingFromPorto` for preenchido, este bloco sai.

## Sessão e acesso

Cookie `httpOnly`, `sameSite=lax`, `secure` fora de dev, oito horas. Nomes em `src/shared/lib/session-cookie.ts` — módulo neutro porque o `middleware` roda no Edge e não pode importar nada `server-only`.

**São duas sessões, com cookies de nomes diferentes:** `porto_session` para o operador e `porto_affiliate_session` para o afiliado. Não é zelo: o middleware só enxerga que o cookie *existe*, então um nome compartilhado faria "entrei como afiliado" valer como "entrei no painel de análise".

`middleware.ts` protege `/admin/:path*` e `/minha-conta/:path*` com negação por omissão, cada um conferindo o seu cookie; as exceções são `/admin/login` e `/entrar`, explícitas, e as duas expulsam quem já tem sessão. O layout de `(shell)` e o de `(account)` conferem de novo, porque o middleware só vê que o cookie existe — quem lê o conteúdo é o layout, e cookie corrompido tem que virar login, não tela quebrada.

## Só a carteira roda contra dublê

**Painel, login do afiliado e a conta dele falam com a API.** Entrar em qualquer um dos dois logins exige a API no ar (`npm run dev`), as migrations aplicadas e `npm run seed --workspace apps/api`, que cria os três operadores com a senha `MudarAgora!2026`. O afiliado nasce sem senha: ele recebe o link de `/definir-senha` no e-mail de aprovação, que vale 48 horas e só funciona uma vez.

O que sobrou por nascer é `GET /v1/affiliate/me/wallet` — saldo e extrato dependem de tabelas que a Onda 1 não tem. Com `API_MOCKING=enabled`, o `api-client` troca o **transporte** por `src/shared/http/mocks/mock-api.ts`, que devolve `Response` a partir das fixtures.

**O dublê responde por prefixo, não por canal inteiro.** Hoje `DUBBED` é só `/affiliate/me/wallet`. Caminho fora dele devolve `null` e o `api-client` cai no `fetch` de verdade — é isso que mantém tudo o mais indo para o Postgres com a flag ligada. Caminho *dentro* de um prefixo dublado e fora da tabela devolve 404, não `null`: escapar para a API trocaria um erro claro por um `ECONNREFUSED`.

Saldo e total pago são **somados a partir do extrato**, com teste que trava a invariante em `mock-api.spec.ts`.

A resposta volta pelo mesmo `request()`, então cabeçalho montado, 204 sem corpo e tradução do corpo de erro em `ApiError` continuam exercitados. Quando as rotas nascerem, tire a flag e nenhuma tela muda.

**O dashboard não passa por aqui.** Os números da tela inicial do painel são constantes em `admin/features/dashboard/mock-data.ts`: faturamento, comissão e venda dependem de tabelas que a Onda 1 não tem, então não há rota para dublar. `mock-data.spec.ts` trava as somas que a tela mostra lado a lado — segmento que fecha o total, fatia que fecha 100%, comissão que sai da mesma taxa. Quando as leituras nascerem, o arquivo vira `data.ts` e a montagem não muda.

**Campanhas segue o mesmo desenho.** `admin/features/campaigns/mock-data.ts` guarda os registros e `list-campaigns.ts` corta em memória o que a API vai cortar com `WHERE`, `ORDER BY` e `LIMIT` — devolvendo o mesmo `{ data, total }` de `PaginatedResult`, que é o que mantém a tela intacta na troca. Criar, editar e encerrar campanha aparecem desabilitados com "em breve": a Onda 1 não tem rota de escrita, e oferecer o clique seria oferecer um caminho que não chega.

### Atenção: por que não é MSW

Foi, e quebrou. O MSW intercepta remendando o `globalThis.fetch` uma vez, no boot, por `instrumentation.ts`. **O Next reaplica o próprio patch de cache sobre o `fetch` global a cada recompilação**, e o interceptador some no primeiro Fast Refresh: o painel passa a receber `ECONNREFUSED` e o log não diz por quê. Em dev, isso significa o painel morrer a cada arquivo salvo.

Trocar a função de transporte não tem esse problema, porque não depende de nenhum estado global sobreviver ao recarregamento de módulo. Se alguém propuser voltar ao MSW, é este parágrafo que responde.

## Atenção: escala nova no `@theme` precisa entrar no `cn`

O `tailwind-merge` classifica `text-<algo>` como cor de texto quando não conhece o valor, e **descarta a classe** ao lado de um `text-ink-900` na mesma chamada de `cn`. O título passa a renderizar no tamanho de corpo, sem erro em lint, type-check ou build.

Criou `--text-*`, `--shadow-*` ou `--radius-*` novo? Acrescente em `extendTailwindMerge`, em `src/shared/lib/cn.ts`, e no teste de regressão em `cn.spec.ts`.

## Atenção: `server-only` no teste

`src/shared/http/api-client.ts` importa `server-only`, que lança fora do servidor. Teste de Server Action dubla o módulo inteiro:

```ts
jest.mock('@/shared/http/api-client', () => ({ publicApiFetch: jest.fn() }));
```

É também o limite certo da unidade: o teste do action verifica a tradução de erro e o que foi enviado, não o `fetch`.

## Atenção: pacote do workspace precisa entrar em `transpilePackages`

`next.config.mjs` lista `['@porto/contracts']`. Pacote novo do monorepo consumido aqui precisa ser acrescentado, senão o Next tenta carregar o build como dependência externa e falha em runtime.

## Atenção: a imagem de produção depende de `output: 'standalone'`

`next.config.mjs` declara `output: 'standalone'` e `outputFileTracingRoot`
apontando para a raiz do monorepo. Sem o primeiro, a imagem carregaria o
`node_modules` inteiro; sem o segundo, o rastreamento não enxerga
`@porto/contracts`, que é symlink de workspace, e o container sobe quebrado.

`standalone` é servidor Node completo — compatível com o `middleware.ts` de
`/admin`, ao contrário de `output: 'export'`. O `Dockerfile` copia
`.next/standalone`, e à mão `.next/static` e `public`, que ficam de fora do
rastreamento.

## Atenção: Server Action atrás de proxy precisa de `allowedOrigins`

O ambiente provisionado tem CloudFront (e a Imperva da Porto na frente dele). O
Next compara o header `Origin` com `X-Forwarded-Host` e **aborta a ação** quando
divergem — `Invalid Server Actions request`, HTTP 500. Como são sete actions e
elas são todo o caminho de escrita — cadastro, os dois logins, definir senha,
aprovar/reprovar e os dois logouts —, errar isso derruba a aplicação inteira com
a tela carregando normalmente.

`next.config.mjs` resolve com `experimental.serverActions.allowedOrigins`,
alimentado por `PUBLIC_DOMAIN_NAME`, que o `install-release.sh` grava no
`web.env`. É lido em **runtime**, não embutido na imagem: trocar o domínio é
reiniciar o container, não rebuildar. Mas **trocar o domínio sem trocar a
variável quebra tudo que é POST**.

## Comandos

```bash
npm run dev --workspace apps/web          # porta 3005
npm run build --workspace apps/web        # o erro de prerender só aparece aqui
npm run type-check --workspace apps/web
npm run test --workspace apps/web         # Jest via next/jest, jsdom
```

`API_BASE_URL` e `API_MOCKING` vivem em `.env.local` (modelo em `.env.example`).
