# E-mails transacionais

Provider selecionado por `MAIL_PROVIDER`: `logger` em desenvolvimento e teste,
`resend` em homologação e produção.

| Template | Gatilho | Variáveis |
|---|---|---|
| `REGISTRATION_RECEIVED` | Pré-cadastro concluído | `name` |
| `REGISTRATION_APPROVED` | Operador aprova o cadastro | `name`, `link` (definir senha, 48h), `coupon`, `discountPercent` |
| `REGISTRATION_REJECTED` | Operador reprova o cadastro | `name`, `reason` |
| `PASSWORD_RECOVERY` | Pedido de recuperação | `name`, `link` (2h) |

`PASSWORD_RECOVERY` sai do `RequestPasswordResetUseCase`, que atende os dois
canais. O `link` aponta para `/redefinir-senha` quando o pedido veio do portal e
para `/admin/redefinir-senha` quando veio do painel — a audiência é da rota,
nunca do corpo. Ele só é enviado a quem consegue entrar (afiliado aprovado,
operador com perfil, conta ativa) e no máximo um por minuto e cinco por hora por
conta. Nos demais casos a API responde o mesmo 204 e não envia nada: responder
diferente diria a quem tentou se aquele e-mail tem conta.

`REGISTRATION_APPROVED` só sai depois de o cupom estar emitido na Porto e
gravado aqui, e mostra o código e o percentual acima do botão de criar a senha
— o assunto é "Cadastro aprovado — seu cupom já está valendo". `discountPercent`
chega como texto (`'10'`), porque toda variável de template é string. Sem
`coupon` ou `discountPercent`, o render recusa, como com qualquer variável
obrigatória.

## Onde o conteúdo mora

Em código, não no painel do fornecedor. Cada template é um componente React
Email em `src/infra/services/email/templates/`, e o
[`template-registry.tsx`](../src/infra/services/email/templates/template-registry.tsx)
liga cada `MailTemplateEnum` ao assunto, às variáveis obrigatórias e ao
componente. Template novo entra nos dois lugares: um arquivo `.tsx` e uma linha
no registry — sendo o registry um `Record<MailTemplateEnum, …>`, esquecer a
segunda é erro de type-check.

O visual compartilhado (cabeçalho, cores da marca, botão, rodapé) está em
[`layout.tsx`](../src/infra/services/email/templates/layout.tsx). A paleta
espelha os tokens de `apps/web/src/app/globals.css` com valor literal, porque
cliente de e-mail não lê variável CSS.

## Dois portes, um serviço

`MailService` implementa o port `Mailer` do domínio compondo dois contratos de
infra, separados de propósito:

| Contrato | Implementação | Responsabilidade |
|---|---|---|
| `MailRenderer` | `ReactEmailRenderer` | `SendMailInput` → `{ subject, html, text }` |
| `MailProvider` | `ResendProvider`, `LoggerMailProvider` | despachar o já renderizado |

O conteúdo é o mesmo em qualquer fornecedor, então trocar de fornecedor mexe só
no adapter de envio, e trocar de motor de template mexe só no renderer.

`MailService.send` **nunca lança**. Falha de envio — e variável obrigatória
ausente — vira log de erro, e o fluxo de negócio segue. Reenvio é operação
manual pelo painel (backlog).

## Configuração

```
MAIL_PROVIDER=resend
RESEND_API_KEY=
MAIL_FROM_EMAIL=nao-responda@afiliados.porto.example
MAIL_FROM_NAME=Hub de Afiliados
```

`MAIL_FROM_*` não leva o nome do fornecedor porque remetente e nome de exibição
valem em qualquer um.

## Pendência conhecida

O cabeçalho usa wordmark tipográfico, não o `porto-logo.svg`: Gmail não
renderiza SVG em e-mail. Trocar por imagem exige um PNG em URL absoluta e
pública.
