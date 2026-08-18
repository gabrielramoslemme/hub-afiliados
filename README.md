# Porto Hub de Afiliados

Monorepo da API e do painel do Hub de Afiliados da Porto Serviços.

| Pacote | O que é |
|---|---|
| `apps/api` | API NestJS. Três canais: `/v1/mobile` (app), `/v1/admin` (painel), `/v1/webhooks`. |
| `apps/painel` | Painel de backoffice em Next.js + Refine. |
| `packages/contracts` | Tipos e schemas zod dos DTOs que o painel consome da API. |
| `packages/tsconfig` | Configurações TypeScript compartilhadas. |
| `packages/eslint-config` | Configuração ESLint compartilhada. |

O aplicativo Flutter do afiliado fica em repositório próprio e consome o
`openapi.json` publicado pela API.

## Começando

```bash
nvm use
npm install
npm run dev
```

Documentação de escopo e planejamento em [`docs/`](docs/).
