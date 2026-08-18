# Contratos — `@porto/contracts`

Fonte única do vocabulário entre a API e o painel. Quando um DTO muda na API, o painel quebra em build — é exatamente para isso que este pacote existe.

Regras globais do monorepo no [`CLAUDE.md` da raiz](../../CLAUDE.md).

## O que entra

- Enums do domínio compartilhado — `src/enums/index.ts`.
- Tipos dos DTOs que o painel consome de `/v1/admin` — `src/dtos/`.
- Schemas zod dos formulários do painel cuja validação a API também aplica.

## O que não entra

- **DTO de classe com `@ApiProperty`.** Esse é do Nest e mora em `apps/api/src/domain/<agregado>/dtos/`. Os dois coexistem de propósito: a classe descreve o contrato no Swagger, o tipo daqui tipa o painel.
- **Tipo usado por um pacote só.** Fica no pacote.
- **Regra de negócio.** Só forma e validação de forma.
- **Qualquer runtime.** Sem Nest, sem React, sem TypeORM. A única dependência é `zod`.
- **Nada do app Flutter.** A ponte com ele é o `openapi.json`, não este pacote.

## Convenções

- **Enum:** sufixo `Enum`, chave e valor iguais em `SCREAMING_SNAKE`. A exceção é `AuthAudienceEnum`, cujos valores são minúsculos porque vão direto para a claim `aud` do JWT.
- **Tipo de resposta:** `interface`, com sufixo semântico — `AffiliateListItem` para a linha da lista, `AffiliateDetail` para a tela de detalhe.
- **Requisição com validação:** `export const xSchema = z.object({...})` seguido de `export type XRequest = z.infer<typeof xSchema>`. A mensagem de erro em pt-BR mora no schema — é ela que aparece no formulário do painel.
- **Tudo passa por `src/index.ts`.** Arquivo novo exige linha nova de reexport, senão ele não existe para quem consome.

## Atenção: o pacote é consumido compilado

`main` e `types` apontam para `./dist`, não para `./src`. Depois de editar `src/`:

```bash
npm run build --workspace packages/contracts
```

Sem isso, a API e o painel continuam enxergando os tipos antigos, e o erro aparece como "propriedade não existe" em um arquivo que você não tocou.

- `turbo run type-check|test|build|dev` já dispara o build por `dependsOn: ["^build"]`.
- Chamar um script de pacote direto **não** dispara: `npm run seed --workspace apps/api`, `npm run openapi:generate --workspace apps/api`, qualquer `ts-node`. O `prepare` da raiz cobre só o `npm install`.

## Atenção: o valor do enum está gravado no banco

Os valores de `AffiliateStatusEnum`, `UserRoleEnum`, `UserTypeEnum`, `PixKeyTypeEnum` e `TokenPurposeEnum` são persistidos como `varchar` nas tabelas do Postgres.

- Adicionar valor novo é seguro.
- **Renomear ou remover valor é migration de dados, não refactor.** O type-check passa e o banco fica inconsistente em silêncio.

O mesmo vale para `AuthErrorCodeEnum`: o app Flutter escolhe a mensagem pelo código. Renomear um valor quebra um cliente que não está neste monorepo e não quebra nenhum build daqui.

## Skills

`create-contract` — adicionar ou alterar enum, DTO ou schema zod compartilhado.
