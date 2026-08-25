# Template — card pai

Arquivo: `docs/tasks/<N-nome-do-bloco>/0-CARD-PAI.md`

O card pai agrupa os filhos e carrega a justificativa do bloco inteiro. Ele não tem número no título e não tem `Depende de`.

---

```markdown
# <Nome do bloco>

| | |
|---|---|
| **Tipo** | Card pai |
| **Épico** | SIS-508 — Hub de Afiliados |
| **Onda** | <N> — <Nome da onda> |
| **Cards filhos** | <n> |

## Descrição

<Parágrafo 1 — o que o bloco entrega, em uma frase forte.>

<Parágrafo 2 — as exigências do programa que moldam o bloco. É aqui que entra o "por quê" que os filhos herdam.>

<Parágrafo 3 — como o bloco se conecta ao que vem depois. Opcional, mas costuma ser o parágrafo mais útil.>

## Critérios de aceite

- [ ] <Um critério por capacidade entregue pelo bloco — não a soma dos critérios dos filhos.>

## Objetivo

<Um parágrafo: o que o bloco entrega ao negócio.>

## Job Story

Quando <situação>, eu quero <ação>, para <resultado>.

## Links

- Épico: [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508)
- Issue existente: [<SIS-nnn> — <título>](https://mesainc-sisapp.atlassian.net/browse/<SIS-nnn>)
- Specs técnicas: `docs/specs/<NN>`, `<NN>`, `<NN>`
- Requisitos funcionais: <RF-nn>, <RF-nn>, <RF-nn>
```

---

## Diferenças em relação ao card filho

| | Card pai | Card filho |
|---|---|---|
| Nome do arquivo | `0-CARD-PAI.md` | `N.M-slug.md` |
| Título | sem número | `N.M — Nome` |
| `Onda` na tabela | sim | não |
| `Cards filhos` na tabela | sim | não |
| `Card pai` na tabela | não | sim |
| `Depende de` na tabela | não | sim |
| Critérios de aceite | por capacidade do bloco | por comportamento do card |
| Specs em `Links` | só os números: `docs/specs/14`, `15` | caminho completo do arquivo |

## Os critérios de aceite do card pai

O erro mais comum é copiar todos os critérios dos filhos. O card pai responde **"o bloco está pronto?"**, e cada critério é uma capacidade inteira:

```
- [ ] O operador vê todos os cadastros e suas situações em uma fila.
- [ ] O operador aprova um cadastro, e o afiliado é avisado e recebe o link para criar a senha.
- [ ] Toda decisão fica registrada com autor, data e motivo, em histórico que não é editado nem apagado.
```

Três linhas cobrem cinco cards filhos. Se o card pai tem mais critérios que a soma dos filhos, ele está detalhando demais.
