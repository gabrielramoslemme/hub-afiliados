---
name: create-entity
description: Use ao criar ou alterar uma entidade de domínio na API do porto-hub-afiliados — "cria a entidade", "nova tabela de X", "adiciona o repositório", "modela o agregado" — quando o modelo de dados ganha uma tabela ou uma coluna nova.
---

# Criar entidade e repositório

## Overview

O domínio declara **o que** o agregado é e **o que** se pode fazer com ele; `infra/database/typeorm` implementa. Um agregado novo toca **sete lugares** — parar no meio deixa o código compilando e quebrado em runtime: adapter sem registro no `SharedModule` explode como provider não encontrado só quando a rota é chamada.

## Ordem

1. **Partir do modelo que já existe** — as entidades em `src/infra/database/typeorm/entities/` e as migrations ao lado são a referência de colunas, tipos e índices. Coluna nova sai do pedido, nunca de suposição: se o pedido não disser, pergunte.

2. **Enum compartilhado primeiro.** Se a entidade tem coluna de enum que o painel também lê, ele nasce em `@porto/contracts` — skill `create-contract`. Nunca declare o enum em `apps/api`.

3. **Tipo do agregado** em `src/domain/<agregado>/<nome>.entity.ts` — `interface`, só escalares, sem nada de TypeORM:
   ```ts
   export interface AffiliatePayoutEntity {
     id: number;
     publicId: string;
     affiliateId: number;
     amountCents: number;
     createdAt: Date;
   }

   export interface AffiliatePayoutWithAffiliate extends AffiliatePayoutEntity {
     affiliate: AffiliateEntity;
   }
   ```
   **Uma variante por conjunto de relações carregadas.** É assim que o tipo de retorno do repositório para de mentir sobre o que veio do banco.

4. **Contrato do repositório** em `src/domain/<agregado>/<nome>.repository.ts` — `interface` mais o `Symbol`, no mesmo arquivo. Métodos devolvem `Promise<T | null>` e **não lançam**: quem decide 404 é o use case.
   ```ts
   export const AFFILIATE_PAYOUT_REPOSITORY = Symbol('AFFILIATE_PAYOUT_REPOSITORY');

   export interface AffiliatePayoutRepository {
     findByPublicId(publicId: string): Promise<AffiliatePayoutWithAffiliate | null>;
     save(payout: Partial<AffiliatePayoutEntity>): Promise<AffiliatePayoutEntity>;
   }
   ```
   Escrita que precisa ser atômica com outra tabela vira **um método do agregado** (ver `changeStatus` em `affiliate.repository.ts`) — a transação mora no adapter e nenhum `EntityManager` atravessa o contrato.

5. **Entidade TypeORM** em `src/infra/database/typeorm/entities/<nome>.typeorm-entity.ts`, declarando `implements` o tipo do domínio:
   ```ts
   @Entity('affiliate_payouts')
   export class AffiliatePayoutTypeormEntity implements AffiliatePayoutEntity {
     @PrimaryGeneratedColumn()
     id: number;

     @Column({ name: 'public_id', type: 'uuid', unique: true })
     @Generated('uuid')
     publicId: string;

     @Column({ name: 'affiliate_id', type: 'int' })
     affiliateId: number;

     @ManyToOne(() => AffiliateTypeormEntity)
     @JoinColumn({ name: 'affiliate_id' })
     affiliate: AffiliateTypeormEntity;

     @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
     createdAt: Date;
   }
   ```
   Coluna em `snake_case` via `name:`, propriedade em `camelCase`. `timestamptz` sempre. Enum de `@porto/contracts` gravado como `varchar`. FK sempre com a coluna escalar (`affiliateId`) **e** a relação — a escalar é o que o adapter filtra sem `join`. Relação declarada sem `?`, senão a entidade não satisfaz a variante `...With...`.

6. **Adapter** em `src/infra/database/typeorm/repositories/<nome>.typeorm-repository.ts` — o único lugar com `@InjectRepository`:
   ```ts
   @Injectable()
   export class AffiliatePayoutTypeormRepository implements AffiliatePayoutRepository {
     constructor(
       @InjectRepository(AffiliatePayoutTypeormEntity)
       private readonly repository: Repository<AffiliatePayoutTypeormEntity>,
     ) {}

     findByPublicId(publicId: string): Promise<AffiliatePayoutWithAffiliate | null> {
       return this.repository.findOne({ where: { publicId }, relations: { affiliate: true } });
     }
   }
   ```

7. **Registrar no `SharedModule`** — **dois** lugares:
   - `TypeOrmModule.forFeature([...])` — a entidade TypeORM
   - a lista `REPOSITORIES` — o par `{ provide: TOKEN, useClass: Adapter }`

   O `exports` é derivado da lista, então não há terceiro array para esquecer.

8. **Migration** — skill `create-migration`. A entidade não cria schema: `synchronize: false`.

9. **Factory** em `src/testing/factories/<nome>.factory.ts` (objeto literal do tipo de domínio, sequência incremental, datas fixas, `overrides` por último) e **mock** em `src/testing/mocks/repositories/<nome>.repository.mock.ts`, tipado como `jest.Mocked<Contrato>`.

## Verificar

```bash
npm run type-check --workspace apps/api                      # o implements cobra a conformidade
npm run typeorm:run --workspace apps/api
npm run test:e2e --workspace apps/api
```

O `type-check` é o primeiro filtro: se a entidade não atender o tipo do domínio, ele fala antes de qualquer banco subir.

## Erros comuns

| Erro | Correção |
|---|---|
| Provider não encontrado em runtime | Faltou o par `{ provide, useClass }` na lista `REPOSITORIES` do `SharedModule` |
| `Repository not found` em runtime | Faltou a entidade no `TypeOrmModule.forFeature` |
| Injeção falha só quando o container sobe | Faltou `@Inject(TOKEN)` no construtor do use case — contrato é interface, não existe em runtime |
| Entidade não é encontrada pelo TypeORM | O arquivo precisa terminar em `.typeorm-entity.ts`: é assim que os globs de `typeorm.module.ts` e `ormconfig.ts` a acham |
| `biome check` reclama de import em `src/domain` | O domínio não importa `typeorm`, `@nestjs/typeorm`, `@Infra/*` nem `@Modules/*`. Inverta: o adapter é que conhece os dois lados |
| Relação `undefined` em runtime com tipo dizendo que existe | O método promete uma variante `...With...` mas o adapter não pediu `relations` |
| Entidade criou a tabela sozinha | Não cria. `synchronize: false`. Faltou a migration |
| `id` serial aparecendo em resposta ou rota | Exponha `public_id`. O `id` é interno |
| Enum redeclarado em `apps/api` | Importe de `@porto/contracts` |
| Tipo `enum` do Postgres na migration | Use `varchar`: adicionar valor novo não vira migration de schema |
| `timestamp` em vez de `timestamptz` | Perde o fuso e quebra comparação entre ambientes |
| Só a relação, sem a coluna escalar | Sem `affiliateId` todo filtro vira `join` |
