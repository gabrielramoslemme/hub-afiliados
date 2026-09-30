# Webhook da Transfeera

- **URL:** `https://<host>/v1/webhooks/transfeera`, cadastrada na Transfeera por `POST /webhook` com `event_url` e `object_types: ["Transfer"]` — o campo é obrigatório, e assinar outros objetos só enche a trilha de eventos sem efeito.
- **Segredo:** o `signature_secret` que a Transfeera devolve nesse cadastro. Ele vai em `TRANSFEERA_WEBHOOK_SECRET` — no ambiente provisionado, uma linha à mão no `/porto-hub/dev/config`. Sem ele a rota recusa toda chamada com 401.
- **Assinatura:** header `Transfeera-Signature: t=<ms>,v1=<hex>`, HMAC-SHA256 de `"<t>.<corpo cru>"`. Janela de `TRANSFEERA_WEBHOOK_TOLERANCE_SECONDS` (5 min).
- **Respostas:**

  | Resposta | Quando |
  |---|---|
  | 200 `APPLIED` | o saque mudou |
  | 200 `DUPLICATE` | repetição |
  | 200 `IGNORED` | status intermediário ou objeto que não é `Transfer` |
  | 200 `DIVERGENT` | `FINALIZADO` num saque já `FAILED`, ou `FALHA` num já `PAID` — nada muda, `logger.error` com o `publicId`; ver o runbook |
  | 200 `outcome: null` | corpo vazio (teste de URL) |
  | 404 | `integration_id` que não é saque nosso — a Transfeera tenta de novo, duas vezes |
  | 401 | assinatura |

- **Trilha:** `payout_events`, com o corpo sem chave PIX, sem CPF e sem o texto livre do fornecedor (`status_description`, `error`). O motivo vai limpo para `affiliate_withdrawals.failure_reason`.
- **Reenvio:** a Transfeera tenta de novo só duas vezes. A reconciliação agendada cobre só parte do que ela desistir de entregar: consulta o lote dos saques `PROCESSING` **com** `provider_batch_id` e repete o pedido dos `REQUESTED`. Saque já `PAID`, saque `PROCESSING` sem lote e desfecho divergente ficam para gente — ver abaixo.

## Quando o saque não anda

O alarme é o log de erro: `Reconciliação: conferir à mão <publicId>, …` (job) ou `Desfecho … em conflito com o saque: <publicId>` (webhook). Em todo caso, primeiro:

1. **A trilha do saque** — o que chegou e o que se fez com cada evento:

   ```sql
   SELECT e."received_at", e."source", e."provider_status", e."outcome", e."payload"
     FROM "payout_events" e
     JOIN "affiliate_withdrawals" w ON w."id" = e."withdrawal_id"
    WHERE w."public_id" = '<publicId>'
    ORDER BY e."received_at", e."id";
   ```

2. **O painel da Transfeera**, buscando a transferência pelo `integration_id` — que é o `publicId` do saque. É ele que diz se o PIX caiu, voltou ou nunca existiu.

O SQL abaixo roda sempre numa transação, e só se confirma (`COMMIT`) quando cada `UPDATE` mudou exatamente uma linha. Vendas só voltam ao saldo (`affiliate_sales.withdrawal_id = NULL`) de saque `FAILED` ou `RETURNED` — nunca de `PAID`, `PROCESSING` ou `REQUESTED`. O fechamento à mão não manda e-mail ao afiliado nem grava linha em `payout_events`: avise o afiliado por fora se for o caso.

### `PROCESSING` sem lote

A reconciliação repetiu o pedido, a Transfeera respondeu que já o tinha (idempotência repetida) sem devolver o lote, e o webhook não veio. `listStale` só consulta `PROCESSING` com lote — este fica parado para sempre.

Achou a transferência no painel? Grave o lote e deixe a próxima rodada (até 10 min) aplicar o desfecho, com e-mail e trilha:

```sql
BEGIN;
UPDATE "affiliate_withdrawals"
   SET "provider_batch_id" = '<batch_id do painel>', "updated_at" = now() - interval '1 day'
 WHERE "public_id" = '<publicId>' AND "status" = 'PROCESSING' AND "provider_batch_id" IS NULL;
COMMIT;
```

