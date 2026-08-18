---
name: create-entity
description: Use ao criar ou alterar uma entidade de domínio na API do porto-hub-afiliados — "cria a entidade", "nova tabela de X", "adiciona o repositório", "modela o agregado" — quando o modelo de dados ganha uma tabela ou uma coluna nova.
---

# Criar entidade e repositório

## Overview

Uma entidade nova toca **cinco lugares**. Parar no meio deixa o código compilando e quebrado em runtime: entidade sem registro no `SharedModule` explode como `Repository not found` só quando a rota é chamada.

## Ordem

1. **Ler o modelo de dados** — `docs/specs/00-arquitetura.md`, seção 4, tem a tabela de colunas de cada agregado. Não invente coluna.

2. **Enum compartilhado primeiro.** Se a entidade tem coluna de enum que o painel também lê, ele nasce em `@porto/contracts` — skill `create-contract`. Nunca declare o enum em `apps/api`.

3. **Entidade** em `src/infra/database/typeorm/entities/<nome>.entity.ts`:
   ```ts
   @Entity('affiliate_payouts')
   export class AffiliatePayoutEntity {
     @PrimaryGeneratedColumn()
     id: number;

     @Column({ name: 'public_id', type: 'uuid', unique: true })
     @Generated('uuid')
     publicId: string;

     @Column({ name: 'affiliate_id', type: 'int' })
     affiliateId: number;

     @ManyToOne(() => AffiliateEntity)
     @JoinColumn({ name: 'affiliate_id' })
     affiliate: AffiliateEntity;

     @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
     createdAt: Date;
   }
   ```
   Coluna em `snake_case` via `name:`, propriedade em `camelCase`. `timestamptz` sempre. Enum de `@porto/contracts` gravado como `varchar`. FK sempre com a coluna escalar (`affiliateId`) **e** a relação — a escalar é o que o repositório filtra sem `join`.

4. **Repositório** em `src/domain/<agregado>/<nome>.repository.ts`. Métodos devolvem `Promise<T | null>` e **não lançam** — quem decide 404 é o use case:
   ```ts
   @Injectable()
   export class AffiliatePayoutRepository {
     constructor(
       @InjectRepository(AffiliatePayoutEntity)
       private readonly repository: Repository<AffiliatePayoutEntity>,
     ) {}

     findByPublicId(publicId: string): Promise<AffiliatePayoutEntity | null> {
       return this.repository.findOne({ where: { publicId }, relations: { affiliate: true } });
     }
   }
   ```

5. **Registrar no `SharedModule`** — os **três** arrays, senão a injeção falha:
   - `TypeOrmModule.forFeature([...])` — a entidade
   - `providers: [...]` — o repositório
   - `exports: [...]` — o repositório, para os módulos de canal enxergarem

6. **Migration** — skill `create-migration`. A entidade não cria schema: `synchronize: false`.

7. **Factory** em `src/testing/factories/<nome>.factory.ts`, no padrão de `user.factory.ts`: sequência incremental, datas fixas, `overrides` por último.

## Verificar

```bash
npm run typeorm:run --workspace apps/api
npm run typeorm:generate --workspace apps/api --name=Drift   # deve dar "No changes"
npm run test:e2e --workspace apps/api
```

O `generate` é o detector de divergência entre entidade e schema. Arquivo com conteúdo = você esqueceu algo; leia, corrija à mão, apague o arquivo.

## Erros comuns

| Erro | Correção |
|---|---|
| `Repository not found` em runtime | Faltou registrar nos três arrays do `SharedModule` |
| Entidade criou a tabela sozinha | Não cria. `synchronize: false`. Faltou a migration |
| `id` serial aparecendo em resposta ou rota | Exponha `public_id`. O `id` é interno |
| Enum redeclarado em `apps/api` | Importe de `@porto/contracts` |
| Tipo `enum` do Postgres na migration | Use `varchar`: adicionar valor novo não vira migration de schema |
| `timestamp` em vez de `timestamptz` | Perde o fuso e quebra comparação entre ambientes |
| Só a relação, sem a coluna escalar | Sem `affiliateId` todo filtro vira `join` |
