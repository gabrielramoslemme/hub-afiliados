# Cadastro do afiliado — pré-cadastro no aplicativo

**Data:** 2026-08-20 · **Card:** 2.2 (Pré-cadastro no aplicativo) · **Épico:** SIS-508 · **RF:** RF-02, RF-03, RF-05

Substitui, para efeito de implementação, a spec `09-cadastro-e-termos.md` do repositório de docs. Aquela spec foi escrita antes do refactor de camadas (`a77ce93`, `e636568`, `167d2e6`, `21ad693`) e propõe estruturas que hoje o Biome reprova. O conteúdo de negócio dela continua valendo; a forma, não.

O gerenciamento de termos e condições (card 2.1) saiu de escopo: o cadastro não pede nem confere aceite de termos, e a API não expõe rota para versão vigente.

## Entrega

```
POST /v1/mobile/affiliates      → 201 { publicId, status }
```

Uma rota pública. O guard global de negação e o `@Public()` são do card 3.1 e ainda não existem — a skill `create-api-endpoint` autoriza rota pública nascer antes deles. **Nenhuma rota autenticada entra nesta entrega.**

Não há migration: `users`, `affiliates` e `affiliate_status_history` já existem.

## Decisões de desenho

### O corpo de erro tem uma forma só

O `ValidationPipe` devolve `message` como lista, com um item por campo; o `DomainError` devolve texto. O `HttpExceptionFilter` junta a lista num período só, então `message` é sempre string — o app não precisa testar o tipo do campo antes de exibir.

### `INVALID_INPUT` é 400, não 422

A spec 09 devolvia 422. O `HttpExceptionFilter` não tem 422 na tabela de `kind` → status. As recusas de validação de negócio saem **400**; os dois duplicados saem **409**.

### A transação mora no adapter

Usuário, afiliado e a primeira linha da trilha nascem juntos ou não nascem. O `CLAUDE.md` da API é explícito: *"escrita que precisa ser atômica vira método do agregado, com a transação inteira dentro do adapter. Nenhum `EntityManager` atravessa o contrato."* Logo, `AffiliateRepository.createWithUser()` — e não o `TransactionService` injetado que a spec 09 propunha, que hoje quebra o lint da camada `application`.

### Fora de escopo, e por quê

**Rate limit no POST público.** A spec 09 põe `@Throttle`, mas `@nestjs/throttler` não está instalado. Instalar a dependência e ligar o guard global é trabalho do card 3.1 (controle de acesso por canal), junto com o guard de negação por omissão. Registrado aqui como pendência conhecida, não como esquecimento.

---

## Passo 1 — `@porto/contracts`: códigos de erro do cadastro

`packages/contracts/src/enums/index.ts`, ao fim do arquivo:

```ts
export enum RegistrationErrorCodeEnum {
  INVALID_CPF = 'INVALID_CPF',
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  CPF_ALREADY_REGISTERED = 'CPF_ALREADY_REGISTERED',
  PIX_KEY_MISMATCH = 'PIX_KEY_MISMATCH',
  PIX_KEY_INVALID = 'PIX_KEY_INVALID',
}

/** Todo `code` que o corpo de erro da API pode carregar. */
export type ApiErrorCode = AuthErrorCodeEnum | RegistrationErrorCodeEnum;
```

Depois, obrigatoriamente:

```bash
npm run build --workspace packages/contracts
```

E o `CLAUDE.md` da raiz, na lista de *Vocabulário compartilhado*, ganha `RegistrationErrorCodeEnum` ao fim da linha de enums.

## Passo 2 — `DomainError.code` passa a aceitar os dois enums

`apps/api/src/domain/errors/domain.error.ts`: troque o import de `AuthErrorCodeEnum` por `ApiErrorCode` e o tipo do campo:

```ts
readonly code: ApiErrorCode | null = null;
```

`apps/api/src/infra/shared/filters/http-exception.filter.ts`: `ErrorDescription.code` e o cast em `describe()` passam de `AuthErrorCodeEnum` para `ApiErrorCode`.

