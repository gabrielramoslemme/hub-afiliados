# Cadastro do afiliado

| | |
|---|---|
| **Tipo** | Card pai |
| **Épico** | SIS-508 — Hub de Afiliados |
| **Onda** | 1 — Acesso e Aprovação |
| **Cards filhos** | 2 |

## Descrição

A porta de entrada do programa. Qualquer pessoa interessada em divulgar os serviços da Porto pode se candidatar pelo aplicativo, sem convite prévio, informando seus dados e aceitando os termos do programa.

Não há triagem automática: todo cadastro enviado vai para análise da Porto. O sistema não aprova, não reprova e não pontua ninguém sozinho — ele coleta, registra o aceite dos termos com a versão exata que a pessoa leu, e coloca o cadastro na fila.

O cadastro não pede senha. A pessoa está fazendo um pré-cadastro, e a senha só faz sentido depois que a Porto aprovar o perfil — o que é tratado no card pai de Autenticação.

## Critérios de aceite

- [ ] Qualquer pessoa consegue se candidatar pelo aplicativo, sem convite.
- [ ] O aceite dos termos é obrigatório e fica registrado com a versão, a data e a hora.
- [ ] Todo cadastro enviado entra na situação "em análise", sem exceção e sem triagem automática.
- [ ] A pessoa recebe confirmação de que o cadastro foi recebido.
- [ ] Dados inconsistentes são recusados na hora, com mensagem clara sobre o que corrigir.

## Objetivo

Permitir que parceiros se candidatem ao programa pelo aplicativo e que seus dados cheguem à Porto prontos para análise, com o aceite dos termos juridicamente rastreável.

## Job Story

Quando eu descubro o programa de afiliados da Porto e quero participar, eu quero me candidatar pelo aplicativo informando meus dados, para ser avaliado e começar a divulgar assim que for aprovado.

## Links

- Épico: [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508)
- Issue existente: [SIS-509 — \[App\] Tela de cadastro](https://mesainc-sisapp.atlassian.net/browse/SIS-509)
- Spec técnica: `docs/specs/09-cadastro-e-termos.md`
- Requisitos funcionais: RF-02, RF-03, RF-05
