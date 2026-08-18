# Autenticação

| | |
|---|---|
| **Tipo** | Card pai |
| **Épico** | SIS-508 — Hub de Afiliados |
| **Onda** | 1 — Acesso e Aprovação |
| **Cards filhos** | 6 |

## Descrição

Tudo o que envolve entrar no sistema — pelo aplicativo, como afiliado, e pelo painel, como operador da Porto.

Duas características do programa moldam este bloco. A primeira: o afiliado não tem senha quando se cadastra. Ele a cria depois que a Porto aprova o perfil, por um link enviado por e-mail. Até lá, se tentar entrar, precisa receber a informação correta sobre a situação do seu cadastro — "Cadastro em análise." — e não uma mensagem genérica de senha inválida.

A segunda: afiliados e operadores compartilham o mesmo registro de identidade, mas jamais podem cruzar de canal. Um operador não entra no aplicativo; um afiliado não entra no painel. Essa separação é o ponto mais sensível de todo o bloco e tem card e verificação próprios.

Também entram aqui a recuperação de senha, comum aos dois públicos, e a manutenção da sessão do aplicativo, que evita pedir senha ao afiliado a cada uso.

## Critérios de aceite

- [ ] O afiliado aprovado cria sua senha pelo link recebido por e-mail e entra no aplicativo.
- [ ] O afiliado ainda em análise recebe a mensagem "Cadastro em análise." ao tentar entrar.
- [ ] O afiliado reprovado recebe a devolutiva ao tentar entrar.
- [ ] O operador da Porto entra no painel com e-mail e senha.
- [ ] Afiliados e operadores conseguem recuperar a senha esquecida.
- [ ] Um afiliado não consegue acessar nada do painel, e um operador não consegue acessar nada do aplicativo.
- [ ] O afiliado permanece conectado entre usos do aplicativo, sem digitar a senha de novo.

## Objetivo

Dar a afiliados e operadores acesso seguro ao seu próprio canal, com a situação do cadastro sempre clara para o afiliado e sem qualquer possibilidade de um público acessar a área do outro.

## Job Story

Quando eu volto ao aplicativo depois de me candidatar, eu quero entender em que pé está meu cadastro e, se aprovado, conseguir entrar, para começar a divulgar sem precisar perguntar a ninguém.

## Links

- Épico: [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508)
- Issues existentes: [SIS-511 — \[App\] Tela de login](https://mesainc-sisapp.atlassian.net/browse/SIS-511), [SIS-518 — \[Painel\] Login](https://mesainc-sisapp.atlassian.net/browse/SIS-518)
- Specs técnicas: `docs/specs/07`, `10`, `11`, `12`, `13`, `16`
- Requisitos funcionais: RF-04, RF-09, RF-32