O `http-exception.filter.spec.ts` existente precisa continuar verde sem alteração.

## Passo 3 — Regra pura: validação de chave PIX

**Teste primeiro.** `apps/api/src/domain/affiliates/pix-key.util.spec.ts`, no padrão de `cpf.util.spec.ts` (descrições em inglês, `describe` por função):

- `isValidPixKey(PixKeyTypeEnum.EMAIL, 'marina@email.com')` → `true`
- e-mail sem domínio, com espaço, vazio → `false`
- `PixKeyTypeEnum.PHONE` com `'(11) 99999-9999'` (11 dígitos) → `true`
- telefone com `'+5511999999999'` (13 dígitos) → `true`
- telefone com 9 dígitos ou 14 dígitos → `false`
- `PixKeyTypeEnum.CPF` com CPF válido → `true`; com dígito verificador errado → `false`
- `normalizePixKey(PixKeyTypeEnum.CPF, '529.982.247-25')` → `'52998224725'`
- `normalizePixKey(PixKeyTypeEnum.EMAIL, ' Marina@Email.com ')` → `'marina@email.com'`
- `normalizePixKey(PixKeyTypeEnum.PHONE, '(11) 99999-9999')` → `'11999999999'`

`apps/api/src/domain/affiliates/pix-key.util.ts`:

```ts
import { PixKeyTypeEnum } from '@porto/contracts';
import { isValidCpf, sanitizeCpf } from './cpf.util';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** DDD + 8 ou 9 dígitos, com ou sem o código do país. */
const PHONE_DIGITS = /^\d{10,13}$/;

export function normalizePixKey(type: PixKeyTypeEnum, key: string): string {
  const trimmed = key.trim();
  if (type === PixKeyTypeEnum.CPF) return sanitizeCpf(trimmed);
  if (type === PixKeyTypeEnum.PHONE) return trimmed.replace(/\D/g, '');
  return trimmed.toLowerCase();
}

export function isValidPixKey(type: PixKeyTypeEnum, key: string): boolean {
  const normalized = normalizePixKey(type, key);
  if (type === PixKeyTypeEnum.CPF) return isValidCpf(normalized);
  if (type === PixKeyTypeEnum.PHONE) return PHONE_DIGITS.test(normalized);
  return EMAIL_PATTERN.test(normalized);
}
```

A chave é **gravada normalizada** — CPF e telefone só com dígitos, e-mail em minúsculas. O arquivo de pagamento precisa de forma previsível, e a comparação com o CPF do cadastro só é honesta sobre dígitos.

## Passo 4 — Erros de domínio

`apps/api/src/domain/affiliates/affiliates.errors.ts`:

| Classe | `kind` | `code` | Mensagem (pt-BR) |
|---|---|---|---|
| `InvalidCpfError` | `INVALID_INPUT` | `INVALID_CPF` | `Informe um CPF válido.` |
| `InvalidPixKeyError` | `INVALID_INPUT` | `PIX_KEY_INVALID` | `Informe uma chave PIX válida para o tipo escolhido.` |
| `PixKeyMismatchError` | `INVALID_INPUT` | `PIX_KEY_MISMATCH` | `A chave PIX do tipo CPF precisa ser igual ao CPF informado.` |
| `EmailAlreadyRegisteredError` | `CONFLICT` | `EMAIL_ALREADY_REGISTERED` | `Este e-mail já está cadastrado.` |
| `CpfAlreadyRegisteredError` | `CONFLICT` | `CPF_ALREADY_REGISTERED` | `Este CPF já está cadastrado.` |

Forma de cada uma, no padrão que o `CLAUDE.md` da API já mostra:

```ts
export class EmailAlreadyRegisteredError extends DomainError {
  readonly kind = DomainErrorKindEnum.CONFLICT;
  readonly code = RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED;

  constructor() {
    super('Este e-mail já está cadastrado.');
  }
}
```

## Passo 5 — Contrato do repositório: `createWithUser()`

`apps/api/src/domain/affiliates/affiliate.repository.ts`, acrescentando ao arquivo existente:

