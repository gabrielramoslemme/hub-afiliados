# Cards para o Jira — Porto Hub de Afiliados, Onda 1

Cards prontos para lançamento no Jira, em linguagem de produto. Cada um segue a mesma estrutura: **Descrição**, **Critérios de aceite**, **Objetivo**, **Job Story** e **Links**.

A referência técnica — arquitetura, modelo de dados, contratos, passos de implementação — fica em [`docs/specs/`](../specs/) e **não vai para o Jira**. Os cards apontam para ela pelo campo Links.

**Épico no Jira:** [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508)

---

## Onda 1 — Acesso e Aprovação

Do cadastro público do parceiro até ele entrar no aplicativo com a conta aprovada, mais a ferramenta que a Porto usa para decidir. Nenhum item desta onda depende de liberação da Porto.

| Card pai | Cards filhos | Entrega |
|---|---|---|
| **[1. Configuração dos projetos](1-configuracao-dos-projetos/)** | 6 | Ambiente, projetos, base de dados, e-mails e contrato de API |
| **[2. Cadastro do afiliado](2-cadastro-do-afiliado/)** | 2 | Termos e pré-cadastro público no aplicativo |
| **[3. Autenticação](3-autenticacao/)** | 6 | Acesso ao aplicativo e ao painel, senha e sessão |
| **[4. Aprovação de cadastros](4-aprovacao-de-cadastros/)** | 5 | Fila, análise, decisão e trilha auditável |

### 1. Configuração dos projetos

| # | Card | Tipo |
|---|---|---|
| 1.1 | [Monorepo e ferramental](1-configuracao-dos-projetos/1.1-monorepo-e-ferramental.md) | Task |
| 1.2 | [Base da API](1-configuracao-dos-projetos/1.2-base-da-api.md) | Task |
| 1.3 | [Base do painel](1-configuracao-dos-projetos/1.3-base-do-painel.md) | Task |
| 1.4 | [Contrato de API publicado para o aplicativo](1-configuracao-dos-projetos/1.4-contrato-de-api-publicado.md) | Task |
| 1.5 | [Modelo de dados e ambiente local](1-configuracao-dos-projetos/1.5-modelo-de-dados-e-ambiente-local.md) | Task |
| 1.6 | [Envio de e-mails transacionais](1-configuracao-dos-projetos/1.6-envio-de-emails-transacionais.md) | Task |

### 2. Cadastro do afiliado

| # | Card | Tipo | Issue existente |
|---|---|---|---|
| 2.1 | [Termos e condições vigentes](2-cadastro-do-afiliado/2.1-termos-e-condicoes-vigentes.md) | Story | — |
| 2.2 | [Pré-cadastro no aplicativo](2-cadastro-do-afiliado/2.2-pre-cadastro-no-aplicativo.md) | Story | SIS-509 |

### 3. Autenticação

| # | Card | Tipo | Issue existente |
|---|---|---|---|
| 3.1 | [Controle de acesso por canal](3-autenticacao/3.1-controle-de-acesso-por-canal.md) | Task | — |
| 3.2 | [Login do aplicativo](3-autenticacao/3.2-login-do-aplicativo.md) | Story | SIS-511 |
| 3.3 | [Criação de senha após a aprovação](3-autenticacao/3.3-criacao-de-senha-apos-aprovacao.md) | Story | SIS-511 |
| 3.4 | [Recuperação de senha](3-autenticacao/3.4-recuperacao-de-senha.md) | Story | SIS-511, SIS-518 |
| 3.5 | [Sessão do aplicativo](3-autenticacao/3.5-sessao-do-aplicativo.md) | Story | SIS-511 |
| 3.6 | [Login do painel](3-autenticacao/3.6-login-do-painel.md) | Story | SIS-518 |

### 4. Aprovação de cadastros

| # | Card | Tipo | Issue existente |
|---|---|---|---|
| 4.1 | [Fila de afiliados no painel](4-aprovacao-de-cadastros/4.1-fila-de-afiliados.md) | Story | SIS-519 |
| 4.2 | [Detalhe do cadastro e trilha de auditoria](4-aprovacao-de-cadastros/4.2-detalhe-e-trilha.md) | Story | SIS-519 |
| 4.3 | [Aprovar cadastro](4-aprovacao-de-cadastros/4.3-aprovar-cadastro.md) | Story | SIS-519 |
| 4.4 | [Reprovar cadastro](4-aprovacao-de-cadastros/4.4-reprovar-cadastro.md) | Story | SIS-519 |
| 4.5 | [Validação do ciclo completo](4-aprovacao-de-cadastros/4.5-validacao-do-ciclo-completo.md) | Task | — |

---

## Ordem sugerida

O card pai 1 precisa estar concluído antes dos demais. Dentro dos outros três, a ordem é: **2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 4.1 → 4.2 → 4.3 → 4.4 → 4.5**.

Os cards 1.4 e 1.6 podem correr em paralelo com o cartão pai 2, se houver mais de uma pessoa no time.

## Fora da Onda 1

Permanecem no backlog, já mapeados no documento funcional: Home do usuário (SIS-510), Carteira de pagamentos (SIS-516), Edição de perfil (SIS-517), Gestão de pagamentos (SIS-520), criação do cupom exclusivo, link de divulgação, extrato de vendas, comissionamento e pagamento do incentivo.

Essas frentes dependem de definições que ainda estão abertas do lado da Porto — contrato da API de cupons, caminho de exposição, credenciais e aprovação de Segurança da Informação e Arquitetura.

## Dependência da Porto que afeta a Onda 1

**Versão vigente dos Termos e Condições do programa**, com o Jurídico da Porto (dependência D12 do documento funcional). Sem o texto oficial, o cadastro sobe em homologação com uma versão provisória e a publicação em produção fica represada.
