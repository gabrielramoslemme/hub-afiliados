# Feature slices no `apps/web` — separar o portal do afiliado do painel da Porto

**Data:** 2026-08-24 · **Escopo:** `apps/web`, `biome.jsonc`

O `apps/web` serve dois públicos que não se encontram: o afiliado, que chega pela landing
page, se cadastra e entra na própria área; e o analista da Porto, que entra no painel para
aprovar ou reprovar. Hoje as duas jornadas moram na mesma `src/features/`, separadas apenas
pelo prefixo do nome da pasta — `landing`, `registration`, `affiliate-*` de um lado,
`admin-*` do outro.

Prefixo não é fronteira. Já vazou em três lugares sem ninguém reparar, e nenhum deles
aparece em lint, type-check ou build.

## Recorte

| Entra | Fica de fora |
|---|---|
| Reorganizar `src/` em três fatias: `affiliate/`, `admin/`, `shared/` | Qualquer mudança de comportamento, tela ou rota |
| Espelhar as fatias nos route groups do App Router | Mudança de URL |
| Corrigir as três dependências invertidas que a fronteira expõe | Novos componentes, novas features |
| Impor a fronteira no Biome, como o `apps/api` já faz com as camadas | `apps/api` e `packages/*` |
| Reescrever a seção "Onde cada coisa mora" do `apps/web/CLAUDE.md` | Documentação em `porto-hub-afiliados-docs` |

Nenhum teste novo. A suíte que existe é a rede de segurança: se os ~15 specs passam com
nada além do caminho do import editado, a refatoração não mudou comportamento.

## O que está errado hoje

Três vazamentos e uma inversão, todos encontrados lendo os imports:

| Onde | O quê |
|---|---|
| `admin-shell/admin-topbar.tsx`, `(admin)/admin/login/page.tsx` | o painel importa `features/landing/porto-logo` |
| `registration-section.tsx`, `(site)/entrar`, `(site)/cadastro/sucesso` | três telas importam `features/landing/section`, que não é da landing |
| `affiliate-area/account-topbar.tsx` | a área do afiliado também importa `features/landing/porto-logo` |
| **`core/format.ts`** | **importa `features/registration/masks`** — o espaço neutro dependendo de uma feature |

Some com isso o que hoje mora em `core/` e é de um lado só: `admin-routes.ts`,
`affiliate-routes.ts` e `content/landing.ts`. E `src/components/`, que se chama global mas
guarda `CountUp` e `CopyCoupon` — usados apenas pela landing e pela área do afiliado, nunca
pelo painel.

## Decisões de desenho

### O dono vem antes do domínio

A fatia de topo é o público, não o domínio. `src/affiliate/` e `src/admin/`, cada uma com
`features/` e `shared/` próprios, mais um `src/shared/` transversal.

A alternativa era manter `src/features/` na raiz e padronizar o prefixo
(`affiliate-landing/`, `admin-affiliates/`). Foi recusada pelo mesmo motivo que a situação
atual falhou: prefixo é convenção de nome. Nada impede uma pasta sem prefixo aparecer
amanhã, e nenhuma ferramenta consegue expressar "isto não pode importar aquilo" a partir de
um pedaço de string no nome do diretório.

Com a pasta como fatia, a regra vira caminho — e caminho o lint entende.

### A landing page é do afiliado

Ela existe para captar afiliado. Cadastro, login e área logada são a continuação da mesma
jornada, e compartilham cabeçalho, rodapé, tipografia e a copy. Separá-los em uma terceira
fatia de "site público" criaria uma fronteira entre `/cadastro` e `/minha-conta` — duas
telas do mesmo funil — enquanto o corte que interessa, afiliado contra Porto, ficaria
implícito de novo.

### O estilo é o do lemme-admin, adaptado ao Next

A estrutura interna de cada feature segue `docs/conventions/architecture.md` do
lemme-admin: `components/`, `data.ts`, `types.ts`, `validations.ts` e um `index.ts` que é a
API pública. Quem conhece aquele projeto abre este e sabe onde procurar.

Duas adaptações que o Next impõe. `src/app/` é o roteador e não pode ser renomeado, então
ele fica com o papel de casca de rota — o `app/` de infraestrutura do lemme-admin não tem
equivalente aqui, porque config e estilo global já moram em `src/app/layout.tsx` e
`globals.css`. E `middleware.ts` fica em `src/` por exigência do framework.

### Os route groups espelham as fatias

`(site)` e `(affiliate)` viram `(affiliate)/(public)` e `(affiliate)/(account)`, grupos
aninhados. Nenhuma URL muda — route group não aparece no caminho — e os dois layouts
distintos continuam distintos.

