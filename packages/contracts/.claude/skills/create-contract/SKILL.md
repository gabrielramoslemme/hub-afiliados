---
name: create-contract
description: Use ao adicionar ou alterar algo em @porto/contracts no porto-hub-afiliados — "cria o enum", "novo DTO compartilhado", "schema zod do formulário", "o painel precisa desse tipo" — ou quando API e painel precisam concordar sobre uma forma de dado.
---

# Criar contrato compartilhado

## O que entra aqui

Só o que **API e painel** dividem: enum do domínio, tipo de resposta que o painel consome de `/v1/admin`, schema zod de formulário que a API também valida.

Não entra: DTO de classe com `@ApiProperty` (é do Nest, mora em `apps/api/src/domain/<agregado>/dtos/`), tipo usado por um pacote só, regra de negócio, nada do app Flutter (a ponte com ele é o `openapi.json`).

Sem dependência de runtime. A única é `zod`.

## Ordem

1. **Enum** em `src/enums/index.ts` — sufixo `Enum`, chave e valor iguais em `SCREAMING_SNAKE`:
   ```ts
   export enum PayoutStatusEnum {
     PENDING = 'PENDING',
     PAID = 'PAID',
   }
   ```
   A exceção é `AuthAudienceEnum`, cujos valores são minúsculos porque viram a claim `aud` do JWT.

2. **Tipo de resposta** em `src/dtos/<agregado>.dto.ts` — `interface`, sufixo semântico (`...ListItem` para a linha da lista, `...Detail` para o detalhe).

3. **Schema de formulário** no mesmo arquivo. A mensagem de erro em pt-BR mora aqui — é ela que aparece no formulário do painel:
   ```ts
   export const rejectAffiliateSchema = z.object({
     reason: z.string().trim().min(10, 'Descreva o motivo com ao menos 10 caracteres'),
   });

   export type RejectAffiliateRequest = z.infer<typeof rejectAffiliateSchema>;
   ```

4. **Reexportar em `src/index.ts`.** Arquivo novo sem linha nova aqui não existe para quem consome.

5. **Compilar** — sem isto, API e painel continuam com os tipos antigos:
   ```bash
   npm run build --workspace packages/contracts
   ```

6. **Verificar os dois consumidores:**
   ```bash
   npm run type-check --workspace apps/api
   npm run type-check --workspace apps/painel
   ```

## Atenção: o pacote é consumido compilado

`main` e `types` apontam para `./dist`, não para `./src`. Editar `src/` sem rodar o build produz o sintoma mais confuso do repositório: erro de "propriedade não existe" em um arquivo que você não tocou.

- `turbo run type-check|test|build|dev` já dispara o build por `dependsOn: ["^build"]`.
- Chamar um script de pacote direto **não** dispara: `npm run seed --workspace apps/api`, `npm run openapi:generate --workspace apps/api`, qualquer `ts-node`.

## Atenção: valor de enum é dado gravado

Os valores viram `varchar` nas tabelas do Postgres e são lidos pelo app Flutter, que está fora deste monorepo.

- Adicionar valor: seguro.
- **Renomear ou remover: migration de dados.** O type-check passa e o banco fica inconsistente em silêncio.
- `AuthErrorCodeEnum` é pior: o app escolhe a mensagem pelo código. Renomear quebra um cliente que nenhum build daqui alcança.

## Erros comuns

| Erro | Correção |
|---|---|
| Tipo novo invisível para API e painel | Faltou reexportar em `src/index.ts` |
| "Propriedade não existe" depois de editar o contrato | Faltou `npm run build --workspace packages/contracts` |
| DTO de classe com `@ApiProperty` aqui | Vai em `apps/api`; este pacote não depende de Nest |
| Enum duplicado em `apps/api` ou `apps/painel` | Importe daqui. Este é a fonte única |
| Renomear valor de enum como refactor | É migration de dados e quebra de contrato com o app |
| Mensagem de validação duplicada no formulário | A mensagem mora no schema, em pt-BR |
