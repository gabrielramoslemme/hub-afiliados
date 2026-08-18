# Porto Hub de Afiliados — Arquitetura da Onda 1: Acesso e Aprovação

| | |
|---|---|
| **Projeto** | `porto-hub-afiliados` |
| **Card** | [SIS-508 — Hub de Afiliados](https://mesainc-sisapp.atlassian.net/browse/SIS-508) |
| **Data** | 2026-08-17 |
| **Status** | Aprovado para planejamento |
| **Onda** | 1 de N — Acesso e Aprovação |

> Este documento e os demais em `docs/specs/` são a referência técnica. Os cards
> destinados ao Jira ficam em `docs/tasks/`, em linguagem de produto, e apontam
> para cá pelo campo **Links**.

---

## 1. Contexto

O Hub de Afiliados é um canal de aquisição da Porto Serviços em que parceiros — creators, síndicos, influenciadores do mercado imobiliário e clubes de compra — divulgam um cupom exclusivo e são remunerados por resultado. A venda acontece integralmente nos canais da Porto; a Mesa opera a jornada do parceiro e o pagamento do incentivo.

Fontes deste design:

- **SIS-508** e suas 8 issues filhas: SIS-509 (App · Cadastro), SIS-510 (App · Home), SIS-511 (App · Login), SIS-516 (App · Carteira), SIS-517 (App · Edição de Perfil), SIS-518 (Painel · Login), SIS-519 (Painel · Gestão de usuários), SIS-520 (Painel · Gestão de Pagamentos).
- **Documento Funcional — Escopo Mesa e Pontos de Integração** (anexo do card, v1.0 de 13/08/2026): RF-01 a RF-35, INT-01 a INT-04, dependências D1–D12, pendências P1–P8.
- **Documentação Técnica — Informações de Tráfego e Requisitos de API** (anexo do card, v1.0 de 13/08/2026).
- Layouts anexados às issues SIS-509 e SIS-511.

### Três fronteiras que não se movem

Vindas do documento funcional, condicionam todo o desenho:

1. **Nada transacional na Mesa.** Venda, pagamento do cliente e precificação permanecem nos canais da Porto.
2. **Sem carga de base.** Todo dado cadastral do afiliado é fornecido por ele próprio, em cadastro público.
3. **Sem dado pessoal de cliente.** Somente cupom e informações da venda transitam entre as empresas, vinculados à ordem de serviço e nunca ao cliente. Nenhum código corporativo interno da Porto é exposto.

---

## 2. Escopo desta onda

O documento funcional descreve o universo candidato completo. Esta onda recorta **acesso e aprovação**: o ciclo que vai do cadastro público até o afiliado conseguir entrar no app com a conta aprovada, e a ferramenta que a Porto usa para decidir.

### Entra

| Item | Issue | RF |
|---|---|---|
| Fundação do monorepo, CI e ambiente local | — | — |
| Pré-cadastro público do afiliado | SIS-509 | RF-02, RF-05 |
| Aceite de Termos e Condições com versão, data e hora | SIS-509 | RF-03 |
| Login do app, com estado do cadastro visível ao afiliado | SIS-511 | RF-04 |
| Definição de senha por link enviado após aprovação | SIS-511 | RF-32 |
| Esqueci a senha, no app e no painel | SIS-511 | RF-32 |
| Renovação de sessão | SIS-511 | RF-32 |
| Login do painel com perfis distintos Porto e Mesa | SIS-518 | RF-09, RF-32 |
| Fila de aprovação: lista, busca por nome, filtro por status, detalhe | SIS-519 | RF-06 |
| Aprovar e reprovar com motivo e trilha auditável | SIS-519 | RF-07, RF-10 |
| Devolutiva ao afiliado por e-mail | SIS-519 | RF-08 |
| Contrato OpenAPI versionado e publicado | — | — |

### Não entra

Registrado como backlog desenhado na seção 12:

- SIS-510 (Home), SIS-516 (Carteira), SIS-517 (Edição de Perfil), SIS-520 (Gestão de Pagamentos).
- INT-01 (criação de cupom), INT-02 (link de divulgação), INT-03 (eventos de venda e execução).
- Ledger de incentivos, política de comissionamento, saque, Transfeera, comprovante.
- Notificações push, régua de comunicação além dos e-mails desta onda.
- Upload e análise de documentos de identificação (RF-02, parte documental).

### Por que este recorte

As integrações INT-01 e INT-03 dependem de decisões que ainda estão abertas do lado da Porto — contrato da API de cupons, caminho de exposição do gateway, credenciais, aprovação de SI e Arquitetura (P1, P3, D2, D3, D4, D5). Acesso e aprovação não dependem de nada disso. É o maior bloco de valor que a Mesa consegue construir sem bloqueio externo, e é pré-requisito de todo o resto: sem afiliado aprovado não há cupom, não há venda atribuída e não há incentivo.

---

## 3. Arquitetura

### 3.1 Topologia

```
porto-hub-afiliados/                                  monorepo, npm workspaces + Turborepo
├── apps/
│   ├── api/                            Nest 11 + TypeORM + Postgres
│   │   └── src/
│   │       ├── domain/                 entidades, repositórios, enums, DTOs
│   │       ├── infra/                  database, services (email, s3), shared
│   │       └── modules/
│   │           ├── mobile/             consumido pelo app Flutter
│   │           ├── admin/              consumido pelo painel
│   │           ├── webhooks/           sem JWT, assinatura própria
│   │           ├── shared/             casos de uso compartilhados
│   │           └── health/
│   └── painel/                         Next 15 + Refine + Ant Design
├── packages/
│   ├── contracts/                      tipos e schemas zod dos DTOs admin
│   ├── eslint-config/
│   └── tsconfig/
└── docs/
    ├── specs/                          referência técnica (este documento e os demais)
    └── tasks/                          cards para o Jira, agrupados por contexto
```

O app Flutter fica **fora** do monorepo, em repositório próprio. Dart não consome `packages/contracts`, o ferramental não é compartilhado com npm, e a cadência de release depende de review de loja. A ponte é o `openapi.json` publicado pela API (seção 7).

### 3.2 Base de código

Esqueleto extraído de `mesainc/sis-porto-vendeu-ganhou-api` e `mesainc/sis-porto-vendeu-ganhou-painel`: infraestrutura, autenticação, guards, filtros de exceção, serviço de variáveis de ambiente, configuração TypeORM, Swagger, padrão de testes com factories e fixtures, layout e providers do painel. O domínio de baterias, veículos, sucata e vendas é descartado — o domínio do Hub nasce do zero.

Decisões de ferramental:

- **npm workspaces** porque os dois repos base usam `package-lock.json`.
- **Turborepo** para lint, test e build com cache e paralelismo entre os dois apps.
- **`packages/contracts`** com os tipos e schemas zod dos DTOs que o painel consome. Quando o DTO de afiliado muda na API, o painel quebra em build, não em produção.

### 3.3 Três canais, uma API

Uma aplicação Nest só, com três módulos de entrada separados por audiência de JWT:

| Módulo | Consumidor | Autenticação |
|---|---|---|
| `mobile` | App Flutter do afiliado | JWT com audiência `affiliate` |
| `admin` | Painel da Porto e da Mesa | JWT com audiência `admin` |
| `webhooks` | Sistemas externos | Assinatura própria, sem JWT |

Nesta onda o módulo `webhooks` nasce só com o esqueleto e o health check — os webhooks reais (INT-03 e Transfeera) chegam nas ondas seguintes.

---

## 4. Modelo de dados

Identidade unificada com perfil por tipo, seguindo o padrão já estabelecido em `sis-porto-vendeu-ganhou-api` (`User` 1:1 com `Rescuer` ou `WarehouseUser`).

### 4.1 `users`

Identidade e credencial, comum ao afiliado e ao operador do painel.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | serial PK | interno, nunca exposto |
| `public_id` | uuid único | usado em todas as rotas |
| `name` | varchar | nome completo |
| `email` | citext único | chave de login |
| `password` | varchar nulo | nulo até o afiliado definir a senha |
| `password_set_at` | timestamptz nulo | |
| `should_change_password` | boolean | força troca no próximo login |
| `is_active` | boolean | desativação da conta, independe do status de aprovação |
| `type` | enum `AFFILIATE \| ADMIN` | determina qual perfil existe |
| `role` | enum nulo | perfis do painel: `PORTO_ANALYST`, `PORTO_ADMIN`, `MESA_ADMIN` |
| `last_login_at` | timestamptz nulo | |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

### 4.2 `affiliates`

Perfil 1:1 do usuário do app. Todas as colunas de domínio nascem `NOT NULL` aqui, e não como colunas nulas em `users`.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | serial PK | |
| `public_id` | uuid único | |
| `user_id` | int único FK → `users` | 1:1 |
| `cpf` | varchar único | validado, armazenado só com dígitos |
| `pix_key_type` | enum `EMAIL \| PHONE \| CPF` | conforme layout da SIS-509 |
| `pix_key` | varchar | |
| `status` | enum | `PENDING_APPROVAL \| APPROVED \| REJECTED \| SUSPENDED` |
| `approved_at` | timestamptz nulo | |
| `approved_by_user_id` | int nulo FK → `users` | operador que decidiu |
| `rejection_reason` | text nulo | obrigatório quando `REJECTED` |
| `terms_version_id` | int FK → `terms_versions` | |
| `terms_accepted_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

Um aceite por afiliado. Quando re-aceite de nova versão virar requisito, isto vira uma tabela `terms_acceptances` de histórico — não antes.

### 4.3 `terms_versions`

RF-03 exige aceite registrado com versão, data e hora.

| Coluna | Tipo |
|---|---|
| `id` | serial PK |
| `version` | varchar único |
| `content_url` | varchar |
| `published_at` | timestamptz |
| `is_current` | boolean |

### 4.4 `password_reset_tokens`

Um mecanismo para dois propósitos: definir senha após aprovação e recuperar senha esquecida.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | serial PK | |
| `user_id` | int FK → `users` | |
| `token_hash` | varchar | o token em claro só existe no e-mail |
| `purpose` | enum `SET_PASSWORD \| RESET_PASSWORD` | |
| `expires_at` | timestamptz | 48h para `SET_PASSWORD`, 2h para `RESET_PASSWORD` |
| `used_at` | timestamptz nulo | uso único |
| `created_at` | timestamptz | |

### 4.5 `refresh_tokens`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | serial PK | |
| `user_id` | int FK → `users` | |
| `token_hash` | varchar | |
| `expires_at` | timestamptz | 30 dias |
| `revoked_at` | timestamptz nulo | |
| `replaced_by_id` | int nulo FK → `refresh_tokens` | rotação |
| `created_at` | timestamptz | |

### 4.6 `affiliate_status_history`

Trilha auditável do RF-07: quem, quando, o quê.

| Coluna | Tipo |
|---|---|
| `id` | serial PK |
| `affiliate_id` | int FK → `affiliates` |
| `from_status` | enum nulo |
| `to_status` | enum |
| `reason` | text nulo |
| `actor_user_id` | int nulo FK → `users` |
| `created_at` | timestamptz |

O registro é escrito na mesma transação da mudança de status. Nunca é editado nem apagado.

---

## 5. Máquina de estados e regras de acesso

### 5.1 Estados do afiliado

```
                        ┌──── aprovar ────► APPROVED ──── suspender ────► SUSPENDED
PENDING_APPROVAL ───────┤                      │                              │
      (nasce aqui)      │                      │ password_set_at = null        │
                        └──── reprovar ───► REJECTED   → ainda sem senha    reativar
                                                                               │
                                                                               ▼
                                                                           APPROVED
```

- Todo cadastro nasce `PENDING_APPROVAL`. Não há pré-triagem automática (RF-05).
- A aprovação gera token `SET_PASSWORD`, dispara o e-mail de boas-vindas com o link e emite o evento de domínio `AffiliateApproved`.
- A reprovação exige motivo e dispara o e-mail de devolutiva (RF-08).
- Suspensão e reativação existem no enum e no histórico, mas não têm rota nesta onda.
- Toda transição grava `affiliate_status_history` na mesma transação.

O evento `AffiliateApproved` é o ponto de extensão onde a criação do cupom (INT-01) pluga na onda seguinte, sem alterar o caso de uso de aprovação.

### 5.2 Resultado do login do afiliado

O app precisa distinguir os casos para exibir a mensagem certa. A resposta de erro carrega um código estável:

| Situação | HTTP | Código | O que o app mostra |
|---|---|---|---|
| Credencial inválida ou e-mail inexistente | 401 | `INVALID_CREDENTIALS` | Erro genérico, sem revelar se o e-mail existe |
| Afiliado `PENDING_APPROVAL` | 403 | `REGISTRATION_UNDER_REVIEW` | "Cadastro em análise." |
| Afiliado `REJECTED` | 403 | `REGISTRATION_REJECTED` | Mensagem de devolutiva |
| Afiliado `APPROVED` sem senha definida | 403 | `PASSWORD_NOT_SET` | Orientação para usar o link do e-mail, com opção de reenvio |
| `is_active = false` ou `SUSPENDED` | 403 | `ACCOUNT_INACTIVE` | Conta indisponível |
| Sucesso | 200 | — | Entra no app |

A checagem de senha só ocorre quando o afiliado tem senha definida. Nos demais casos o estado do cadastro decide a resposta — o que atende à SIS-511 sem exigir que um cadastro pendente tenha credencial.

**Trade-off assumido:** responder `REGISTRATION_UNDER_REVIEW` antes de validar senha permite descobrir, por tentativa, que um e-mail tem cadastro pendente. É consequência direta do requisito da SIS-511 — o afiliado precisa ver "Cadastro em análise." sem ter senha. O risco é baixo (revela existência de cadastro, não credencial) e fica contido pelo rate limit da seção 10. Se o Jurídico ou a SI da Porto vetarem, a alternativa é exigir senha no cadastro, o que muda o layout aprovado.

### 5.3 Guards

Identidade unificada tem um custo real: esquecer de checar o tipo numa rota é escalação de privilégio. Mitigação, obrigatória em revisão de código:

- `AffiliateGuard` — exige JWT com audiência `affiliate`, `users.type = AFFILIATE`, perfil `affiliates` existente, `status = APPROVED` e `is_active = true`.
- `AdminGuard` — exige JWT com audiência `admin`, `users.type = ADMIN` e `is_active = true`. Aceita lista de `role` por rota.
- **Nenhuma rota sem guard por omissão.** Guard global de negação, com decorator `@Public()` explícito nas exceções (cadastro, login, termos vigentes, recuperação de senha, health).
- As listagens de `/admin/affiliates` consultam a partir de `affiliates`, o que torna estruturalmente impossível uma linha de operador aparecer na fila de aprovação.

---

## 6. Contratos de API

Todas as rotas versionadas sob `/v1`. Identificadores expostos são sempre `public_id`.

### 6.1 `/mobile` — app do afiliado

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/mobile/terms/current` | pública | Versão vigente dos termos para exibir no aceite |
| POST | `/mobile/affiliates` | pública | Pré-cadastro (SIS-509) |
| POST | `/mobile/auth/login` | pública | Login com os códigos de estado da seção 5.2 |
| POST | `/mobile/auth/password/set` | pública | Define senha a partir do token do e-mail de aprovação |
| POST | `/mobile/auth/password/forgot` | pública | Solicita link de recuperação |
| POST | `/mobile/auth/password/reset` | pública | Redefine senha a partir do token |
| POST | `/mobile/auth/refresh` | pública | Rotaciona o refresh token |
| POST | `/mobile/auth/logout` | afiliado | Revoga o refresh token |
| GET | `/mobile/me` | afiliado | Dados do afiliado e status do cadastro (RF-04) |

**`POST /mobile/affiliates`** — corpo: `fullName`, `email`, `cpf`, `pixKeyType`, `pixKey`, `termsVersionId`, `termsAccepted`. Validações:

- `email` único em `users`; `cpf` único em `affiliates` e válido pelo dígito verificador.
- `pixKeyType` ∈ `EMAIL | PHONE | CPF`, e `pixKey` coerente com o tipo. Quando `CPF`, a chave precisa ser igual ao CPF informado — o layout diz "A chave precisa estar no seu nome".
- `termsAccepted` obrigatoriamente verdadeiro; `termsVersionId` precisa ser a versão vigente.
- Resposta `201` com `publicId` e `status: PENDING_APPROVAL`. Nenhuma credencial é criada.

### 6.2 `/admin` — painel

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/admin/auth/login` | pública | Login do operador (SIS-518) |
| POST | `/admin/auth/password/forgot` | pública | |
| POST | `/admin/auth/password/reset` | pública | |
| POST | `/admin/auth/refresh` | pública | |
| POST | `/admin/auth/logout` | admin | |
| GET | `/admin/me` | admin | Perfil e permissões do operador |
| GET | `/admin/affiliates` | admin | Lista com busca por nome, filtro por status, paginação e ordenação (SIS-519) |
| GET | `/admin/affiliates/:publicId` | admin | Detalhe do cadastro e do aceite de termos |
| POST | `/admin/affiliates/:publicId/approve` | admin | Aprova, gera token de senha, envia e-mail, grava histórico |
| POST | `/admin/affiliates/:publicId/reject` | admin | Reprova com `reason` obrigatório e envia devolutiva |
| GET | `/admin/affiliates/:publicId/history` | admin | Trilha auditável |

A lista devolve nome, e-mail, CPF mascarado, status e data de criação — exatamente os campos pedidos na SIS-519.

### 6.3 Usuários do painel

Nesta onda os operadores entram por script de seed, com senha inicial e `should_change_password = true`. O CRUD de usuários do painel é backlog.

---

## 7. Contrato para o app Flutter

O `@nestjs/swagger` já está no repo base. A API gera `openapi.json` no build e a CI publica como artefato versionado a cada release. Quem constrói o app gera o cliente Dart a partir desse arquivo.

Isso é o que permite entregar as rotas do app sem que o app exista: o contrato é o entregável, verificável e versionado. Toda rota `/mobile` precisa ter DTO de entrada e de saída anotados, exemplos e os códigos de erro da seção 5.2 documentados.

---

## 8. E-mails transacionais

Via MailerSend, já integrado no repo base. Quatro templates:

| Gatilho | Conteúdo |
|---|---|
| Cadastro recebido | Confirmação do pré-cadastro e aviso de que a análise foi iniciada |
| Cadastro aprovado | Boas-vindas e link de definição de senha, válido por 48h |
| Cadastro reprovado | Devolutiva com o motivo registrado pelo operador |
| Recuperação de senha | Link de redefinição, válido por 2h |

O envio nunca bloqueia a transação de negócio: falha de e-mail é registrada e re-tentável, e não desfaz uma aprovação.

---

## 9. Painel

Next 15 + Refine + Ant Design, sobre a API `/admin`.

| Tela | Issue | Conteúdo |
|---|---|---|
| Login | SIS-518 | E-mail e senha, com "esqueci a senha" |
| Definir nova senha | SIS-518 | A partir do token do e-mail |
| Afiliados — lista | SIS-519 | Nome, e-mail, CPF mascarado, status, data de criação; busca por nome; filtro por status; paginação |
| Afiliados — detalhe | SIS-519 | Dados completos, aceite de termos com versão e data, ações de aprovar e reprovar |
| Afiliados — trilha | SIS-519 | Histórico de transições com autor, data e motivo |

A reprovação abre modal com motivo obrigatório. A aprovação pede confirmação, porque dispara e-mail ao afiliado e, nas ondas seguintes, criará o cupom.

Auth provider do Refine consumindo o JWT do `/admin/auth/login`, com middleware do Next protegendo as rotas autenticadas.

---

## 10. Segurança e privacidade

- Senha com bcrypt. Token de definição e de recuperação armazenado apenas como hash, com expiração e uso único.
- `POST /mobile/auth/password/forgot` responde `204` sempre, exista ou não o e-mail — sem enumeração de conta.
- Rate limit por IP e por e-mail nas rotas de login, cadastro e recuperação de senha, via `@nestjs/throttler`.
- CPF e chave PIX são dado pessoal do afiliado: mascarados em listagem e ausentes de qualquer log. O documento técnico exige registros de integração sem dado sensível.
- Credenciais em variável de ambiente e cofre, nunca em repositório.
- Helmet, CORS restrito por ambiente, e `public_id` em todas as rotas para não expor identificador sequencial.
- Nenhum dado de cliente final trafega nesta onda — não há integração de vendas ainda.

---

## 11. Testes

Jest com o padrão de factories e fixtures de `src/testing/` do repo base. Cobertura obrigatória por caso de uso, e cinco cenários e2e:

1. Cadastro → aprovação → e-mail → definição de senha → login com sucesso.
2. Cadastro → reprovação → login devolve `REGISTRATION_REJECTED`.
3. Cadastro → login antes da decisão devolve `REGISTRATION_UNDER_REVIEW`.
4. Esqueci a senha → reset → login com a senha nova; token não reutilizável.
5. Guard cruzado: token de afiliado não acessa `/admin`, token de admin não acessa `/mobile`.

Mais os casos de validação: e-mail duplicado, CPF duplicado, CPF inválido, chave PIX incoerente com o tipo, aceite de termos ausente, versão de termos desatualizada.

---

## 12. Backlog desenhado

O que ficou fora desta onda, com o ponto de extensão já previsto:

| Bloco | Issues / RF | Onde pluga |
|---|---|---|
| Cupom exclusivo (INT-01) | RF-11 a RF-16 | Porta `CouponProvider` com adaptador `fake` e `porto`, acionada pelo evento `AffiliateApproved` |
| Link de divulgação (INT-02) | RF-14 | Depende de P2: formato da URL e cupom pré-aplicado |
| Eventos de venda e execução (INT-03) | RF-17 a RF-22 | `POST /webhooks/porto/sale-events` com idempotência por `external_event_id` e mapper anticorrupção |
| Extrato e ledger | SIS-510, SIS-516 | Tabelas `sale_events` e `ledger_entries`, alimentadas pelo INT-03 |
| Comissionamento | RF-23, RF-24, RF-34 | Tabela `commission_policies`, parametrizável por segmento |
| Saque e pagamento | SIS-516, SIS-520, RF-25 a RF-28 | Transfeera, já integrada no repo base: lote PIX, webhook de confirmação, comprovante |
| Edição de perfil | SIS-517 | `PATCH /mobile/me` |
| Upload de documentos | RF-02 | S3, já integrado no repo base |
| Notificações push | RF-30 | Firebase, já integrado no repo base |
| CRUD de usuários do painel | RF-09 | Substitui o seed desta onda |
| Materiais de divulgação | RF-16 | |

## 13. Pendências herdadas da Porto

Nenhuma bloqueia esta onda. Todas bloqueiam as seguintes, e estão registradas aqui para não se perderem:

| # | Pendência | Bloqueia |
|---|---|---|
| P1 | Caminho de exposição da API de cupons: Sensedia ou MuleSoft Flex Gateway | INT-01 |
| P2 | Formato da URL de divulgação e se o cupom pode vir pré-aplicado | INT-02 |
| P3 | Viabilidade e formato do webhook de vendas | INT-03 |
| P4 | Relação final de campos trafegados e mapeamento de códigos | INT-01, INT-03 |
| P5 | Regra de nomenclatura e unicidade dos cupons | INT-01 |
| P6 | Ambiente de hospedagem: Mesa ou Porto | Infraestrutura |
| P7 | Canal de acesso do backoffice de análise | Painel |
| P8 | Como distinguir cupons de afiliados dos demais | INT-01 |

Da lista de dependências do documento funcional, **D12 — versão vigente dos Termos e Condições, com o Jurídico da Porto** é a única que toca esta onda: sem o texto, o cadastro sobe com uma versão de homologação e a produção espera o texto oficial.