O ganho não é cosmético: com `src/app/(admin)/**` e `src/app/(affiliate)/**` como caminhos,
a casca de rota entra na mesma regra de lint das fatias. Hoje ela escapa de tudo, e é
exatamente de lá que sai um dos três vazamentos.

### `data.ts` e `session.ts` são entrada própria, fora do barrel

`data.ts` importa `api-client`, que importa `server-only`. Um barrel que reexportasse
`data.ts` ao lado de um componente `'use client'` quebraria o build no primeiro cliente que
importasse a feature — e a mensagem de erro não apontaria para o barrel.

`session.ts` tem exatamente o mesmo problema, e a implementação mostrou que ele é
consumido de fora tanto quanto o `data.ts`: o layout de `(shell)`, o de `(account)` e o
`admin-topbar` chamam `readSessionUser`. São **dois** nomes na exceção, não um.

`index.ts` fica client-safe: componentes, tipos e actions `'use server'`. Dentro da
feature, import relativo — nunca o próprio barrel.

### `shared/` não importa feature, então o topbar fica na feature

`admin-topbar` e `account-topbar` são cromo de layout e a tentação é mandá-los para
`shared/components/`. Mas os dois importam `sign-out.action`, e `shared/` que alcança uma
feature é a mesma inversão que estamos matando em `core/format.ts`.

Ficam em feature: `admin/features/shell/` e `affiliate/features/area/`. Import entre
features é permitido — pelo `index.ts`, nunca pelo caminho interno.

### `masks.ts` sobe inteiro para `shared/lib/`

É o arquivo que causa a inversão em `core/format.ts`. A saída óbvia seria dividi-lo:
máscara de digitação para a feature, formatação de exibição para o espaço comum.

Não há o que dividir. O arquivo é `onlyDigits`, `formatCpf`, `formatPhone` e `formatPixKey`
— quatro funções de formatação de CPF, telefone e chave PIX, sem uma linha de regra de
cadastro. O painel já as consome por tabela através de `format.ts`. Sobe inteiro.

## A estrutura

```
src/
├── app/                                casca de rota apenas
│   ├── layout.tsx · globals.css
│   ├── (affiliate)/
│   │   ├── (public)/                   layout · / · /cadastro{,/sucesso} · /entrar
│   │   └── (account)/                  layout · /minha-conta{,/cupom,/perfil}
│   └── (admin)/                        /admin/login · (shell)/admin/afiliados
├── middleware.ts
├── affiliate/
│   ├── features/{landing,registration,auth,area}/
│   └── shared/{components/,routes.ts}
├── admin/
│   ├── features/{auth,affiliates,shell}/
│   └── shared/routes.ts
└── shared/{components/,hooks/,lib/,http/}
```

Alias continua sendo só `@/*`. O caminho já nomeia o dono — `@/affiliate/features/landing`,
`@/shared/lib/cn` — e um `@features/*` seria ambíguo com duas fatias. Fora o
`components.json` do shadcn, nenhum arquivo de configuração de caminho muda.

### Mapa arquivo a arquivo

**`src/affiliate/`**

| Destino | Vem de |
|---|---|
| `features/landing/components/` | `hero-section`, `pitch-section`, `benefits-section`, `audience-section`, `steps-section`, `requirements-section`, `faq-section`, `coupon-card`, `earnings-card`, `typewriter`, `tilt` |
| `shared/content.ts` | `core/content/landing.ts` |
| `features/registration/` | `components/{registration-form,registration-section}`, `errors.ts`, `result.ts`, `register-affiliate.action.ts` |
| `features/auth/` | `components/sign-in-form`, `errors.ts`, `session.ts`, `sign-in.action.ts`, `sign-out.action.ts` |
| `features/area/` | `components/{account-nav,account-topbar,page-heading,statement-list,wallet-card}`, `data.ts` ← `queries.ts` |
| `shared/components/` | `section`, `site-header`, `site-footer`, `count-up`, `copy-coupon` |
| `shared/routes.ts` | `core/affiliate-routes.ts` |

**A copy não é da landing, é da fatia.** O desenho original mandava
`core/content/landing.ts` para `features/landing/content.ts`. Os imports desmentem: além da
landing, consomem o arquivo o `site-header` e o `site-footer` — que moram em
`affiliate/shared/components/` —, o formulário de cadastro, três telas de rota e o
`app/layout.tsx`. Deixá-lo na feature recriaria a inversão `shared → feature` que esta
mudança existe para matar. Vai para `affiliate/shared/content.ts`, e continua sendo um
arquivo só.

**`src/admin/`**

