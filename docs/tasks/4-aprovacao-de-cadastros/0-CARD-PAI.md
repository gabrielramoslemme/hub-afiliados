# Aprovação de cadastros

| | |
|---|---|
| **Tipo** | Card pai |
| **Épico** | SIS-508 — Hub de Afiliados |
| **Onda** | 1 — Acesso e Aprovação |
| **Cards filhos** | 5 |

## Descrição

A ferramenta que a Porto usa para decidir quem entra no programa. A decisão é integralmente da Porto — risco, compliance e jurídico —, e integralmente manual: o sistema não avalia perfil, não valida documento automaticamente e não sugere resultado. Ele organiza a fila, mostra o cadastro completo, registra a decisão com justificativa e avisa o afiliado.

Duas exigências do programa moldam este bloco. A primeira é a trilha auditável: para cada cadastro é preciso saber quem decidiu, quando e por quê, com histórico que não pode ser editado nem apagado. A segunda é a devolutiva: o afiliado precisa saber o resultado, e no caso de reprovação, o motivo.

A aprovação é também o gatilho de tudo o que vem depois. Nesta onda ela libera a criação de senha e o acesso ao aplicativo. Nas próximas, é o mesmo momento que vai disparar a criação do cupom exclusivo no sistema da Porto — e a solução já é construída com esse encaixe previsto.

## Critérios de aceite

- [ ] O operador vê todos os cadastros e suas situações em uma fila.
- [ ] O operador busca um cadastro pelo nome.
- [ ] O operador abre um cadastro e vê todos os dados necessários à análise.
- [ ] O operador aprova um cadastro, e o afiliado é avisado e recebe o link para criar a senha.
- [ ] O operador reprova um cadastro informando o motivo, e o afiliado recebe a devolutiva.
- [ ] Toda decisão fica registrada com autor, data e motivo, em histórico que não é editado nem apagado.
- [ ] Um cadastro que já teve decisão não pode ser decidido de novo.

## Objetivo

Entregar à Porto a ferramenta de análise e decisão dos cadastros, com trilha auditável completa e devolutiva automática ao afiliado.

## Job Story

Quando chegam cadastros novos de parceiros interessados no programa, eu quero analisá-los e registrar minha decisão com justificativa, para controlar quem representa a marca e ter o histórico disponível para auditoria.

## Links

- Épico: [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508)
- Issue existente: [SIS-519 — \[Painel\] Gestão de usuários](https://mesainc-sisapp.atlassian.net/browse/SIS-519)
- Specs técnicas: `docs/specs/14`, `15`, `17`, `18`
- Requisitos funcionais: RF-06, RF-07, RF-08, RF-10
