# Configuração dos projetos

| | |
|---|---|
| **Tipo** | Card pai |
| **Épico** | SIS-508 — Hub de Afiliados |
| **Onda** | 1 — Acesso e Aprovação |
| **Cards filhos** | 6 |

## Descrição

Reúne tudo o que precisa existir antes de qualquer funcionalidade do Hub de Afiliados ser construída: os projetos da API e do painel criados e rodando, a base de dados modelada, o ambiente local reproduzível por qualquer pessoa do time, o envio de e-mails funcionando e o contrato de API publicado para quem constrói o aplicativo.

Nenhum destes cards entrega valor visível para o afiliado ou para a Porto. Todos são pré-requisito dos que entregam. Concluí-los rápido e bem é o que determina o ritmo do resto da onda.

Os projetos partem de bases já usadas e testadas em outros produtos do time, aproveitando padrões de estrutura, autenticação, tratamento de erro e layout — o domínio do Hub de Afiliados é construído do zero sobre elas.

## Critérios de aceite

- [ ] Qualquer pessoa do time consegue clonar o repositório, seguir o README e ter API e painel rodando localmente.
- [ ] API e painel vivem no mesmo repositório e compartilham configuração e tipos.
- [ ] A base de dados é criada e atualizada por comando, sem passo manual.
- [ ] Existe uma verificação automática que roda a cada alteração e reprova código quebrado.
- [ ] O contrato da API está publicado e versionado, pronto para o time do aplicativo consumir.
- [ ] E-mails são enviados em homologação e produção, e simulados em desenvolvimento sem custo.

## Objetivo

Ter um ambiente de desenvolvimento pronto, verificação automática funcionando e o contrato de API disponível para o time do aplicativo, para que as frentes de produto avancem sem bloqueio de infraestrutura.

## Job Story

Quando eu entro no projeto para construir uma funcionalidade do Hub de Afiliados, eu quero encontrar os projetos configurados, a base de dados modelada e a verificação automática rodando, para gastar meu tempo com o problema do afiliado e não com montagem de ambiente.

## Links

- Épico: [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508)
- Arquitetura: `docs/specs/00-arquitetura.md`
- Specs técnicas: `docs/specs/01` a `06` e `08`
