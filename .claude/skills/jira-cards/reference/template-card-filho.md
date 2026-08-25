# Template — card filho

Arquivo: `docs/tasks/<N-nome-do-bloco>/<N.M>-<slug-kebab-case>.md`

Copie o esqueleto abaixo. `<…>` é para substituir; o resto é literal, incluindo o travessão do título e a tabela sem cabeçalho.

---

```markdown
# <N.M> — <Nome do card>

| | |
|---|---|
| **Tipo** | <Story ou Task> |
| **Card pai** | <Nome do card pai, exatamente como no título dele> |
| **Épico** | SIS-508 — Hub de Afiliados |
| **Issue existente** | <SIS-nnn> |
| **Depende de** | <N.M, N.M> |

## Descrição

<Parágrafo 1 — o que este card entrega e para quem, em uma ou duas frases diretas.>

<Parágrafo 2 — a regra que alguém questionaria, e por que ela existe.>

<Parágrafo 3 — o que este card deliberadamente NÃO faz, e onde isso acontece. Opcional.>

## Critérios de aceite

- [ ] <Comportamento observável, na voz de quem usa.>
- [ ] <Um por linha. Entre 4 e 12.>

## Objetivo

<Um parágrafo: o valor entregue, não a soma dos critérios.>

## Job Story

Quando <situação real do usuário>, eu quero <ação>, para <resultado que ele busca>.

## Links

- Issue existente: [<SIS-nnn> — <título da issue>](https://mesainc-sisapp.atlassian.net/browse/<SIS-nnn>)
- Spec técnica: `docs/specs/<NN-nome-da-spec>.md`
- Requisitos funcionais: <RF-nn> (<o que ele exige>), <RF-nn> (<o que ele exige>)
```

---

## Variações permitidas

| Situação | O que muda |
|---|---|
| Não há issue no Jira ainda | Remova a linha `Issue existente` da tabela e o item correspondente em `Links`. |
| Mais de uma issue | Use `**Issues existentes**` no plural: `SIS-511, SIS-518`. |
| Card sem dependência | `| **Depende de** | — |` |
| Dependência ampla | Texto no lugar dos números: `todos os cards das ondas 2, 3 e 4`. |
| Card prepara algo de outra onda | Acrescente em `Links`: `- Prepara: RF-nn (<o quê>), fora desta onda` |
| Card já verificado | Marque `- [x]` com a evidência entre parênteses e feche a lista com `**Verificado em DD/MM/AAAA** — <n> de <n> atendidos; <o que falta e por quê>.` |

## Tipo: Story ou Task

| Escolha | Quando |
|---|---|
| **Story** | O card muda o que um usuário — afiliado ou operador — consegue fazer. |
| **Task** | O card é infraestrutura, ferramental, contrato ou verificação. Ninguém de fora do time percebe a diferença diretamente. |

Na dúvida, olhe a Job Story: se o "eu" é o afiliado ou o operador da Porto, é Story. Se é alguém do time, é Task.
