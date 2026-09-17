---
name: create-e2e-test
description: Use ao escrever teste de integração da API do porto-hub-afiliados — "teste e2e", "testa a rota", "teste de integração", "testa o fluxo completo" — ou quando o comportamento sob teste envolve Postgres real, guards, ValidationPipe ou o ciclo HTTP inteiro.
---

# Criar teste e2e

## Overview

E2e sobe o `AppModule` inteiro contra um **Postgres real** e exercita a rota por HTTP. É onde schema quebrado, guard ausente, validação frouxa e transação que não volta aparecem.

Roda com config própria (`test/jest-e2e.json`) e `--runInBand` — os testes compartilham o banco, então não podem correr em paralelo.

## Antes de rodar

```bash
npm run db:up
npm run test:e2e --workspace apps/api
```

**O e2e roda sempre num banco `_test`**, nunca no do `npm run dev`. O `test/e2e-env.ts` acrescenta o sufixo ao nome que vier da `DATABASE_URL` (`hub_afiliados` vira `hub_afiliados_test`), e o `test/e2e-global-setup.ts` cria o banco se faltar e aplica as migrations antes do primeiro spec. Não há passo à mão, e não há configuração que leve a suíte — que começa com `TRUNCATE ... CASCADE` — de volta ao banco de desenvolvimento.

Sem Postgres no ar o erro é `ECONNREFUSED` no global setup, não uma falha de asserção.

## O que testar aqui — e o que não

**Só o que o unitário não alcança.** O use case recebe dublê de repositório, então tudo o que depende do banco, do container ou do fio é daqui:

| Vem para o e2e | Fica no unitário do use case |
|---|---|
| Validação do DTO: campo fora da lista, mensagem do `stopAtFirstError`, teto de percentual, `ParseUUIDPipe` | Qual erro a regra lança, em que ordem, com que guarda de status |
| SQL de verdade: filtro, busca, ordenação por coluna do join, paginação que mantém o total | Mapeamento campo a campo da saída |
| Transação e índice único: corrida decidida pelo índice, escrita que volta inteira | 404 de afiliado ausente, 409 de decisão já tomada |
| Wiring: audiência de cada controller, guard de canal, o link que sai no e-mail renderizado | Variantes de erro de login, anti-enumeração |
| Resposta que não vaza: sem `id`, sem CPF completo na listagem, sem chave PIX em claro | Recuperação silenciosa para quem não pode receber |
| Fluxo ponta a ponta: cadastro → aprovação → link do e-mail → senha → login | |

**Não existe mais suíte de repositório.** O que ela protegia de valor — filtros do token, busca, rollback, tradução de índice — é testado pela rota, que é o contrato de verdade. Rota sem token → 401 também não se repete por rota: o `route-protection.e2e-spec.ts` confere o guard de todo controller, e um teste em `admin-affiliates` prova a negação por omissão.

## Onde o arquivo mora

`apps/api/test/<assunto>.e2e-spec.ts`. Os apoios moram ao lado:

| Arquivo | O que tem |
|---|---|
| `e2e-app.ts` | `createE2eApp()`, `createE2eTestingModule()`, `resetDatabase()` |
| `e2e-fixtures.ts` | `OPERATOR`, `insertOperator`, `signInOperator`, `MARINA`/`CLEIDE`/`ROGERIO`, `register`, `approve`, `nextCouponCode`, `lastLinkTo`, `tokenOf` |
| `e2e-env.ts` · `e2e-global-setup.ts` | o banco `_test` |

## Padrão

```ts
describe('Admin — affiliate queue (e2e)', () => {
  let e2e: E2eApp;
  let token: string;

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    token = await signInOperator(e2e.app, e2e.dataSource);
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('pages through the queue keeping the total', async () => {
    await register(e2e.app, MARINA);

    const response = await request(e2e.app.getHttpServer())
      .get('/v1/admin/affiliates')
      .query({ page: 1, limit: 1 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.total).toBe(1);
  });
});
```

## O app sai do helper

**`createE2eApp()`, nunca `Test.createTestingModule` direto.** Ele faz três coisas que o spec esqueceria:

- **Troca o `COUPON_GATEWAY` pelo `FakeCouponGateway`.** A API sempre fala com a Porto: sem a troca, a aprovação do teste registra cupom de verdade com as credenciais do `.env`.
- **Troca o `MAIL_PROVIDER` pelo `FakeMailProvider`**, que guarda o e-mail **já renderizado**. Com `MAIL_PROVIDER=resend` no `.env`, cada cadastro do teste sairia de verdade. E trocar o provider, e não o `MAILER`, mantém o `ReactEmailRenderer` no caminho: variável que o use case manda com outro nome faz o e-mail não chegar, e o `MailService` engole esse erro de propósito. Para afirmar sobre o e-mail, leia o texto: `e2e.mail.sentTo(email).at(-1)?.text` ou `lastLinkTo(e2e.mail, email)`.
- **Aplica o `configureApp(app)`** (`src/configure-app.ts`), a mesma função do `main.ts`: prefixo `v1`, `ValidationPipe` e `HttpExceptionFilter`. Cópia à mão já tinha divergido — um spec rodava sem `forbidNonWhitelisted` nem o filtro.

Spec que não precisa de HTTP (varredura de rotas, seed) usa `createE2eTestingModule()`, que faz as duas trocas e devolve o builder.

## Isolamento

`resetDatabase(e2e)` no `beforeEach`: trunca todas as tabelas (a lista mora no helper, num lugar só) e esvazia a caixa do `FakeMailProvider`.

Nunca confie em ordem de execução entre `it`s: cada um monta o próprio estado, pela rota pública quando dá (`register`, `approve`) — é o caminho de produção, e não um literal de `createWithUser` copiado.

**O emissor nunca esquece um código, nem o falso.** O `TRUNCATE` limpa a nossa tabela, não a memória dele: cada aprovação usa `nextCouponCode()`, e teste que precisa do mesmo código duas vezes guarda o retorno.

## Corrida e falha no meio da escrita

O que só o banco decide se testa forçando a corrida, sem depender do agendador:

- **Duas requisições que precisam passar juntas pela checagem do use case:** segure as duas no gateway até ambas chegarem (`holdUntilBothArrive` em `admin-affiliates`).
- **Índice único que precisa decidir:** `jest.spyOn(e2e.app.get<Repo>(TOKEN), 'findByCpf').mockResolvedValueOnce(null)` faz a checagem não ver o registro, e é o índice que responde. Afirme também o que **não** ficou gravado.
- **Tempo:** mova a linha no banco (`UPDATE ... SET expires_at = now() - interval '1 minute'`) em vez de congelar o relógio.

Spy precisa de `jest.restoreAllMocks()` no `afterEach`.

## Erros comuns

| Erro | Correção |
|---|---|
| 404 em toda rota | O app não saiu do `createE2eApp()` — faltou o `configureApp` |
| 404 **de vez em quando**, vindo de outra aplicação | App montado com `app.init()` e não `listen(0, '127.0.0.1')`: o `supertest` sobe em `::` e conecta em 127.0.0.1, onde outro servidor local pode estar na mesma porta. Use o helper |
| Asserção de `code` no corpo do erro falha | Mesmo caso: sem o `HttpExceptionFilter` do `configureApp` |
| Teste passa sozinho e falha na suíte | Faltou `resetDatabase` no `beforeEach`, código de cupom repetido, ou spy sem `restoreAllMocks` |
| `ECONNREFUSED` | `npm run db:up` |
| Aprovação do teste volta 503 ou cria cupom na Porto | O spec montou o módulo com `Test.createTestingModule`. Use o helper |
| Afirmação sobre `mailer.send` | O `MAILER` não é mais dublado no e2e. Leia o e-mail renderizado no `FakeMailProvider` |
| Rodar sem `--runInBand` | Os testes brigam pelo mesmo banco. Use sempre o script `test:e2e` |
| `.spec.ts` em vez de `.e2e-spec.ts` | O `testRegex` do e2e é `.e2e-spec.ts$`; o unitário roda `.spec.ts$` e vai tentar rodar seu e2e sem banco |