```ts
export interface CreateAffiliateWithUserInput {
  fullName: string;
  email: string;
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
}
```

e, na interface `AffiliateRepository`:

```ts
  /**
   * Cria o usuário sem senha, o afiliado em PENDING_APPROVAL e a primeira linha
   * da trilha na mesma transação. Trilha que pode ficar de fora não é trilha, e
   * usuário órfão barraria a pessoa de se cadastrar de novo com o mesmo e-mail.
   */
  createWithUser(input: CreateAffiliateWithUserInput): Promise<AffiliateWithUser>;
```

`PixKeyTypeEnum` entra no import de `@porto/contracts` que o arquivo já tem.

**Isto quebra a compilação de `src/testing/mocks/repositories/affiliate.repository.mock.ts`** até `createWithUser: jest.fn()` ser acrescentado. É o comportamento desejado.

## Passo 6 — Adapter: a transação

`apps/api/src/infra/database/typeorm/repositories/affiliate.typeorm-repository.ts`:

```ts
  async createWithUser(input: CreateAffiliateWithUserInput): Promise<AffiliateWithUser> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.save(
          manager.create(UserTypeormEntity, {
            name: input.fullName,
            email: input.email,
            password: null,
            passwordSetAt: null,
            shouldChangePassword: false,
            isActive: true,
            type: UserTypeEnum.AFFILIATE,
            role: null,
          }),
        );

        const affiliate = await manager.save(
          manager.create(AffiliateTypeormEntity, {
            userId: user.id,
            cpf: input.cpf,
            pixKeyType: input.pixKeyType,
            pixKey: input.pixKey,
            status: AffiliateStatusEnum.PENDING_APPROVAL,
          }),
        );

        await manager.insert(AffiliateStatusHistoryTypeormEntity, {
          affiliateId: affiliate.id,
          fromStatus: null,
          toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          reason: null,
          actorUserId: null,
        });

        return { ...affiliate, user };
      });
    } catch (error) {
      throw translateUniqueViolation(error);
    }
  }
```

Com um helper de módulo no mesmo arquivo:

```ts
const UNIQUE_VIOLATION = '23505';

/**
 * A checagem prévia do use case dá a mensagem boa no caso comum; o índice único
 * é o que decide quando dois cadastros chegam juntos. Sem esta tradução a
 * corrida vira 500.
 */
function translateUniqueViolation(error: unknown): unknown {
  const constraint = (error as { code?: string; constraint?: string });
  if (constraint.code !== UNIQUE_VIOLATION) return error;
  if (constraint.constraint === 'users_email_key') return new EmailAlreadyRegisteredError();
  if (constraint.constraint === 'affiliates_cpf_key') return new CpfAlreadyRegisteredError();
  return error;
}
```

Os nomes das constraints são os que o Postgres gerou em `1755400000000-CreateCoreTables.ts` (`email citext NOT NULL UNIQUE` → `users_email_key`; `cpf varchar(11) NOT NULL UNIQUE` → `affiliates_cpf_key`).

## Passo 7 — Use case do pré-cadastro

**Teste primeiro.** `apps/api/src/application/affiliates/create-affiliate.use-case.spec.ts`. Dublês dos contratos (`userRepositoryMock`, `affiliateRepositoryMock`, `mailerMock`), instanciação direta, **sem `Test.createTestingModule`**. Descrições em inglês. Um `expect` por comportamento.

Entrada base do teste:

```ts
const input = {
  fullName: 'Marina Ferraz',
  email: 'marina@email.com',
  cpf: '529.982.247-25',
  pixKeyType: PixKeyTypeEnum.EMAIL,
  pixKey: 'marina@email.com',
};
```

`affiliates.createWithUser` devolve `buildAffiliate({ publicId: '...' })`.

Casos, um por critério de aceite do card 2.2:

