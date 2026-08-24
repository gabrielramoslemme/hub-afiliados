---
name: create-e2e-test
description: Use ao escrever teste de integração da API do porto-hub-afiliados — "teste e2e", "testa a rota", "teste de integração", "testa o fluxo completo" — ou quando o comportamento sob teste envolve Postgres real, guards, ValidationPipe ou o ciclo HTTP inteiro.
---

# Criar teste e2e

## Overview

E2e sobe o `AppModule` inteiro contra um **Postgres real** e exercita a rota por HTTP. É onde schema quebrado, guard ausente e validação frouxa aparecem.

Roda com config própria (`test/jest-e2e.json`) e `--runInBand` — os testes compartilham o banco, então não podem correr em paralelo.

## Antes de rodar

```bash
npm run db:up && npm run typeorm:run --workspace apps/api
npm run test:e2e --workspace apps/api
```

Sem banco no ar o erro é `ECONNREFUSED` na compilação do módulo, não uma falha de asserção.

## Onde o arquivo mora

`apps/api/test/<assunto>.e2e-spec.ts`. Testes de repositório ficam em `test/repositories/`.

## Atenção: o e2e não roda o `main.ts`

`Test.createTestingModule` monta o `AppModule`, mas **nada da configuração de bootstrap vem junto**. O que o `main.ts` aplica você replica à mão, ou o teste mente:

| Se você esquecer | Sintoma |
|---|---|
| `app.setGlobalPrefix('v1')` | Toda rota devolve 404 |
| `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` | Payload inválido passa; o teste de validação vira falso positivo |
| `app.useGlobalFilters(new HttpExceptionFilter())` | O corpo do erro não tem `code` nem `timestamp`, e a asserção de `AuthErrorCodeEnum` falha |

O `health.e2e-spec.ts` aplica os dois primeiros. **Teste que afirma sobre corpo de erro precisa do terceiro.**

## Padrão

```ts
describe('Admin — affiliate queue (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE affiliate_status_history, affiliates, users RESTART IDENTITY CASCADE');
  });

  afterAll(async () => { await dataSource.destroy(); });

  it('returns 401 without a token', async () => {
    await request(app.getHttpServer()).get('/v1/admin/affiliates').expect(401);
  });
});
```

## Isolamento

`TRUNCATE <tabelas> RESTART IDENTITY CASCADE` no `beforeEach`. Liste as tabelas **da folha para a raiz** — `CASCADE` resolve as dependências, mas listar explicitamente documenta o que o teste toca.

Nunca confie em ordem de execução entre `it`s: cada um monta o próprio estado.

## O que testar aqui

- **Contrato HTTP:** status, formato do corpo, `code` de erro estável do `AuthErrorCodeEnum`.
- **Guards:** token de afiliado não entra em `/v1/admin`; token de admin não entra em `/v1/affiliate`; rota sem token devolve 401.
- **Validação:** campo fora do DTO devolve 400 (`forbidNonWhitelisted`), CPF inválido, chave PIX incoerente com o tipo.
- **Persistência real:** índice único, `ON DELETE`, índice parcial, transação que grava histórico junto com a mudança de status.
- **Fluxo ponta a ponta:** cadastro → aprovação → e-mail → definição de senha → login.

Regra de negócio isolada não vem para cá — é unitário, mais rápido e mais preciso.

## E-mail

`MAIL_PROVIDER=logger` em teste: nada sai. Para afirmar que o envio aconteceu, sobrescreva o provider com `.overrideProvider(MAIL_PROVIDER)` no `createTestingModule` e inspecione o dublê.

## Erros comuns

| Erro | Correção |
|---|---|
| 404 em toda rota | Faltou `app.setGlobalPrefix('v1')` |
| Asserção de `code` no corpo do erro falha | Faltou `app.useGlobalFilters(new HttpExceptionFilter())` |
| Teste passa sozinho e falha na suíte | Faltou `TRUNCATE` no `beforeEach`, ou o `it` depende do anterior |
| `ECONNREFUSED` | `npm run db:up && npm run typeorm:run --workspace apps/api` |
| Rodar sem `--runInBand` | Os testes brigam pelo mesmo banco. Use sempre o script `test:e2e` |
| `.spec.ts` em vez de `.e2e-spec.ts` | O `testRegex` do e2e é `.e2e-spec.ts$`; o unitário roda `.spec.ts$` e vai tentar rodar seu e2e sem banco |
| Faltou `dataSource.destroy()` | Jest não encerra e a CI trava até o timeout |
