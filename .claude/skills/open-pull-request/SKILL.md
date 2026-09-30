---
name: open-pull-request
description: Use ao abrir pull request no porto-hub-afiliados — "abre o PR", "cria o pull request", "manda para a development" — para montar branch, commits, título e descrição no padrão dos PRs já fechados.
---

# Abrir pull request

O PR é escrito para quem revisa sem ter acompanhado a sessão: diz o que muda, as decisões que não se leem no diff e como foi verificado. **Título e descrição em pt-BR**; branch e commits continuam em inglês, como manda o `CLAUDE.md` da raiz.

## Antes de abrir

1. **Base é `development`**, nunca `main`. O PR de `development` para `main` é a promoção de release, e não sai daqui.
2. **Parta da `origin/development` atual.** A `development` local costuma estar atrasada: `git fetch origin` e compare com `git rev-list --count HEAD..origin/development`. Implementação feita sobre base velha é refeita sobre a nova antes do PR, não empurrada para o revisor resolver.
3. **Outras sessões editam a mesma árvore.** Trabalhe numa worktree criada a partir de `origin/development` e leve para ela só os seus arquivos. Copie `apps/api/.env` e `apps/web/.env.local` e rode `npm ci`.
4. **Quality gate na worktree**, com os números anotados para a descrição:

   ```bash
   npm run lint && npm run type-check && npm run test
   npm run test:e2e --workspace apps/api   # mexeu em rota, DTO ou migration
   npm run build
   ```

   Se o e2e cair inteiro com `relation ... does not exist`, o banco `hub_afiliados_test` foi migrado por outro branch. Ele é descartável: `drop database hub_afiliados_test` e rode de novo, que ele se recria.

## Branch e commits

- **Branch** `feat/<assunto-em-kebab>` (ou `fix/`, `chore/`), em inglês: `feat/affiliate-occupation`, `feat/affiliates-report`.
- **Um commit por pacote**, na ordem da dependência: `feat(contracts):` → `feat(api):` → `feat(web):`. O assunto diz o comportamento, no presente e em inglês: `feat(api): serve the affiliate wallet and referrals from real sales`.
- O corpo do commit, quando existe, também em inglês, e termina com a linha `Co-Authored-By` da atribuição vigente.

## Título

`<tipo>(<escopo>): <o que muda, em pt-BR, minúsculo, sem ponto final>`

- Mais de um pacote: sem escopo, `feat: ...`. Um pacote só: o escopo é ele (`feat(api):`, `feat(infra):`).
- Diz o que a pessoa ganha, não o arquivo que mudou.

Exemplos que já entraram:

- `feat: ocupação do afiliado no cadastro, no perfil e na fila do painel`
- `feat: carteira e indicações do afiliado com dados reais, sem dublê`
- `feat(api): grava o valor do incentivo e a data da venda que a Porto envia`

## Descrição

Seções `##`, nesta ordem, e só as que têm conteúdo:

| Seção | Quando | O que vai |
|---|---|---|
| `> Depende do #N` | o PR se apoia em outro ainda aberto | uma linha, antes de tudo |
| `## O que muda` (ou `## Resumo` + `## O que muda`) | sempre | bullets com o **comportamento** em negrito no início. Em PR grande, subdividir por pacote: **Contrato**, **API**, **Web** |
| `## Decisões` / `## Decisões de produto` | houve escolha que o diff não explica | a escolha em negrito e o porquê. Mudança deliberada de regra anterior entra aqui |
| `## Migração dos dados` | há migration com dado | o que o `up()` e o `down()` fazem e como a ida e a volta foram conferidas |
| `## Pontos de atenção` | há risco no deploy ou dependência externa | o que pode quebrar e onde |
| `## Fora deste PR` | ficou algo de fora de propósito | o que e por quê |
| `## Como foi verificado` (ou `## Testes`) | sempre | os comandos do gate com os números reais, o que os testes novos cobrem e a prova de que protegem a regra: "tirando a linha X, o teste Y falha" |

Estilo:

- Frases curtas, sem travessão. Nome de rota, campo, arquivo e comando em `code`.
- Número de teste é o que o comando imprimiu nesta rodada, nunca estimado.
- Nada de dado pessoal real (CPF, chave PIX) na descrição: use os das fixtures.
- Termine com a linha de atribuição vigente (hoje `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).

## Abrir

```bash
git push -u origin <branch>
gh pr create --base development --head <branch> --title "<título>" --body-file <arquivo>
```

Escreva o corpo num arquivo do scratchpad e passe por `--body-file`: crase e `$` dentro de `--body` inline são interpretados pelo shell.

Depois de abrir, devolva o link do PR. A worktree fica até o merge, e é removida com `git worktree remove` quando o PR fechar.