| Destino | Vem de |
|---|---|
| `features/auth/` | `components/sign-in-form`, `errors.ts`, `redirect-target.ts`, `session.ts`, `sign-in.action.ts`, `sign-out.action.ts` |
| `features/affiliates/` | `components/{affiliates-queue,affiliate-detail,affiliate-status,decision-actions,queue-filters,queue-pagination}`, `data.ts` ← `queries.ts`, `decide.action.ts`, `queue-params.ts` |
| `features/shell/` | `admin-topbar`, `user-menu` |
| `shared/routes.ts` | `core/admin-routes.ts` |

**`src/shared/`**

| Destino | Vem de |
|---|---|
| `components/ui/` | `components/ui/` — os 13 primitivos shadcn |
| `components/porto-logo.tsx` | `features/landing/porto-logo.tsx` |
| `hooks/use-reduced-motion.ts` | `core/use-reduced-motion.ts` |
| `lib/` | `cn`, `env`, `format`, `affiliate-status`, `session-cookie` de `core/`, mais `masks` de `features/registration/` |
| `http/` | `core/http/{api-client,api-error}.ts` |
| `http/mocks/` | `mocks/{mock-api,fixtures}.ts` |

Todo `*.spec.ts(x)` acompanha o arquivo que testa. A exceção é
`registration-schema.spec.ts`, que não tem sujeito local — o schema vem de
`@porto/contracts` e o teste existe para travar o contrato do lado de cá. Fica na raiz de
`features/registration/`, com o nome que já tem.

`src/features/`, `src/components/`, `src/core/` e `src/mocks/` deixam de existir.

## A fronteira no Biome

Quatro overrides em `biome.jsonc`, no mesmo formato dos quatro que o `apps/api` já usa para
as camadas — `noRestrictedImports` com `patterns`, mensagem em inglês, `level: "error"`.

| Origem | Grupo proibido | Motivo na mensagem |
|---|---|---|
| `src/admin/**`, `src/app/(admin)/**` | `@/affiliate/**` | o painel não conhece o portal; o que é dos dois vai para `src/shared/` |
| `src/affiliate/**`, `src/app/(affiliate)/**` | `@/admin/**` | espelho da anterior |
| `src/shared/**` | `@/admin/**`, `@/affiliate/**`, `@/app/**` | a seta aponta para dentro |
| `src/**` | `@/*/features/*/**`, exceto `data` e `session` | de fora da feature, só pelo `index.ts` |

**O padrão de barrel é repetido nos quatro blocos, e isso não é descuido.** Quando dois
overrides alcançam o mesmo arquivo, o Biome **substitui** a configuração da regra em vez de
somar a ela. Um override amplo com o padrão de barrel apagaria a regra de fatia de todo
arquivo de `apps/web/src`, e o lint passaria limpo sem checar cruzamento nenhum — foi
exatamente o que aconteceu na primeira tentativa, e só apareceu porque as regras foram
testadas com arquivos de sonda em vez de confiadas pelo "0 erros". Padrão novo entra nos
quatro.

**`src/middleware.ts` enxerga as duas fatias, e não precisa de exceção escrita.** Ele mora
na raiz de `src/`, fora dos globs `src/admin/**` e `src/affiliate/**`, então nenhuma das
duas primeiras regras o alcança — e as rotas que ele importa (`@/affiliate/shared/routes`,
`@/admin/shared/routes`) não são caminho de `features/`, então a quarta também não. Não
acrescente um `!` para ele: a permissão já sai da forma da árvore. Mesmo papel de
`apps/api/src/infra/di/**` — wiring existe justamente para conhecer os dois lados —, só que
lá a exceção precisa ser escrita porque o diretório fica dentro da camada que a regra cobre.

Os quatro padrões foram validados em spike antes desta spec: import cruzado e deep-import
falham, barrel e import relativo interno passam.

## Verificação

`npm run lint && npm run type-check && npm run test`, mais
`npm run build --workspace apps/web` — erro de prerender só aparece no build.

O sinal de que a refatoração é mecânica: **nenhum arquivo `*.spec.ts(x)` muda além do
caminho do import**. Assertion editada é sinal de que comportamento mudou junto, e aí o
commit precisa ser dividido.

## Commits

Dois, nesta ordem:

1. `refactor(web): slice the app by audience` — os `git mv`, a reescrita de import, as três
   inversões corrigidas e o `apps/web/CLAUDE.md`. Sem mudança de comportamento.
2. `chore: enforce the web slice boundaries in biome` — os quatro overrides.

O primeiro entra em `.git-blame-ignore-revs`, que o repositório já mantém para a passada
mecânica do Biome. Sem isso, o `git blame` de todo arquivo da web aponta para esta
refatoração em vez de para quem escreveu a linha.

As inversões são corrigidas no commit 1, e não em um terceiro: são exatamente os arquivos
que a regra nova reprovaria, e uma regra que entra já reprovando o próprio repositório é
uma regra que alguém desliga.
