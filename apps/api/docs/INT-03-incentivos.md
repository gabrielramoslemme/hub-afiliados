# INT-03 — Notificações de incentivo (Porto → Mesa)

A resposta da Mesa ao documento *Integração Porto x Mesa — Notificações de Incentivo (Afiliados)*. Fecha as quatro pendências listadas nele para a homologação integrada e traz dois pedidos de campo novo no payload.

O payload, os três tipos de evento e a chave de idempotência (`venda.id` + `evento.tipoEvento`) são os do documento da Porto, sem mudança.

## 1. Endpoint

```
POST https://<host-da-api>/v1/webhooks/porto/incentives
Content-Type: application/json
```

O host de cada ambiente é informado à parte, junto com o segredo (seção 2).

## 2. Autenticação — assinatura HMAC-SHA256

A Porto e a Mesa combinam **um segredo por ambiente**, por canal seguro, com no mínimo 32 caracteres. O segredo **nunca vai na requisição**: em cada envio, a Porto assina o corpo e o instante do envio, e a Mesa confere.

| Header | Valor |
|---|---|
| `X-Timestamp` | Instante do envio em segundos UTC, inteiro (epoch). Ex.: `1789129028` |
| `X-Signature` | `sha256=` seguido do HMAC-SHA256 em hexadecimal minúsculo |

```
corpo      = o JSON serializado UMA vez — a string exata que vai no POST
timestamp  = segundos UTC de agora
assinatura = hex( HMAC_SHA256(segredo, timestamp + "." + corpo) )
```

**A assinatura cobre bytes, não o objeto.** O cliente HTTP precisa enviar exatamente a string que foi assinada. Reserializar o objeto depois de assinar — um espaço a mais, outra ordem de campos — faz a assinatura não conferir. É o erro mais comum de integração.

**Janela de 5 minutos.** O `X-Timestamp` pode se afastar do relógio da Mesa em até 300 segundos para qualquer lado. O servidor da Porto precisa estar sincronizado por NTP.

### Exemplo para conferir a implementação

Com o segredo `exemplo-de-segredo-com-32-caracteres!!`, o timestamp `1789129028` e este corpo (uma linha, sem espaços):

```
{"idEvento":"8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b","dataHoraEvento":"2026-09-11T12:17:08.319Z","evento":{"tipoEvento":"VENDA_REGISTRADA","descricaoEvento":"Venda realizada com seu cupom"},"incentivo":{"status":"PENDENTE"},"venda":{"id":"7c4f7b20-709a-4bde-8646-2fd1a5ae6fd4","cupom":"PARCEIRO10","valorVenda":310.99,"item":"PFAZ * VENTILADOR"}}
```

o header é:

```
X-Signature: sha256=e990860912bec1ef024d29a0a524074ccd5d71a7c1c491d08e8c48cba94dbcca
```

## 3. Respostas

**Sucesso é sempre 200**, com corpo:

```json
{ "status": "PROCESSED", "saleId": "<uuid da venda na Mesa>" }
```

| `status` | Quando |
|---|---|
| `PROCESSED` | O evento foi aplicado. |
| `ALREADY_APPLIED` | A mesma ação (`venda.id` + `tipoEvento`) já tinha sido aplicada, ou a venda já estava encerrada e chegou um `VENDA_REGISTRADA`. Nada mudou. **Não é falha**: não reprocessar. |

**Erro** tem sempre a mesma forma, com mensagem em português para o suporte:

```json
{
  "statusCode": 409,
  "code": "INC-002",
  "message": "A venda não foi registrada. Reenvie o evento VENDA_REGISTRADA antes deste.",
  "path": "/v1/webhooks/porto/incentives",
  "timestamp": "2026-09-11T12:17:09.012Z"
}
```

| HTTP | `code` | Significado | O que fazer |
|---|---|---|---|
| 401 | `null` | Assinatura ausente, inválida ou fora da janela de 5 minutos | Conferir segredo, relógio e serialização. Reenviar com assinatura nova. |
| 400 | `null` | Corpo fora do contrato. `message` lista os campos | Corrigir o envio. |
| 400 | `INC-004` | `tipoEvento` e `incentivo.status` não formam um dos três pares válidos | Corrigir o envio. |
| 404 | `INC-001` | O cupom não pertence a nenhum afiliado do programa | Verificar o cupom. Não há o que reprocessar. |
| 409 | `INC-002` | Conclusão ou cancelamento de venda que a Mesa nunca recebeu como registrada | Reenviar o `VENDA_REGISTRADA` da venda e, depois, este evento. |
| 409 | `INC-003` | A venda já foi encerrada com o desfecho oposto | Venda encerrada não reabre. Abrir chamado se o desfecho estiver errado. |
| 409 | `INC-005` | O `venda.id` já foi registrado com outro cupom | Abrir chamado. |
| 5xx | `null` | Falha da Mesa | Reprocessar. |

**Campo novo no payload não quebra a integração.** Campo que a Mesa ainda não conhece é ignorado e guardado, nunca recusado com 400.

## 4. Reprocessamento

Como a Porto não faz retentativa automática no piloto, a combinação é:

- **Timeout, erro de rede, 401 e 5xx: reprocessar o mesmo evento.** É seguro repetir — a idempotência por `venda.id` + `tipoEvento` faz a repetição responder `ALREADY_APPLIED` sem efeito. O `idEvento` pode ser novo a cada envio, como já é hoje.
- **409 `INC-002`: reenviar primeiro o `VENDA_REGISTRADA`** da venda, depois o evento que falhou. A Mesa não aceita conclusão ou cancelamento fora de ordem: a venda precisa passar por pendente.
- **400 e 404: não reprocessar** sem corrigir antes. Repetir devolve o mesmo erro.
- **Toda chamada que passa pela assinatura fica registrada na Mesa**, aplicada ou não, com o `idEvento` e o corpo recebido. Para conciliar, o suporte informa o `venda.id` ou o `idEvento`.

## 5. Dois pedidos à Porto

Para as telas de Vendas (painel) e Extrato (afiliado), faltam dois dados no payload:

1. **`incentivo.valor`** — o valor do incentivo daquela venda, em reais. A Porto já decide se a venda comissiona, e os percentuais por segmento são dela. Com o valor no evento, a Mesa não precisa versionar regra de comissionamento nem conciliar cálculo com a Porto. Hoje a Mesa guarda o valor da venda, e não tem como calcular o incentivo.
2. **A data real da venda** (ex.: `venda.dataVenda`, ISO-8601 UTC). O documento diz que `dataHoraEvento` é a hora do envio. Num reprocessamento manual as duas se afastam por dias, e é a coluna "data da venda" do painel que fica errada. Enquanto o campo não vier, a Mesa usa o `dataHoraEvento`.

Os dois podem entrar como campos novos: a Mesa já aceita campo desconhecido sem erro (seção 3).
