# Contratos — `@porto/contracts`

Fonte única do vocabulário entre a API e a web: quando um DTO muda na API, a web quebra em build — é exatamente para isso que este pacote existe. Regras do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md).

## O que entra

| O que | Onde |
|---|---|
| Enums do domínio compartilhado | `src/enums/index.ts` |
| Tipos dos DTOs que `apps/web` consome da API — cadastro público, área do afiliado e painel | `src/dtos/` |
| Schemas zod dos formulários de `apps/web` cuja validação a API também aplica | `src/dtos/` |

**O que não entra:** DTO de classe com `@ApiProperty` (é do Nest, mora em `apps/api/src/http/<canal>/<agregado>/dtos/` — a classe descreve o Swagger, o tipo daqui tipa a web); tipo usado por um pacote só; regra de negócio, já que aqui só cabe forma e validação de forma; qualquer runtime — sem Nest, React ou TypeORM, a única dependência é `zod`.

## Convenções

- **Enum:** sufixo `Enum`, chave e valor iguais em `SCREAMING_SNAKE`. Duas exceções:
  - `AuthAudienceEnum`, com valores minúsculos porque vão direto para a claim `aud` do JWT.
  - Todo `*ErrorCodeEnum` (`AuthErrorCodeEnum`, `RegistrationErrorCodeEnum`): a chave continua semântica em `SCREAMING_SNAKE`, mas o valor é um código curto `PREFIXO-NNN` (`AUTH-001`, `REG-004`) — um prefixo por enum, numeração sequencial de 3 dígitos na ordem de declaração. É esse valor que o front mapeia pra escolher a mensagem, então **número aposentado nunca é reaproveitado** e categoria nova ganha prefixo novo, nunca reusa um existente.
- **Tipo de resposta:** `interface` com sufixo semântico — `AffiliateListItem` para a linha da lista, `AffiliateDetail` para a tela de detalhe.
- **Requisição com validação:** `export const xSchema = z.object({...})` seguido de `export type XRequest = z.infer<typeof xSchema>`. A mensagem de erro em pt-BR mora no schema — é ela que aparece no formulário correspondente em `apps/web`.
- **Tudo passa por `src/index.ts`.** Arquivo novo exige linha nova de reexport, senão ele não existe para quem consome.

## Atenção: o pacote é consumido compilado

`main` e `types` apontam para `./dist`, não para `./src`. Depois de editar `src/`:

```bash
npm run build --workspace packages/contracts
```

Sem isso, a API e a web continuam enxergando os tipos antigos, e o erro aparece como "propriedade não existe" em um arquivo que você não tocou.

- `turbo run type-check|test|build|dev` já dispara o build por `dependsOn: ["^build"]`.
- Script de pacote chamado direto **não** dispara: `seed`, `openapi:generate`, qualquer `ts-node`. O `prepare` da raiz cobre só o `npm install`.

## Atenção: o valor do enum está gravado no banco

`AffiliateStatusEnum`, `UserRoleEnum`, `UserTypeEnum`, `PixKeyTypeEnum` e `TokenPurposeEnum` são persistidos como `varchar` nas tabelas do Postgres. Adicionar valor novo é seguro; **renomear ou remover é migration de dados, não refactor** — o type-check passa e o banco fica inconsistente em silêncio.
