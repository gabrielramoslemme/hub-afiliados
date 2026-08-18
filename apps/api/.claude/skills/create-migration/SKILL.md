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

6. **Conferir se a entidade e o schema concordam** — ver *Checagem de drift* abaixo.

## Nunca use `migration:generate` para produzir a migration final

Este repositório escreve SQL à mão porque usa coisas que o `generate` não sabe expressar: `citext`, índice parcial (`WHERE "revoked_at" IS NULL`), enum gravado como `varchar`. O `generate` vai propor desfazer tudo isso a cada execução.

**Mas ele é excelente como detector de drift.** Com o banco em dia:

```bash
npm run typeorm:run --workspace apps/api
npm run typeorm:generate --workspace apps/api --name=Drift
```

- Arquivo vazio ou erro "No changes in database schema were found" → entidade e schema concordam.
- Arquivo com conteúdo → **leia o SQL proposto**: é a diferença que você esqueceu. Corrija à mão na sua migration e **apague o arquivo de drift**. Ele nunca é commitado.

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
| `down()` | sempre implementado, derrubando na ordem inversa do `up()` |

## Erros comuns

| Erro | Correção |
|---|---|
| Inventar o timestamp ou copiar o de outra migration | `npm run typeorm:create --workspace apps/api --name=...` — é a única forma |
| Usar a data de hoje formatada (`20260818...`) como timestamp | O TypeORM espera epoch em ms, não data legível |
| Commitar a migration de drift | Ela é diagnóstico; apagar depois de ler |
| `down()` vazio "porque é só criar tabela" | `down()` derruba a tabela. Sempre reversível |
| Rodar `migration:generate` esperando o arquivo final | Gera ruído com `citext` e índice parcial. Use `create` |
| Alterar uma migration já aplicada em outro ambiente | Crie uma nova. Migration aplicada é imutável |
| Renomear valor de enum sem migrar dados | O valor está gravado como `varchar` nas linhas existentes |

## Depois

`npm run test:e2e --workspace apps/api` — o e2e sobe o `AppModule` contra o banco real e é onde o schema quebrado aparece.
