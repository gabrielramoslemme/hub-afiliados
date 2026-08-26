---
name: create-unit-test
description: Use ao escrever teste unitário na API do porto-hub-afiliados — "cria o teste", "testa esse use case", "escreve o spec", "cobre esse mapper" — e antes de implementar qualquer use case, service, mapper ou util, já que o repositório é TDD.
---

# Criar teste unitário

## Overview

Teste unitário roda **sem banco e sem `AppModule`**. Se o seu teste precisa de Postgres, ele é e2e — use a skill `create-e2e-test`.

O repositório é TDD: **o teste que falha vem antes da implementação, sempre.** Escreva o spec, rode, veja falhar pelo motivo certo (`Cannot find module`, `not a function`), só então implemente.

## Onde o arquivo mora

Ao lado do arquivo testado, com sufixo `.spec.ts`:

```
src/application/affiliates/register-affiliate.use-case.ts
src/application/affiliates/register-affiliate.use-case.spec.ts
```

O `jest.config.ts` casa `.*\.spec\.ts$` dentro de `src/`. Nada de pasta `__tests__`.

## Padrão

Instancie a classe direto, passando dublês pelo construtor. **Não use `Test.createTestingModule` em teste unitário** — ele monta o container de DI, que é trabalho de e2e.

```ts
import { MailTemplateEnum } from '@porto/contracts';
import { MailService } from './mail.service';
import { MailProvider } from './mail-provider.interface';

describe('MailService', () => {
  const input = { template: MailTemplateEnum.REGISTRATION_APPROVED, to: 'marina@example.com', toName: 'Marina Ferraz', variables: {} };

  it('does not propagate the error when the provider fails', async () => {
    const provider: MailProvider = { send: jest.fn().mockRejectedValue(new Error('Resend fora do ar')) };
    await expect(new MailService(provider).send(input)).resolves.toBeUndefined();
  });
});
```

## Factories e mocks

Objeto de domínio vem de `src/testing/factories/` — nunca literal repetido:

| Factory | Devolve |
|---|---|
| `buildUser(overrides?)` | `UserEntity` de afiliado, sem senha |
| `buildAdminUser(overrides?)` | `UserEntity` de operador, com senha e `role` |
| `buildAffiliate(overrides?)` | `AffiliateWithUser` `PENDING_APPROVAL`, com `user` embutido |

São os tipos do **domínio** (`src/domain/<agregado>/<nome>.entity.ts`), objetos literais: factory de teste não instancia classe do TypeORM.

Todas aceitam `overrides` — teste só o que muda: `buildAffiliate({ status: AffiliateStatusEnum.APPROVED })`.

Dublê de repositório já existe pronto em `src/testing/mocks/repositories/`, tipado pelo contrato:

```ts
import { USER_REPOSITORY } from '@Domain/users/user.repository';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';

const userRepository = userRepositoryMock();
const useCase = new ApproveAffiliateUseCase(userRepository);
```

Por serem `jest.Mocked<Contrato>`, método novo no contrato quebra a compilação de todos os dublês até ser preenchido — é o comportamento desejado, não efeito colateral. No `Test.createTestingModule`, o dublê entra pelo token: `{ provide: USER_REPOSITORY, useValue: userRepository }`.

Dublê de service reutilizável vira arquivo em `src/testing/mocks/services/`, tipado pelo port e não pela classe concreta, no padrão de `mailer.mock.ts`:

```ts
export const mailerMock = (): jest.Mocked<Mailer> => ({
  send: jest.fn().mockResolvedValue(undefined),
});
```

Precisou de um objeto novo em dois specs? Vira factory. Em um só? Fica local.

## Convenções

- **Descrição do teste em inglês, descrevendo comportamento** e não implementação: `it('rejects a CPF with an invalid check digit')`, não `it('returns false')`. Ver a seção *Idioma no código* no `CLAUDE.md` da raiz.
- `describe` aninhado por função quando o arquivo exporta várias (ver `cpf.util.spec.ts`).
- Repositório é **sempre** dublê do contrato. Se aparecer `Repository<T>` do TypeORM ou uma classe `*TypeormRepository` no seu spec, o desenho está errado — o use case depende da interface do domínio, injetada pelo token.
- Um `expect` por comportamento. Teste que afirma cinco coisas esconde qual quebrou.
- Sem `any`: o lint roda no `test/` e no `src/`.

## Rodar

```bash
npm run test --workspace apps/api                          # tudo
npm run test --workspace apps/api -- cpf.util              # por trecho do caminho
npm run test --workspace apps/api -- --watch
```

## Erros comuns

| Erro | Correção |
|---|---|
| Teste escrito depois da implementação | Apague e recomece. Teste que passa de primeira não prova nada |
| `Test.createTestingModule` para testar uma classe | Instancie direto com dublês no construtor |
| Banco, `AppModule` ou `supertest` no `.spec.ts` | É e2e. Mova para `test/*.e2e-spec.ts` |
| Literal de entidade copiado entre specs | Use ou crie uma factory em `src/testing/factories/` |
| `Cannot find module '@Domain/...'` | Alias novo precisa entrar no `jest.config.ts` **e** no `test/jest-e2e.json` |
| Descrição de teste em pt-BR | Descrição de teste é código: inglês. Só comentário pode ser pt-BR |
