---
name: create-migration
description: Use ao criar ou alterar schema do Postgres no porto-hub-afiliados — "cria a migration", "nova tabela", "adiciona coluna", "altera o schema", "cria o índice" — ou sempre que uma entidade TypeORM nova ou alterada precisar chegar ao banco.
---

# Criar migration

## A regra que não se quebra

**O timestamp do arquivo vem da CLI do TypeORM. Nunca digite o nome do arquivo à mão.**

```bash
npm run typeorm:create --workspace apps/api --name=CreateAffiliatePayouts
```

O timestamp é `Date.now()` no instante da criação. Ele é a **identidade** da migration na tabela `migrations` e a **ordem de execução**. Um número inventado mente sobre quando a migration nasceu, e — pior — pode cair antes de uma migration já aplicada em outro ambiente, que então nunca roda.

As duas migrations existentes (`1755400000000`, `1755410000000`) carregam timestamps redondos de 2025-08-17, escritos à mão. **São o contra-exemplo, não o padrão.** Não copie o nome delas para batizar a próxima.

`migration:create` não precisa de banco no ar nem de `-d ormconfig.ts`. Não há desculpa para escrever o nome à mão.

## Fluxo

1. **Criar o arquivo pela CLI:**
   ```bash
   npm run typeorm:create --workspace apps/api --name=NomeEmPascalCase
   ```
   Da raiz. Dentro de `apps/api`, o equivalente é `npm run typeorm:create --name=...`.

2. **Escrever o SQL à mão** em `up()` e `down()`, no estilo das migrations existentes: `queryRunner.query` com SQL literal. Não use o QueryBuilder de schema.

3. **Adicionar a propriedade `name`** que a classe gerada não traz, para bater com as existentes:
   ```ts
   export class CreateAffiliatePayouts1787064731889 implements MigrationInterface {
     name = 'CreateAffiliatePayouts1787064731889';
   ```

4. **Formatar** — o arquivo sai da CLI com aspas duplas e indentação de 4:
   ```bash
   npx biome check --write apps/api/src/infra/database/typeorm/migrations/<arquivo>.ts
   ```

5. **Provar que `down()` funciona** — este é o passo que as pessoas pulam:
   ```bash
   npm run db:up
   npm run typeorm:run    --workspace apps/api   # aplica
   npm run typeorm:revert --workspace apps/api   # desfaz
   npm run typeorm:run    --workspace apps/api   # aplica de novo
   ```
   Se o `revert` falhar ou deixar resíduo, a migration não está pronta.

6. **Espelhar na entidade** o que a migration criou — índice, `CHECK` e nome de FK. Sem isso o detector de drift passa a acusar diferença para sempre e deixa de servir para alguma coisa.

7. **Conferir se a entidade e o schema concordam** — ver a seção abaixo.

## Nunca use `migration:generate` para produzir a migration final

Este repositório escreve SQL à mão: constraint e índice nomeados por convenção (`ix_<tabela>_<colunas>`, `ck_<tabela>_<regra>`), índice parcial e ordenação `DESC` — o `generate` batiza tudo com hash (`FK_c5f88f63a07…`) e não expressa a ordenação.

**Mas ele é o detector de drift, e ele funciona:** as entidades declaram as mesmas constraints e índices que as migrations criam, então o esperado é `No changes`. Com o banco em dia:

```bash
npm run typeorm:run --workspace apps/api
npm run typeorm:generate --workspace apps/api --name=Drift
```

- `No changes in database schema were found` → entidade e schema concordam. **O comando sai com código ≠ 0 nesse caso** — é o sucesso, não uma falha; não encadeie com `&&`.
- Arquivo com conteúdo → **leia o SQL proposto**: é a diferença que você esqueceu, na migration **ou** na entidade. Corrija e **apague o arquivo de drift**. Ele nunca é commitado.

## Convenções de SQL

| Item | Regra |
|---|---|
| Tabela e coluna | `snake_case` |
| Chave primária | `"id" SERIAL PRIMARY KEY` — interno, nunca exposto |
| Identificador público | `"public_id" uuid NOT NULL UNIQUE` |
| Data e hora | `timestamptz`, nunca `timestamp` |
| E-mail | `citext` |
| Enum de `@porto/contracts` | `varchar(N) NOT NULL` — nunca o tipo `enum` do Postgres |
| Chave estrangeira | sempre com `REFERENCES` e `ON DELETE` explícito |
| Índice | `ix_<tabela>_<colunas>`; parcial (`WHERE ...`) quando a consulta sempre filtra |
| `CHECK` | `ck_<tabela>_<regra>` |
| Espelho na entidade | todo índice, `CHECK` e nome de FK também declarado na entidade |
| `down()` | sempre implementado, derrubando na ordem inversa do `up()` |

## Erros comuns

| Erro | Correção |
|---|---|
| Inventar o timestamp ou copiar o de outra migration | `npm run typeorm:create --workspace apps/api --name=...` — é a única forma |
| Usar a data de hoje formatada (`20260818...`) como timestamp | O TypeORM espera epoch em ms, não data legível |
| Commitar a migration de drift | Ela é diagnóstico; apagar depois de ler |
| `down()` vazio "porque é só criar tabela" | `down()` derruba a tabela. Sempre reversível |
| Rodar `migration:generate` esperando o arquivo final | Ele nomeia constraint com hash. Use `create` e escreva o SQL |
| Criar índice ou `CHECK` só na migration | A entidade declara também, senão o detector de drift acusa diferença para sempre |
| Tratar o código ≠ 0 do `generate` como falha | `No changes` sai com código ≠ 0. É o resultado esperado |
| Alterar uma migration já aplicada em outro ambiente | Crie uma nova. Migration aplicada é imutável |
| Renomear valor de enum sem migrar dados | O valor está gravado como `varchar` nas linhas existentes |

## Depois

`npm run test:e2e --workspace apps/api` — o e2e sobe o `AppModule` contra o banco real e é onde o schema quebrado aparece.
