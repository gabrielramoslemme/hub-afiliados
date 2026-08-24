---
name: create-contract
description: Use ao adicionar ou alterar algo em @porto/contracts no porto-hub-afiliados — "cria o enum", "novo DTO compartilhado", "schema zod do formulário", "a web precisa desse tipo" — ou quando API e web precisam concordar sobre uma forma de dado.
---

# Criar contrato compartilhado

## O que entra aqui

Só o que **API e web** dividem: enum do domínio, tipo de resposta que `apps/web` consome — cadastro público, área do afiliado ou `/v1/admin` —, schema zod de formulário que a API também valida.

Não entra: DTO de classe com `@ApiProperty` (é do Nest, mora em `apps/api/src/http/<canal>/<agregado>/dtos/`), tipo usado por um pacote só, regra de negócio.

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

3. **Schema de formulário** no mesmo arquivo. A mensagem de erro em pt-BR mora aqui — é ela que aparece no formulário correspondente em `apps/web`:
   ```ts
   export const rejectAffiliateSchema = z.object({
     reason: z.string().trim().min(10, 'Descreva o motivo com ao menos 10 caracteres'),
   });

   export type RejectAffiliateRequest = z.infer<typeof rejectAffiliateSchema>;
   ```

4. **Reexportar em `src/index.ts`.** Arquivo novo sem linha nova aqui não existe para quem consome.

5. **Compilar** — sem isto, API e web continuam com os tipos antigos:
   ```bash
   npm run build --workspace packages/contracts
   ```

6. **Verificar os dois consumidores:**
   ```bash
   npm run type-check --workspace apps/api
   npm run type-check --workspace apps/web
   ```

## Atenção: o pacote é consumido compilado

`main` e `types` apontam para `./dist`, não para `./src`. Editar `src/` sem rodar o build produz o sintoma mais confuso do repositório: erro de "propriedade não existe" em um arquivo que você não tocou.

- `turbo run type-check|test|build|dev` já dispara o build por `dependsOn: ["^build"]`.
- Chamar um script de pacote direto **não** dispara: `npm run seed --workspace apps/api`, `npm run openapi:generate --workspace apps/api`, qualquer `ts-node`.

## Atenção: valor de enum é dado gravado

Os valores viram `varchar` nas tabelas do Postgres.

- Adicionar valor: seguro.
- **Renomear ou remover: migration de dados.** O type-check passa e o banco fica inconsistente em silêncio.

## Erros comuns

| Erro | Correção |
|---|---|
| Tipo novo invisível para API e web | Faltou reexportar em `src/index.ts` |
| "Propriedade não existe" depois de editar o contrato | Faltou `npm run build --workspace packages/contracts` |
| DTO de classe com `@ApiProperty` aqui | Vai em `apps/api`; este pacote não depende de Nest |
| Enum duplicado em `apps/api` ou `apps/web` | Importe daqui. Este é a fonte única |
| Renomear valor de enum como refactor | É migration de dados — o type-check passa e o banco fica inconsistente em silêncio |
| Mensagem de validação duplicada no formulário | A mensagem mora no schema, em pt-BR |