O `updated_at` no passado é o que põe o saque na próxima rodada, sem esperar `WITHDRAWAL_STALE_AFTER_MINUTES`. Não existe transferência nenhuma? Feche como falho (bloco *Fechar como falho*).

### `REQUESTED` com a repetição recusada

Só o primeiro pedido fecha um saque como `FAILED`. Na repetição, a recusa pode ser a idempotência repetida mal lida — o primeiro pedido pode estar pagando —, e o saque fica `REQUESTED`, reaparecendo no log a cada rodada.

- **A transferência existe no painel:** grave o lote como no caso acima, trocando a condição para `"status" = 'REQUESTED'` e o `SET` para incluir `"status" = 'PROCESSING'`.
- **Não existe, e a recusa é de verdade** (chave errada, titular diferente): feche como falho.

### Fechar como falho

```sql
BEGIN;
UPDATE "affiliate_withdrawals"
   SET "status" = 'FAILED', "failed_at" = now(), "updated_at" = now(),
       "failure_reason" = 'Fechado à mão: <motivo, sem chave nem CPF>'
 WHERE "public_id" = '<publicId>' AND "status" IN ('REQUESTED', 'PROCESSING');
UPDATE "affiliate_sales"
   SET "withdrawal_id" = NULL
 WHERE "withdrawal_id" = (SELECT "id" FROM "affiliate_withdrawals"
                           WHERE "public_id" = '<publicId>' AND "status" IN ('FAILED', 'RETURNED'));
COMMIT;
```

### Devolução depois de pago que nunca chegou

A reconciliação não relê saque `PAID`. Se o `DEVOLVIDO` se perdeu nas duas tentativas do webhook, o saque segue pago e as vendas presas nele — o afiliado perdeu o saldo sem ter recebido. Só o painel da Transfeera mostra. Confirmada a devolução:

```sql
BEGIN;
UPDATE "affiliate_withdrawals"
   SET "status" = 'RETURNED', "returned_at" = now(), "updated_at" = now(),
       "failure_reason" = 'Devolvido (fechado à mão): <motivo, sem chave nem CPF>'
 WHERE "public_id" = '<publicId>' AND "status" = 'PAID';
UPDATE "affiliate_sales"
   SET "withdrawal_id" = NULL
 WHERE "withdrawal_id" = (SELECT "id" FROM "affiliate_withdrawals"
                           WHERE "public_id" = '<publicId>' AND "status" IN ('FAILED', 'RETURNED'));
COMMIT;
```

### `DIVERGENT`

Um desfecho chegou em conflito com o que já tínhamos fechado. O saque não muda sozinho.

- **`FALHA` num saque `PAID`:** a Transfeera costuma mandar `DEVOLVIDO` logo depois, e esse se aplica sozinho (o saque vira `RETURNED` e as vendas voltam ao saldo). Se em uma hora o saque continuar `PAID`, confira o lote no painel da Transfeera: se o dinheiro voltou para a conta da Mesa, feche como devolvido pelo SQL da seção anterior.
- **`FINALIZADO` num saque `FAILED`:** as vendas dele voltaram ao saldo quando falhou, e a ligação se perdeu (`withdrawal_id` virou nulo) — podem já estar em outro saque. O PIX caiu: se as mesmas vendas foram sacadas de novo, o afiliado recebeu duas vezes. **Não reabra o saque por SQL** — marcá-lo `PAID` sem vendas ligadas bagunça a carteira, e religar vendas às cegas pode prender as de outro saque. Levante os saques do afiliado depois da falha e leve ao financeiro:

  ```sql
  SELECT o."public_id", o."status", o."amount_cents", o."requested_at", o."paid_at"
    FROM "affiliate_withdrawals" w
    JOIN "affiliate_withdrawals" o ON o."affiliate_id" = w."affiliate_id" AND o."requested_at" >= w."failed_at"
   WHERE w."public_id" = '<publicId>'
   ORDER BY o."requested_at";
  ```

Um `DEVOLVIDO` num saque `FAILED` não entra aqui: a Transfeera leva toda `FALHA` a `DEVOLVIDO` em seguida, e o evento fica na trilha como `DUPLICATE`.
