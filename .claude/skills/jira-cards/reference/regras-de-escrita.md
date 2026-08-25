# Regras de escrita dos cards

O que separa um card que a Porto lê de um card que só o time entende. Todos os exemplos de "certo" são texto real de `docs/tasks/`.

## A regra que atravessa tudo

**O card descreve comportamento; a spec descreve construção.**

Se a frase só faz sentido para quem vai abrir o editor, ela pertence a `docs/specs/`. Vale para as sete partes do card, sem exceção — inclusive para a Descrição, que é onde o vazamento técnico costuma entrar disfarçado de contexto.

## Descrição

Dois a quatro parágrafos. O primeiro situa; os demais explicam **por que** as regras são o que são.

O teste: se um parágrafo pode ser substituído por uma captura de tela, ele não deveria existir.

**Errado** — descreve a tela:

> A tela tem os campos nome, e-mail, CPF, tipo de chave PIX e chave PIX, além de um checkbox de aceite. Ao submeter, o backend valida os campos e persiste o registro na tabela de afiliados com status PENDING_APPROVAL.

**Certo** — explica a regra:

> A chave PIX é usada exclusivamente para o pagamento dos incentivos e precisa estar no nome da própria pessoa, como o layout informa. Quando o tipo escolhido é CPF, a chave tem que ser o mesmo CPF informado no cadastro — essa é a única verificação de titularidade que conseguimos fazer sem consultar terceiros.
>
> Não há campo de senha: este é um pré-cadastro. A senha é criada depois da aprovação, pelo link enviado por e-mail (card 3.3).

O segundo trecho responde a duas perguntas que alguém faria na revisão. O primeiro não responde a nenhuma.

**Parágrafo de fronteira.** Quando o card deliberadamente não faz algo que o leitor esperaria, diga onde aquilo acontece. É o que evita a pergunta "e a senha?" na revisão.

## Critérios de aceite

Checkbox, um comportamento por linha, na voz de quem usa. Entre 4 e 12 — mais que isso e o card deveria ser dois.

| Errado | Certo |
|---|---|
| `A rota POST /v1/admin/affiliates/:id/approve retorna 409 se já decidido` | `Tentar aprovar um cadastro que já teve decisão é recusado com mensagem clara.` |
| `Implementar transação para garantir atomicidade do envio de e-mail` | `Uma falha no envio do e-mail não desfaz a aprovação já registrada.` |
| `Adicionar índice na coluna status` | *(nada — é decisão de implementação, vai para a spec)* |
| `Validar CPF com algoritmo de dígito verificador` | `Um CPF inválido é recusado com mensagem clara.` |
| `A listagem aplica maskCpf` | `Na fila, o CPF aparece parcialmente oculto; completo apenas no detalhe.` |

**Inclua sempre os caminhos infelizes.** Um card que só descreve o caminho feliz sobe incompleto. Cada regra de negócio da Descrição vira ao menos um critério de recusa.

### Evidência em critério verificado

Quando o critério já foi cumprido, ele vira `- [x]` e ganha um parêntese com a prova. **O parêntese é o único lugar do card onde termo técnico é bem-vindo** — ele existe para quem for auditar a entrega, não para quem lê o requisito.

```markdown
- [x] A API sobe localmente com um comando e responde a uma verificação de saúde. (`GET /v1/health`, testado por `health.e2e-spec.ts`)
- [x] Toda atualização de estrutura pode ser desfeita por comando. (`down()` implementado nas duas migrations, `npm run typeorm:revert`)
```

O texto antes do parêntese continua em linguagem de produto e continua fazendo sentido sozinho. Se apagar o parêntese quebra o critério, o critério estava técnico desde o início.

Feche a lista com a data e o placar:

```markdown
**Verificado em 18/08/2026** — 5 de 6 atendidos; o item pendente depende da Spec 07.
```

**Inclua o efeito colateral esperado.** "O afiliado recebe e-mail de boas-vindas com o link para criar a senha" é critério de aceite, mesmo que o e-mail seja construído em outro card.