| Teste | Espera |
|---|---|
| `creates the affiliate pending approval` | resultado `{ publicId, status: PENDING_APPROVAL }` |
| `creates the user without a password` | `affiliates.createWithUser` chamado — nenhum campo de senha no input |
| `stores the cpf with digits only` | `createWithUser` recebe `cpf: '52998224725'` |
| `sends the registration received email` | `mailer.send` com `template: REGISTRATION_RECEIVED`, `to: 'marina@email.com'` |
| `rejects a cpf with an invalid check digit` | `InvalidCpfError` |
| `rejects a pix key of type cpf that differs from the informed cpf` | `PixKeyMismatchError` |
| `accepts a pix key of type cpf equal to the informed cpf` | resolve, e `createWithUser` recebe `pixKey: '52998224725'` |
| `rejects a malformed pix key` | `InvalidPixKeyError` |
| `rejects an email already registered` | `EmailAlreadyRegisteredError` |
| `rejects a cpf already registered` | `CpfAlreadyRegisteredError` |
| `does not send the email when the registration fails` | `mailer.send` não chamado |

`apps/api/src/application/affiliates/create-affiliate.use-case.ts`:

```ts
export interface CreateAffiliateInput {
  fullName: string;
  email: string;
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
}

export interface CreateAffiliateOutput {
  publicId: string;
  status: AffiliateStatusEnum;
}
```

Ordem do `execute`, que é a ordem em que a pessoa corrige o formulário:

1. `sanitizeCpf` + `isValidCpf`, senão `InvalidCpfError`
2. chave PIX: `isValidPixKey` → `InvalidPixKeyError`; tipo `CPF` com dígitos diferentes do CPF do cadastro → `PixKeyMismatchError`
3. `users.findByEmail(email)` preenchido → `EmailAlreadyRegisteredError`
4. `affiliates.findByCpf(cpf)` preenchido → `CpfAlreadyRegisteredError`
5. `affiliates.createWithUser({ ..., pixKey: normalizePixKey(...) })`
6. `mailer.send({ template: REGISTRATION_RECEIVED, to, toName, variables: { name: primeiroNome } })` — **depois** do `createWithUser`, fora de `try/catch`: o port nunca lança
7. devolve `{ publicId, status }`

Dependências, na ordem do construtor: `USER_REPOSITORY`, `AFFILIATE_REPOSITORY`, `MAILER` — declaradas no `provideUseCase` do `UseCasesModule` (`src/infra/di/`), não no construtor.

Nada de `@nestjs/common` no use case: a classe é TypeScript puro, e o Biome reprova o pacote inteiro nesta camada.

## Passo 8 — DTOs

`apps/api/src/http/mobile/affiliates/dtos/create-affiliate.request.dto.ts` — classe `implements CreateAffiliateInput`, para o compilador cobrar que o fio e o use case não divirjam:

| Campo | Validação | Mensagem pt-BR |
|---|---|---|
| `fullName` | `@IsString`, `@IsNotEmpty`, `@MaxLength(255)`, `@Matches(/^\S+(\s+\S+)+$/)`, `@Transform` trim | `Informe o nome completo.` |
| `email` | `@IsEmail`, `@MaxLength(255)`, `@Transform` trim + lowercase | `Informe um e-mail válido.` |
| `cpf` | `@IsString`, `@Length(11, 14)` | `Informe um CPF válido.` |
| `pixKeyType` | `@IsEnum(PixKeyTypeEnum)` | `Tipo de chave PIX inválido.` |
| `pixKey` | `@IsString`, `@IsNotEmpty`, `@MaxLength(140)`, `@Transform` trim | `Informe a chave PIX.` |

O `@Matches` em `fullName` é o AC *"são obrigatórios: nome completo…"*: sem ele, `"Marina"` passa. Toda mensagem termina em ponto porque o filtro junta várias numa frase só.

`create-affiliate.response.dto.ts` — classe com `publicId` (`format: 'uuid'`) e `status` (`enum: AffiliateStatusEnum`).

## Passo 9 — Controller e módulo

`apps/api/src/http/mobile/affiliates/mobile-affiliates.controller.ts` — `@Controller('mobile/affiliates')`, `@Post()`, `@HttpCode(HttpStatus.CREATED)`, `@ApiCreatedResponse`, `@ApiBadRequestResponse`, `@ApiConflictResponse`, delegando ao use case sem regra nenhuma.

