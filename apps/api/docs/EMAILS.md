# E-mails transacionais

Provider selecionado por `MAIL_PROVIDER`: `logger` em desenvolvimento e teste,
`mailersend` em homologação e produção.

| Template | Gatilho | Variáveis |
|---|---|---|
| `REGISTRATION_RECEIVED` | Pré-cadastro concluído | `name` |
| `REGISTRATION_APPROVED` | Operador aprova o cadastro | `name`, `link` (definir senha, 48h) |
| `REGISTRATION_REJECTED` | Operador reprova o cadastro | `name`, `reason` |
| `PASSWORD_RECOVERY` | Pedido de recuperação | `name`, `link` (2h) |

Os IDs de template do MailerSend vêm por variável de ambiente
(`MAILERSEND_TEMPLATE_*`) — nenhum ID fica em código.

`MailService.send` nunca lança. Falha de envio vira log de erro, e o fluxo de
negócio segue. Reenvio é operação manual pelo painel (backlog).
