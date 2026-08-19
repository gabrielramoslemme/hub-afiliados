---
name: create-api-endpoint
description: Use ao criar rota HTTP na API do porto-hub-afiliados — "cria o endpoint", "nova rota", "expõe no admin", "adiciona o controller", "cria o use case" — em qualquer um dos canais /v1/mobile, /v1/admin ou /v1/webhooks.
---

# Criar endpoint da API

## Antes de tudo: existe guard?

**Nenhuma rota nasce sem guard.** O guard global de negação, `@Public()`, `AffiliateGuard` e `AdminGuard` **ainda não existem neste repositório**.

Enquanto não existirem, uma rota autenticada nasce aberta — não há o que a proteja e não há `@Public()` para excepcionar as públicas. **Escreva o controle de acesso antes da primeira rota autenticada.** Se o pedido for uma rota pública (cadastro, login, termos vigentes, health), pode seguir.

## Ordem

1. **Fechar o contrato antes de escrever.** Em qual dos três canais a rota entra (`mobile`, `admin`, `webhooks`), método e path, corpo de entrada e corpo de resposta. Se o pedido deixar algo em aberto, pergunte — não arbitre.

2. **Tipos compartilhados**, se o painel consome a resposta: `@porto/contracts` primeiro — skill `create-contract`.

3. **DTOs** em `src/http/<canal>/<agregado>/dtos/` — contrato de fio e metadado de OpenAPI são entrega, não domínio:
   - Request: classe com `class-validator` (`@IsEmail`, `@MinLength`) e `@ApiProperty`. Mensagem de erro em pt-BR.
   - Response: classe com `@ApiProperty`. **Classe, não `interface`** — o Swagger precisa do metadado em runtime.
   - Nomenclatura: `<acao>.request.dto.ts`, `<acao>.response.dto.ts`.

4. **Use case** — teste primeiro (skill `create-unit-test`), depois a implementação:
   - Sempre em `src/application/<agregado>/<nome>.use-case.ts`. **O use case não pertence a canal**: aprovar afiliado é operação do negócio, e o canal só decide quem pode chamar.
   - Falha de regra lança `DomainError` (`src/domain/<agregado>/<agregado>.errors.ts`), nunca `NotFoundException` e afins — o lint reprova, e o `HttpExceptionFilter` já traduz `kind` para status.
   - Depende dos **contratos** do domínio, injetados pelo token — nunca de `Repository<T>` do TypeORM nem da classe do adapter:
     ```ts
     constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
     ```
     Esquecer o `@Inject` passa em lint, type-check e build, e só falha quando o container sobe.

5. **Controller** em `src/http/<canal>/<agregado>/<canal>-<agregado>.controller.ts`. Fino: valida entrada pelo DTO, chama o use case, devolve. Sem regra de negócio, e sem tocar em repositório — o `biome check` reprova.

6. **Registrar no módulo do canal** (`src/http/<canal>/<canal>.module.ts`) — o controller em `controllers` e o use case em `providers`. O módulo já importa o `RepositoriesModule`, que exporta os tokens dos repositórios.

7. **Rodar o e2e** (skill `create-e2e-test`) e **conferir o contrato**:
   ```bash
   npm run openapi:generate --workspace apps/api
   node -e "console.log(Object.keys(require('./apps/api/openapi.json').paths))"
   ```

## Atenção: o segmento do canal vai no `@Controller`

Só o `/v1` é aplicado globalmente (`setGlobalPrefix`). Não há `RouterModule` por módulo — estar dentro do `AdminModule` **não** prefixa `admin` na rota.

```ts
@ApiTags('admin/affiliates')
@Controller('admin/affiliates')   // → /v1/admin/affiliates
export class AdminAffiliateController {}
```

Esquecer o segmento publica a rota do painel em `/v1/affiliates`, fora do canal, sem o guard de audiência que a protegeria.

## Swagger não é opcional

O `openapi.json` é o contrato do app Flutter. Rota sem decorator vira contrato incompleto e o app não a enxerga — e o erro não aparece em nenhum teste daqui.

Toda rota precisa de `@ApiTags`, decorator de resposta (`@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiUnauthorizedResponse`) e DTO de classe com `@ApiProperty`.

## Erros

Nada de montar corpo de erro à mão — o `HttpExceptionFilter` global normaliza. Para um código que o cliente precisa distinguir:

```ts
throw new ForbiddenException({
  code: AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW,
  message: 'Cadastro em análise.',
});
```

O `ValidationPipe` global usa `whitelist` e `forbidNonWhitelisted`: campo fora do DTO devolve 400 sozinho, não precisa checar.

## Erros comuns

| Erro | Correção |
|---|---|
| Rota autenticada sem guard global | Ela nasce aberta. Escreva o controle de acesso antes |
| `@Controller('affiliates')` dentro do `AdminModule` | O canal vai no path: `@Controller('admin/affiliates')` |
| Response DTO como `interface` | Classe com `@ApiProperty`, senão some do OpenAPI |
| `id` serial na rota ou na resposta | Sempre `public_id` |
| CPF ou chave PIX em log ou em listagem | Listagem usa `maskCpf`; log nunca |
| Regra de negócio no controller | Controller é fino; a regra é do use case |
| Corpo de erro montado à mão | Deixe o `HttpExceptionFilter` normalizar |