**O segmento do canal vai no `@Controller`** — não há `RouterModule`; esquecer publica a rota fora do canal.

`apps/api/src/http/mobile/mobile.module.ts` ganha o controller em `controllers` e o use case em `providers`. `RepositoriesModule` já está importado; `MailModule` é `@Global()` e não precisa de import.

## Passo 10 — E2E

`apps/api/test/mobile-registration.e2e-spec.ts`. `beforeAll` replicando os **três** globais do `main.ts` — `setGlobalPrefix('v1')`, `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` e `useGlobalFilters(new HttpExceptionFilter())`, sem o qual a asserção de `code` falha. O `MAILER` é sobrescrito com `mailerMock()` via `.overrideProvider(MAILER)`.

`beforeEach`:

```ts
await dataSource.query(
  'TRUNCATE affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
);
```

Casos:

- `registers an affiliate pending approval` → 201, `{ publicId: expect.any(String), status: 'PENDING_APPROVAL' }`
- `does not create a password for the pre-registration` → `SELECT password FROM users` devolve `null`
- `records the initial transition in the audit trail` → uma linha em `affiliate_status_history` com `from_status` nulo e `to_status` `PENDING_APPROVAL`
- `rejects an unknown field` → 400 (`forbidNonWhitelisted`)
- `rejects a duplicated email` → 409, `code` `EMAIL_ALREADY_REGISTERED`
- `rejects a duplicated cpf` → 409, `code` `CPF_ALREADY_REGISTERED`
- `rejects a pix key of type cpf that differs from the informed cpf` → 400, `code` `PIX_KEY_MISMATCH`
- `sends the registration received email` → dublê do `MAILER` chamado com `REGISTRATION_RECEIVED`

`apps/api/test/repositories/affiliate.repository.e2e-spec.ts` ganha um `describe('createWithUser')`:

- `creates user, affiliate and the first history row atomically`
- `rolls back the user when the affiliate insert fails` (CPF duplicado numa segunda chamada) → `SELECT count(*) FROM users` inalterado

## Passo 11 — Quality gate

```bash
npm run lint && npm run type-check && npm run test
npm run db:up && npm run typeorm:run --workspace apps/api
npm run test:e2e --workspace apps/api
npm run typeorm:generate --workspace apps/api --name=Drift   # espera "No changes" — sai com código ≠ 0, é sucesso
npm run openapi:generate --workspace apps/api
node -e "console.log(Object.keys(require('./apps/api/openapi.json').paths))"
```

A rota nova precisa aparecer na última saída. Commit em inglês, Conventional Commits, escopo `api` (e um commit separado com escopo `contracts` para o enum).

## Rastreabilidade dos critérios de aceite

| Critério (card) | Onde é provado |
|---|---|
| 2.2 — envio sem autenticação | e2e `registers an affiliate pending approval` |
| 2.2 — campos obrigatórios | DTO + e2e de validação |
| 2.2 — CPF inválido recusado | `InvalidCpfError` |
| 2.2 — e-mail já cadastrado recusado | `EmailAlreadyRegisteredError` + índice único |
| 2.2 — CPF já cadastrado recusado | `CpfAlreadyRegisteredError` + índice único |
| 2.2 — chave PIX tipo CPF igual ao CPF | `PixKeyMismatchError` |
| 2.2 — formato de e-mail e telefone validado | `pix-key.util.spec.ts` |
| 2.2 — cadastro fica em análise | `status: PENDING_APPROVAL` no `createWithUser()` |
| 2.2 — nenhuma senha criada | e2e `does not create a password for the pre-registration` |
| 2.2 — e-mail de confirmação | `mailer.send(REGISTRATION_RECEIVED)`, unitário e e2e |
| 2.2 — aparece na fila do painel | linha em `affiliates` com `PENDING_APPROVAL`; a tela é do card 4.1 |
| Pai — sem triagem automática | nenhum passo decide status; sempre `PENDING_APPROVAL` |
