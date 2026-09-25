# Webhook da Transfeera

- **URL:** `https://<host>/v1/webhooks/transfeera`, cadastrada na Transfeera por `POST /webhook` (`event_url`).
- **Segredo:** o `signature_secret` que a Transfeera devolve nesse cadastro. Ele vai em `TRANSFEERA_WEBHOOK_SECRET` — no ambiente provisionado, uma linha à mão no `/porto-hub/dev/config`. Sem ele a rota recusa toda chamada com 401.
- **Assinatura:** header `Transfeera-Signature: t=<ms>,v1=<hex>`, HMAC-SHA256 de `"<t>.<corpo cru>"`. Janela de `TRANSFEERA_WEBHOOK_TOLERANCE_SECONDS` (5 min).
- **Respostas:**

  | Resposta | Quando |
  |---|---|
  | 200 `APPLIED` | o saque mudou |
  | 200 `DUPLICATE` | repetição |
  | 200 `IGNORED` | status intermediário ou objeto que não é `Transfer` |
  | 200 `outcome: null` | corpo vazio (teste de URL) |
  | 404 | `integration_id` que não é saque nosso — a Transfeera tenta de novo, duas vezes |
  | 401 | assinatura |

- **Trilha:** `payout_events`, com o corpo sem chave PIX e sem CPF.
- **Reenvio:** a Transfeera tenta de novo só duas vezes. O que ela desistir de entregar, a reconciliação agendada busca pela consulta do lote.