## Objetivo

Um parágrafo. O valor entregue, não a soma dos critérios.

**Errado:** "Implementar a aprovação de cadastros com validação de status, registro em trilha e disparo de e-mail."

**Certo:** "Permitir que a Porto aprove parceiros e que a aprovação libere automaticamente o acesso do afiliado ao aplicativo, sem qualquer etapa manual entre uma coisa e outra."

O segundo diz o que muda no mundo. O primeiro é a lista de tarefas com outro nome.

## Job Story

Uma só. Formato fixo:

> Quando **\<situação real\>**, eu quero **\<ação\>**, para **\<resultado que a pessoa busca\>**.

O "eu" é o usuário do card — afiliado ou operador da Porto —, nunca o time de desenvolvimento.

**Errado:** "Como desenvolvedor, eu quero um endpoint de aprovação, para que o painel possa consumi-lo."

**Certo:** "Quando eu analiso um cadastro e considero o perfil adequado ao programa, eu quero aprová-lo em um clique e ter certeza de que o parceiro será avisado e conseguirá entrar, para não precisar acompanhar manualmente o que acontece depois."

Repare no "para": ele é o medo ou o esforço que a pessoa quer evitar. Job Story cujo "para" repete a ação está incompleta.

Em card de tipo Task, o "eu" é quem consome a entrega — quem constrói o aplicativo, quem opera o ambiente. Continua sendo uma pessoa com um problema, não um componente.

## Links

Sempre nesta ordem, omitindo o que não se aplica:

```markdown
- Épico: [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508)
- Issue existente: [SIS-519 — \[Painel\] Gestão de usuários](https://mesainc-sisapp.atlassian.net/browse/SIS-519)
- Spec técnica: `docs/specs/15-decisao-de-cadastro.md`, `docs/specs/17-painel-fila-de-afiliados.md`
- Requisitos funcionais: RF-07 (decisão com trilha), RF-10 (aprovação integralmente manual)
- Prepara: RF-11 (criação do cupom exclusivo na aprovação), fora desta onda
```

Colchetes no título da issue são escapados: `\[Painel\]`. Sem isso o markdown quebra o link.

O item **Requisitos funcionais** traz o RF com uma glosa curta do que ele exige — não o enunciado inteiro. É o que permite a rastreabilidade reversa a partir do card.

## Idioma

Tudo o que uma pessoa lê é pt-BR: título, descrição, critérios, objetivo, Job Story.

Identificadores continuam em inglês nas specs e no código, e **não entram no card**. Se você precisou escrever `PENDING_APPROVAL` no card, a frase certa era "em análise".

| Não escreva | Escreva |
|---|---|
| `PENDING_APPROVAL` | em análise |
| `APPROVED` / `REJECTED` | aprovado / reprovado |
| `affiliate` | afiliado |
| `admin`, operador com role X | operador |
| `public_id` | identificador do cadastro *(ou nada — normalmente é detalhe)* |
| endpoint, rota, payload | *(nada — reescreva em termos de comportamento)* |

## Tamanho

Card filho fica entre 40 e 80 linhas. Passou disso, verifique:

- Os critérios cobrem dois atores diferentes? → dois cards.
- A Descrição está explicando a solução em vez da regra? → corte.
- Há critério que ninguém fora do time consegue verificar? → vai para a spec.

## Numeração e nome de arquivo

`N.M-slug-em-kebab-case.md`, onde `N` é o bloco e `M` a ordem dentro dele. O slug é uma versão curta do título, sem acento e sem artigo:

| Título | Arquivo |
|---|---|
| `4.3 — Aprovar cadastro` | `4.3-aprovar-cadastro.md` |
| `2.1 — Termos e condições vigentes` | `2.1-termos-e-condicoes-vigentes.md` |
| `1.4 — Contrato de API publicado para o aplicativo` | `1.4-contrato-de-api-publicado.md` |

Número de card removido não é reaproveitado — a numeração é referência em conversa e em outros cards.
