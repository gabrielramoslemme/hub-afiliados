# Infraestrutura — ambiente de desenvolvimento

Stack única em `porto-hub-dev-stack.yaml`. Sobe uma EC2 com Docker Compose
(Caddy + web + API), um RDS Postgres em subnets privadas, dois repositórios no
ECR, uma distribuição CloudFront na frente e o deploy por documento SSM.

## O caminho de uma requisição

```
navegador
   │  https://dev.<domínio>          https://api-dev.<domínio>
   ▼
Imperva Cloud WAF          TLS para o navegador, certificado da Porto
   │                       (obrigatório: "tudo tem que passar por lá")
   ▼
CloudFront                 mesmo certificado, importado no ACM us-east-1
   │                       nome ESTÁVEL — é o origin que a Imperva registra
   │                       cache só em /_next/static/*, resto passa direto
   ▼  :80, em claro
EC2 (subnet pública, Elastic IP)   security group: uma porta, só CloudFront
   │  caddy   :80    auto_https off — não há certificado nesta máquina
   │    ├─ Host dev.<domínio>      → /v1/* em api:3000, o resto em web:3005
   │    └─ Host api-dev.<domínio>  → api:3000, só /v1/*
   │  web     :3005  rede `internal`: sem rota para RDS, internet ou IMDS
   │  api     :3000  publicada só em 127.0.0.1
   └────────────────────► RDS Postgres 16 (subnets privadas, 2 AZs)
```

**Não há ALB, NAT Gateway, ASG, Multi-AZ nem alarmes.** Cada um foi recusado por
um motivo, não por esquecimento:

| Ausente | Por quê |
|---|---|
| ALB (~US$ 18/mês) | O CloudFront já é o ponto de entrada, e o roteamento por host é do Caddy. O ALB não faria nada que já não esteja feito. |
| NAT Gateway (~US$ 33/mês) | A instância fica em subnet pública com Elastic IP e alcança ECR, SSM, Secrets Manager e Resend pelo internet gateway. O que a protege é o security group. |
| Multi-AZ, ASG | É ambiente de desenvolvimento. Cair e voltar é aceitável; pagar o dobro por isso não. |
| Alarmes e SNS | Higiene de produção. Em dev quem percebe que quebrou é quem está usando. O log group fica, com 14 dias de retenção. |

## Por que CloudFront, já que não é por cache

Duas razões, e a segunda é a que decidiu:

1. **Termina o TLS** com o certificado que a segurança da informação da Porto
   emite, importado no ACM em `us-east-1`.
2. **Dá um nome estável para a Imperva apontar.** Sem ele, o *origin* registrado
   lá seria o Elastic IP — e recriar a stack viraria um pedido de mudança no
   time do Diego, no tempo deles. Com o CloudFront, o `dxxxx.cloudfront.net`
   nunca muda, mesmo que a instância seja destruída e refeita.

O que ele **não** faz é servir o app como site estático: o `middleware.ts` de
`/admin` e as sete Server Actions exigem runtime Node. O origin é a EC2.

## A instância tem uma porta aberta, e só o CloudFront a alcança

O security group aceita **apenas a 80**, e apenas das faixas da prefix list
gerenciada `com.amazonaws.global.cloudfront.origin-facing`. Não há 443 porque
não há certificado na máquina, e não há ACME porque não há o que emitir. Quem
souber o Elastic IP não consegue nada com ele.

> **A perna CloudFront → origin vai em claro.** É o preço de não ter certificado
> na instância. O que a limita é o security group. **Aceitável em dev, não em
> produção**: lá, um nome de origin próprio com certificado válido e
> `OriginProtocolPolicy: https-only` fecham isso. Está marcado no template, no
> ponto exato.

## A API é pública, e mesmo assim não é o navegador da web que fala com ela

A API inteira sai em `/v1/*` pela mesma URL do CloudFront — o Caddy manda esse
caminho para `api:3000` e o resto para a web. É de propósito: consumidor externo
integra com a API sem conta na AWS. Nenhuma rota da web começa com `/v1`, então
o prefixo separa os dois sem esconder tela nenhuma. O Swagger vem junto, em
`/v1/docs`.

**O que protege `/v1/admin` e `/v1/affiliate` são os guards**, com audiência de
JWT — não mais a rede interna do compose, que antes era a segunda camada. Rota
nova com `@Public()` sai na internet no deploy seguinte; o
`route-protection.e2e-spec.ts` é quem impede que uma saia sem guard por omissão.
A API não tem rate limit: login e esqueci-a-senha ficam abertos a tentativa em
volume.

O CORS continua restrito a `PANEL_BASE_URL`. Integração servidor-a-servidor,
Postman e curl não passam por CORS; uma aplicação de navegador em outra origem
seria recusada até a origem dela entrar na lista.

`CLAUDE.md`, regra inviolável: *"o navegador nunca fala com a API; quem chama é o
servidor do Next"*. Ela continua valendo **para a web** — a sessão é cookie
`httpOnly` gravado pelo servidor do Next, que segue chamando por
`http://api:3000/v1` na rede interna. Nenhum `NEXT_PUBLIC_*` existe em
`apps/web`, e é assim que se confere.

O `ApiDomainName` é opcional: ele dá à mesma API um host próprio, sem a web
atrás, e devolve 404 fora de `/v1/*`. O webhook de incentivos da Porto (INT-03),
`POST /v1/webhooks/porto/incentives`, já responde no host da web sem ele; o host
próprio é para quando a Porto precisar de um nome estável e separado. Contrato e
autenticação em
[`apps/api/docs/INT-03-incentivos.md`](../../apps/api/docs/INT-03-incentivos.md).

O psql segue por túnel do SSM, com o comando pronto no output `RdsTunnelCommand`.
Quando `DbAccessCidr` está preenchido há uma saída alternativa — ver *Acesso
direto ao banco, sem túnel*.

## Por que a web fica numa rede `internal`

Ela tem a maior superfície de ataque (runtime do Next inteiro) e a menor
necessidade de privilégio: precisa de uma URL, não de `JWT_SECRET` nem de
`DATABASE_URL`. Na rede `internal` do compose ela perde a rota default — sem
caminho para o RDS, para a internet e para o IMDS. Quem a alcança é o Caddy;
quem ela alcança é a API.

Isso substitui a regra `DOCKER-USER` no iptables que a proposta original previa.
É a mesma fronteira, declarada no compose em vez de configurada no host: não há
o que dessincronizar depois, e o teste é uma linha (abaixo).

## Por que a conexão com o RDS exige TLS

O RDS roda PostgreSQL 16 sem parameter group próprio, e o padrão da AWS a partir
do 15 traz `rds.force_ssl = 1`: **conexão sem TLS é recusada antes da senha**.
Por isso o `install-release.sh` escreve `DATABASE_SSL=true` no `api.env`.

A autoridade que assina o certificado do RDS não está no trust store do Node.
Verificar de verdade exige o bundle da Amazon, versionado em
`infra/certs/rds-global-bundle.pem` e copiado pelo `Dockerfile` da API para
`/app/certs/`. Trocar o bundle é `curl` no
`https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem`, commit e
deploy — o arquivo é público e não tem segredo.

Desligar a verificação (`rejectUnauthorized: false`) seria a saída fácil e é
justamente o que não se faz aqui: a tabela guarda CPF e chave PIX.

## Subir pela primeira vez

**1. Criar a stack.** O certificado da Porto **não** é pré-requisito: sem ele o
ambiente sobe no domínio do próprio CloudFront, com o certificado padrão da AWS.

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/porto-hub-dev-stack.yaml \
  --stack-name porto-hub-dev \
  --region us-east-1 \
  --capabilities CAPABILITY_NAMED_IAM \
  --disable-rollback
```

O `WebUrl` do output sai em `https://<id>.cloudfront.net`, e é a URL de verdade
do ambiente: landing, cadastro, área do afiliado e painel, todos funcionando.
**Não semeie dado real nessa janela** — a URL não tem Imperva na frente nem
restrição de origem, e quem souber dela entra.

### Os três modos de domínio

| `DomainName` | `ApiDomainName` | `CertificateArn` | Quando |
|---|---|---|---|
| vazio | vazio | vazio | Validar o ambiente antes de a Porto emitir o certificado |
| `dev.…` | vazio | cobre `dev.` | Ambiente de verdade. **É o modo esperado hoje** |
| `dev.…` | `api-dev.…` | cobre os dois | Quando a API precisar de host próprio |

O segundo modo basta porque a API já sai em `/v1/*` no host da web — inclusive
o webhook de incentivos da Porto. O host próprio só separa o nome dela do da
web; a API que responde nele é a mesma.

Preencher `DomainName` sem `CertificateArn` — ou `ApiDomainName` sem
`DomainName` — falha **na hora do create**, com o nome do parâmetro que falta:
são as duas regras da seção `Rules` do template. Sem elas, a combinação errada
morreria dois minutos depois num erro do CloudFront que não aponta para cá.

**Passar de um modo para o outro é update de stack + um deploy.** `Aliases` e
`ViewerCertificate` mudam a distribuição **no lugar**, sem substituir nada
(~10 min); o `Caddyfile` só pega os nomes novos no deploy seguinte, porque é ele
que lê o Parameter Store. Mesmo padrão da seção *Mudar configuração*.

O `CertificateArn`, quando entrar, tem que estar em **`us-east-1`** — CloudFront
não aceita de outra região — e na **mesma conta** desta stack, o que significa
que a Porto precisa te entregar o PEM e a chave privada para importar no ACM;
combine o transporte antes de pedir. Um curinga `*.<domínio>` cobre o host da
API no dia em que ele nascer e poupa um segundo chamado; vale pedir assim desde
o começo.

`--disable-rollback` **só na primeira criação**. O log do `cloud-init` não vai
para o CloudWatch, e no rollback a instância é terminada junto — um UserData que
falhou vira um erro sem causa. Com a instância de pé, `aws ssm start-session` e
`cat /var/log/cloud-init-output.log` dizem o que houve. Depois de a stack subir
uma vez, tire a flag.

Não há parâmetro de CIDR de entrada: a instância aceita **só a 80, e só das
faixas do CloudFront**, pela prefix list gerenciada da AWS. O
`CloudFrontPrefixListId` tem o id de `us-east-1` como padrão; se um dia a AWS
mudá-lo, o comando para conferir está na descrição do parâmetro.

Se a conta já tiver o provider OIDC do GitHub, acrescente
`CreateGitHubOidcProvider=false` — o segundo faz a stack falhar com
`EntityAlreadyExists`, e o rollback derruba tudo.

**2. Entregar o `CloudFrontDomainName` para a Porto.** Só quando for plugar o
domínio — no primeiro modo não há o que pedir a ninguém. É esse output, e só ele,
que sai da nossa mão: é o alvo dos dois CNAMEs e o origin da RDM da Imperva. O
Elastic IP **não** vai para eles — virou detalhe interno, e é isso que o
CloudFront comprou. **A stack não cria registro de DNS**: a zona fica no
servidor on premise deles, e é gente de lá que aponta o nome. A tabela de *O que
depende da Porto* diz o que pedir, a quem, e em que ordem.

Confirme que os dois nomes resolvem **pela internet** antes de esperar HTTPS:

```bash
dig +short dev.hubafiliados.com.br @1.1.1.1      # CNAME -> <id>.cloudfront.net
dig +short api-dev.hubafiliados.com.br @1.1.1.1  # idem
```

Com a Imperva na frente o CNAME é dela, e o CloudFront aparece só como origin
na RDM — nesse caso o que se confirma é que a resposta **não** é o Elastic IP.

**3. Escrever as credenciais da Porto e injetar a chave do Resend.** As
credenciais **antes do primeiro deploy**: a API sempre fala com o gateway
Sensedia, e o deploy falha sem `PORTO_CLIENT_ID` e `PORTO_CLIENT_SECRET` no
parâmetro `/porto-hub/dev/config`. O passo a passo está em *Credenciais da
Porto*, mais abaixo.

A chave do Resend nasce `REPLACE_ME`, e só precisa de valor para usar
`MailProvider=resend`:

```bash
echo -n 're_sua_chave' > resend_key.txt
# O comando exato sai no output SetResendKeyCommand; ele lê de arquivo, nunca de
# argv, porque segredo em argv fica visível em `ps` e no histórico do shell.
```

Enquanto o domínio não estiver verificado no Resend, suba com
`MailProvider=logger`: o link de definir senha sai no CloudWatch em vez da caixa
de entrada.

**4. Ligar o deploy.** Duas coisas no GitHub, e a segunda não é opcional:

- o output `GitHubOidcRoleArn` no secret `AWS_DEPLOY_ROLE_ARN`;
- o ambiente **`development`** em *Settings → Environments*, com
  *Deployment branches* em **Selected branches: `development`**.

O ambiente não é enfeite. O job de deploy declara `environment: development`, e
o GitHub monta o `sub` do token OIDC como `repo:OWNER/REPO:environment:development`
— sem a referência da branch. A trust policy aceita esse valor; quem garante que
só a `development` chega até ele é a regra de proteção do ambiente. Sem ela,
qualquer branch pode pedir o deploy deste ambiente.

**5. Publicar.** Um push na `development` roda a CI; os jobs de verificação, o
de infra e o que publica as imagens rodam em paralelo, e o deploy só existe como
`needs:` de todos eles.

Antes desse primeiro deploy a instância está de pé mas vazia — não há imagem no
ECR, e o `https://` ainda não responde. É esperado.

## Pelo console da AWS

O caminho de CLI acima é o que a CI repete e o que se versiona. O console serve
a criação única — quando quem sobe a stack não tem credencial de linha de
comando na mão. São os mesmos cinco passos; o que muda é a navegação, e três
coisas que não têm flag equivalente.

### Antes de abrir o formulário

| Console | Conferir | Se der ruim |
|---|---|---|
| Seletor de região | **N. Virginia (us-east-1)** | O ACM do CloudFront exige, e o origin é montado como `ec2-<ip>.compute-1.amazonaws.com`, que é o sufixo dessa região. Fora dela nada funciona |
| **IAM → Identity providers** | Existe `token.actions.githubusercontent.com`? Se sim, abra e confirme que *Audiences* contém `sts.amazonaws.com` | Existindo, use `CreateGitHubOidcProvider=false`: criar o segundo falha com `EntityAlreadyExists` e o rollback leva a stack inteira. Audience diferente faz o assume-role ser recusado sem dizer por quê |
| Prefix list do CloudFront | O id de `com.amazonaws.global.cloudfront.origin-facing` **nesta** região | Prefix list gerenciada tem id diferente por região, e o console da VPC esconde as da AWS. O comando está na descrição do parâmetro `CloudFrontPrefixListId`. Errando, o security group não cria e a stack para em segundos com `InvalidPrefixListID.NotFound` — antes do RDS e do CloudFront |

### Criar a stack

1. **CloudFormation → Stacks → Create stack → With new resources (standard)**.
2. *Prepare template* → **Choose an existing template** → **Upload a template
   file** → `infra/cloudformation/porto-hub-dev-stack.yaml`. O console o guarda
   sozinho num bucket `cf-templates-*`.
3. *Stack name*: `porto-hub-dev`.
4. Parâmetros: **deixe `DomainName`, `ApiDomainName` e `CertificateArn`
   vazios** — é o primeiro dos três modos. `GitHubRepo`, `DeployBranch`,
   `GitHubEnvironment`, `MailProvider` e `MailFromEmail` já vêm com o valor
   certo para este ambiente. `CreateGitHubOidcProvider=false` se a conferência
   acima achou o provider.
5. *Configure stack options*:
   - **Stack failure options → Preserve successfully provisioned resources.** É
     o `--disable-rollback`, e o motivo está acima: sem isso um UserData que
     falhou vira erro sem causa. **Volte para *Roll back all stack resources*
     nos updates seguintes.**
   - Marque **"I acknowledge that AWS CloudFormation might create IAM resources
     with custom names"** — é o `CAPABILITY_NAMED_IAM`.
6. **Submit**, e acompanhe a aba *Events*. Conte **20 a 30 minutos**: o RDS come
   ~10, o CloudFront ~10 a 15, e a instância sinaliza em até `PT15M`.

Se falhar, a razão está na primeira linha `CREATE_FAILED` de baixo para cima em
*Events*. Instância estourando o sinal → **Systems Manager → Session Manager →
Start session** e `cat /var/log/cloud-init-output.log`. Para tentar de novo é
preciso **deletar a stack primeiro**: com *Preserve* ela fica em `CREATE_FAILED`
segurando os recursos, e nomes fixos — os repositórios do ECR, o bucket de
deploy, a role de deploy — impedem a recriação enquanto o delete não terminar.

### Depois do CREATE_COMPLETE

Aba **Outputs**. Quatro importam agora:

| Output | Para onde vai |
|---|---|
| `WebUrl` | A URL do ambiente, em `https://<id>.cloudfront.net` |
| `GitHubOidcRoleArn` | Secret `AWS_DEPLOY_ROLE_ARN` no GitHub |
| `ReadSeedPasswordCommand` | A senha inicial do operador do painel. Sem CLI: **Secrets Manager** → o segredo descrito *"Senha inicial dos operadores…"* → *Retrieve secret value* |
| `CloudFrontDomainName` | Só quando for plugar o domínio — é o que vai para a Porto |

O GitHub é o passo 4 da seção anterior, e não tem equivalente no console: o
secret e o environment `development` com *Selected branches*. Depois disso, um
push na `development` publica a primeira release.

**Redeploy sem passar pela CI**, se precisar: as imagens têm que estar no ECR
(quem as constrói é o job `images`), e então **S3** → bucket
`porto-hub-dev-deploy-<conta>` → upload de `infra/compose/docker-compose.prod.yml`
e `infra/scripts/install-release.sh` → **Systems Manager → Run Command** →
documento `porto-hub-dev-deploy` → a instância → `imageTag` = o SHA. É
exatamente o que o `cd.yml` faz.

### Chave do Resend, sem CLI

Só se for passar `MailProvider=resend`; com `logger` o link de definir senha sai
no CloudWatch e nada disto é necessário. **Secrets Manager** → o segredo
descrito *"Segredos de aplicacao do Hub de Afiliados"* → *Retrieve secret value*
→ *Edit* → preencha `resend_api_key`.

⚠️ Depois disso, **nunca mexa no `GenerateSecretString` desse segredo**:
qualquer alteração nele regenera o segredo inteiro e leva a chave junto. O
sintoma — e-mail parando de sair depois de um update de stack sem relação
nenhuma — não aponta para lá sozinho.

### Credenciais da Porto (cupons, INT-01)

A API sempre fala com o gateway Sensedia — não há emissor falso fora dos
testes. As credenciais não passam pelo template: são **duas linhas escritas à
mão** no fim do parâmetro `/porto-hub/dev/config`, **antes do primeiro deploy**.
Pelo console, em **Systems Manager → Parameter Store →
`/porto-hub/dev/config` → Edit**:

```
PORTO_CLIENT_ID=<client_id>
PORTO_CLIENT_SECRET=<client_secret>
```

O segredo do webhook de incentivos entra do mesmo jeito, numa terceira linha —
combinado com a Porto, com no mínimo 32 caracteres:

```
PORTO_WEBHOOK_SECRET=<segredo>
```

Ele é opcional: sem a linha a API sobe, e `POST /v1/webhooks/porto/incentives`
recusa toda chamada com 401. Gere com `openssl rand -hex 32`.

Sem as duas credenciais o deploy falha: linha ausente para o `install-release.sh` com
`unbound variable` antes de tocar nos containers; linha vazia chega à API, que
recusa subir, e o deploy volta para a release anterior. Os endereços do gateway
não entram no parâmetro: valem os padrões da API, que são os de homologação.

⚠️ **Update de stack pode apagar as linhas escritas à mão.** O CloudFormation só regrava o
parâmetro quando o valor dele no template muda — trocar `MailProvider`,
`MailFromEmail`, `ApiMocking`, `DomainName`, `ApiDomainName`, ou um endpoint novo
do RDS. Depois de um update desses, confira o parâmetro e escreva as linhas de
novo antes do deploy.

⚠️ **O parâmetro é `String`**: quem tem `ssm:GetParameter` nesse nome lê o
`client_secret` em claro.

Se a aprovação responder *"A Porto Serviços recusou o acesso da integração"*
(`CPN-004`), o gateway recusou a credencial do segredo — errada, revogada, sem
permissão para `/porto-assistencia/campanhasneo`, ou de outro ambiente (a de
homologação apontada para produção). Repetir não resolve: confira o segredo e o
log da API, que guarda o status e o corpo da recusa. *"A Porto Serviços não
respondeu"* (`CPN-002`) é o outro caso — timeout, rede ou 5xx —, e esse passa
com uma nova tentativa.

### Quando o certificado chegar

1. **ACM → Certificates → Import certificate** (em us-east-1). Três campos:
   *Certificate body*, *Certificate private key* e *Certificate chain*. Se a
   Porto entregar um `.pfx`:

   ```bash
   openssl pkcs12 -in porto.pfx -clcerts -nokeys        -out cert.pem
   openssl pkcs12 -in porto.pfx -nocerts -nodes         -out key.pem
   openssl pkcs12 -in porto.pfx -cacerts -nokeys -chain -out chain.pem
   ```

2. **CloudFormation → a stack → Update → Use existing template**, e preencha
   `DomainName` e `CertificateArn` (`ApiDomainName` só quando a API precisar
   de host próprio). Desmarque o *Preserve* desta vez.
3. Um deploy depois do update, para o `Caddyfile` pegar o nome. Um push na
   `development` basta.

## O que depende da Porto, e em que ordem

Nada disto está na nossa mão, e **os quatro são caminho crítico do domínio** —
não do ambiente. O ambiente sobe sem nenhum deles, no domínio do CloudFront; o
que eles destravam é publicar em `dev.<domínio>`. O certificado, nas palavras do
Diego, *"não é rápido"* — então começa por ele, em paralelo com a subida.

| # | O quê | Com quem | Trava o quê |
|---|---|---|---|
| 1 | **Certificado** do domínio, de preferência curinga | Segurança da informação (Lucas Paula / Thiago), por chamado interno | O domínio próprio. *"Sem o certificado não vai ser externalizado."* |
| 2 | **Entrada TXT** para validar o domínio do certificado | DNS (Diego / Tiago) | O passo 1 |
| 3 | **CNAME** de `DomainName` (e de `ApiDomainName`, se houver) → `CloudFrontDomainName` | DNS (Diego / Tiago) | O acesso pelo nome |
| 4 | **RDM do WAF**: registrar as URLs na Imperva, com o CloudFront como origin | Ricardo B (Diego participa) | A publicação |

O divisor de águas é a frase do Tiago: *"o trabalho de administrar o domínio é
nosso, porém o de prover as informações são de vocês."* **Não temos console de
DNS.** Toda entrada é um pedido, e cada pedido errado custa um ciclo. Por isso
pedir o curinga de uma vez, e por isso resolver internamente quantos hostnames
queremos antes de abrir o primeiro chamado.

O que sai da nossa mão é **um valor só**: o output `CloudFrontDomainName`. É o
origin que a Imperva registra e o alvo dos dois CNAMEs. O Elastic IP não vai
para eles — virou detalhe interno, e é justamente isso que o CloudFront comprou:
recriar a stack não obriga ninguém da Porto a mexer em nada.

## Branches e ambientes

| Branch | Ambiente | Stack | Environment do GitHub |
|---|---|---|---|
| `development` | desenvolvimento | `porto-hub-dev` | `development` |
| `main` | produção | — ainda não existe | — |

O fluxo é `feature/*` → PR para `development` → CI verde → merge → deploy em
dev; e `development` → PR para `main` quando a release estiver pronta.

Push na `main` hoje roda a verificação inteira e **não** faz deploy: não há
stack de produção. O job está escrito e comentado no fim do `ci.yml`, junto com
o que falta antes de descomentá-lo.

O parâmetro `DeployBranch` da stack é o que amarra uma coisa na outra: a role
OIDC desta stack só aceita token vindo da branch nomeada ali. Uma stack de
produção usaria o mesmo template com `DeployBranch=main` e
`GitHubEnvironment=production` — e é por isso que os dois são parâmetro, e não
literal no YAML.

## Mudar configuração

`DomainName`, `ApiDomainName`, `MailProvider`, `MailFromEmail` e `ApiMocking`
são parâmetros da stack, mas **não vivem no UserData** — vivem no parâmetro
`/porto-hub/dev/config` do Parameter Store, que o `install-release.sh` lê a cada
deploy. Trocar um valor é:

```bash
aws cloudformation deploy ... --parameter-overrides MailProvider=resend ...   # 1
aws ssm send-command --document-name porto-hub-dev-deploy \
  --instance-ids <id> --parameters imageTag=<sha-no-ar>                        # 2
```

O passo 2 é o que aplica: o update de stack reescreve o parâmetro, o deploy
reescreve os arquivos de env e reinicia os containers.

⚠️ Reescrever o parâmetro apaga as credenciais da Porto, que foram escritas à mão
nele. Entre o passo 1 e o 2, escreva as duas linhas de novo — ver *Credenciais
da Porto*.

Foi para isso que a configuração saiu do UserData. Lá, mudar um valor ou
**substituiria a instância**, ou não teria efeito nenhum — o `cloud-init` roda
só no primeiro boot. O endpoint do RDS entra na mesma conta: se o banco for
substituído, o parâmetro acompanha.

Trocar `DomainName` ou `ApiDomainName` tem um passo a mais: eles também são
`Aliases` do CloudFront, então o certificado precisa cobrir o nome novo **antes**
do update, e a Porto precisa do CNAME correspondente.

## Operação

Todos os comandos saem prontos nos outputs da stack. Os dois do dia a dia têm
atalho na raiz do repositório — `db:tunnel` e `db:password` resolvem sozinhos o
id da instância, o endpoint do RDS e o ARN do segredo.

O túnel exige o `session-manager-plugin` (`brew install --cask session-manager-plugin`),
que não vem junto com o AWS CLI. Com ele instalado, qualquer cliente — psql,
TablePlus, DBeaver, DataGrip — conecta em `localhost:5433` como se o banco fosse
local, com o usuário `hub_rw`. Nesse modo o RDS não tem rota para a internet: o controle de acesso é a
permissão `ssm:StartSession`, revogável por pessoa e auditável no CloudTrail.

### Acesso direto ao banco, sem túnel

O parâmetro `DbAccessCidr` abre o Postgres na 5432 para um CIDR. Vazio — o
padrão — nada muda e o acesso continua sendo só pelo túnel. Preenchido, três
coisas passam a valer juntas: as subnets do banco ganham rota para o internet
gateway, a instância recebe IP público e o security group libera o CIDR.

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/porto-hub-dev-stack.yaml \
  --stack-name porto-hub-dev \
  --region us-east-1 \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides DbAccessCidr=200.201.202.0/24
```

Para `0.0.0.0/0` é preciso confirmar junto:

```bash
  --parameter-overrides DbAccessCidr=0.0.0.0/0 AcknowledgeDbOpenToInternet=true
```

Sem o segundo parâmetro a stack falha no gate, antes de criar change set e antes
de qualquer modify no RDS. Não é proteção contra quem decide abrir — é contra
abrir sem perceber, que é o que sobra de controle: sem VPN não há faixa fixa
para listar, então a camada de rede não está disponível como restrição. Como o
`deploy` reusa o valor anterior de parâmetro não informado, a fricção é uma vez
só.

Depois é conectar direto no `RdsEndpoint`, porta 5432, com **`hub_rw`** e a
senha de `npm run db:password`.

O usuário não é o master. O `hub_rw` tem `SELECT`, `INSERT`, `UPDATE` e `DELETE`
no schema `public` e nada de DDL: o que vazar dele não cria papel, não dropa
tabela e não vira superusuário. É o papel que o deploy provisiona a cada
release, logo depois das migrations — por isso tabela nova já nasce acessível.
O master continua existindo para migration e seed, e sai do
`ReadDbPasswordCommand` quando alguém realmente precisar dele.

**Num endpoint público, `sslmode=require` não basta.** No libpq o `require`
cifra mas não verifica certificado nem hostname — protege de quem escuta, não de
quem se põe no meio, que é o risco que a exposição pública acabou de criar. Use
`verify-full` com o bundle das CAs da Amazon, já versionado no repositório:

```bash
psql "postgresql://hub_rw@$RDS_HOST:5432/hub_afiliados?sslmode=verify-full&sslrootcert=infra/certs/rds-global-bundle.pem"
```

No DBeaver: aba SSL, `SSL mode: verify-full` e o mesmo arquivo em *Root
certificate*. Pelo túnel continua sendo `require` — ali o certificado é emitido
para o endpoint do RDS e o cliente fala com `localhost`, então `verify-full`
falharia por hostname.

O servidor recusa conexão sem TLS porque o `rds.force_ssl` vem em `1` no
parameter group padrão do PostgreSQL 16. **Isso é default da AWS, não garantia
deste template** — a stack não define `DBParameterGroupName`, então quem trocar
o `DBEngineVersion` para uma família mais antiga, ou apontar um parameter group
próprio, perde a obrigatoriedade sem nenhum aviso.

Para fechar de novo, `DbAccessCidr=''` no mesmo comando. Nenhum dos dois sentidos
substitui a instância nem perde dado: é `modify-db-instance` mais rota e regra de
security group.

Antes do primeiro deploy real, confirme isso com um change set em vez de confiar
na afirmação. O `Database` carrega `DeletionPolicy: Delete` e
`UpdateReplacePolicy: Delete` com `BackupRetentionPeriod: 1`: se a premissa não
valesse, o banco iria embora sem snapshot.

```bash
aws cloudformation create-change-set --stack-name porto-hub-dev --change-set-name open-db \
  --template-body file://infra/cloudformation/porto-hub-dev-stack.yaml \
  --parameters ParameterKey=DbAccessCidr,ParameterValue=200.201.202.0/24 \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation describe-change-set --stack-name porto-hub-dev --change-set-name open-db \
  --query 'Changes[].ResourceChange.[LogicalResourceId,Action,Replacement]' --output table
```

Execute só com `Replacement: False` na linha do `Database`.

**O que muda ao abrir.** A tabela guarda CPF e chave PIX de afiliado, e a senha
do master passa a ser o único controle de quem entra — sem revogação por pessoa
e sem o rastro que o `ssm:StartSession` deixa no CloudTrail. `0.0.0.0/0` expõe
isso para a internet inteira; a faixa de saída da VPN é uma decisão bem
diferente. Se abrir para valer, vale criar um usuário só com DML no schema da
aplicação e deixar o master fora de circulação.

| O quê | Como |
|---|---|
| Shell na máquina | `aws ssm start-session --target <id>` |
| Swagger | `https://<DomainName ou domínio do CloudFront>/v1/docs`; o túnel do output `SwaggerTunnelCommand` continua valendo |
| psql no RDS | `npm run db:tunnel` na raiz, depois `psql -h localhost -p 5433 -U hub_rw hub_afiliados` (ou direto no `RdsEndpoint`, se `DbAccessCidr` estiver preenchido) |
| Senha do `hub_rw` | `npm run db:password` na raiz |
| Senha do master | output `ReadDbPasswordCommand` — só para o que exige DDL |
| Senha inicial do painel | output `ReadSeedPasswordCommand` |
| Logs | CloudWatch, grupo `/porto-hub/dev`, streams `api`, `web` e `caddy` |
| Rollback | *Actions → CD → Run workflow*, com o `imageTag` anterior (o ECR guarda as 10 últimas) |
| Certificados | copiados para `s3://<bucket-de-deploy>/caddy-data.tgz` a cada release e restaurados em instância nova |

O seed roda a cada deploy e é idempotente (`ON CONFLICT DO NOTHING`): não
devolve a senha do operador para a do seed, e garante que um ambiente
recém-criado já tenha com quem entrar no painel.

Os grants do `hub_rw` também, logo depois das migrations: `SELECT`, `INSERT`,
`UPDATE` e `DELETE` no schema `public` e nada de DDL — o que vazar dele não cria
papel, não dropa tabela e não vira superusuário. Rodar depois da migration é o
que faz tabela nova já nascer acessível. O master continua existindo para
migration e seed.

### O log do deploy tem 24 KB, e o SSM corta o fim

`get-command-invocation` devolve no máximo 24 KB de `StandardOutputContent` e
outros 24 KB de `StandardErrorContent`, **cortando o fim**. O progresso do
`docker pull` — uma linha por camada e por atualização — enche isso sozinho, e o
que se perde é justamente o erro que veio depois.

Foi assim que um deploy quebrado chegou ao GitHub Actions mostrando apenas
`Error during migration run:`, sem a linha seguinte, que dizia o porquê. Por
isso `pull`, `run` e `up` no `install-release.sh` são silenciosos quanto a
progresso (`--quiet` e `--quiet-pull`). **Não tire esses flags para "ver melhor
o que está acontecendo"** — o efeito é o contrário.

Precisa da saída inteira de um container? Ela está no CloudWatch, grupo
`/porto-hub/dev`, que não tem esse limite.

### O que o rollback automático faz, e o que não faz

Quando um deploy falha depois da migration, o `install-release.sh` volta a
**imagem** para a tag anterior e **não** reverte o schema. Ele diz isso em voz
alta no log, com o comando pronto:

```bash
docker compose -f /opt/porto-hub/docker-compose.prod.yml \
  --project-directory /opt/porto-hub run --rm api npm run typeorm:revert:prod
```

Reverter sozinho seria pior: um health check instável passaria a rodar `down()`
por conta própria, e `down()` derruba coluna. Migration aditiva o código antigo
tolera; destrutiva exige a decisão de uma pessoa.

Imagem velha também não se acumula: o script roda `docker image prune` com
janela de uma semana antes de cada `pull`. Sem isso o disco de 20 GB enche em
poucos meses, e a falha não se parece com falta de espaço.

## Derrubar o ambiente

```bash
aws cloudformation delete-stack --stack-name porto-hub-dev --region us-east-1
```

Sai tudo: o RDS (`DeletionPolicy: Delete`, sem proteção), os repositórios do ECR
(`EmptyOnDelete`), o bucket e o log group. Os três segredos ficam **agendados
para exclusão** com janela de recuperação — é assim que o Secrets Manager
funciona, não dá para apagar na hora pelo CloudFormation.

Por isso nenhum deles tem nome fixo no template: com nome fixo, recriar a stack
falharia por 30 dias com `already scheduled for deletion`. Com nome gerado,
deletar e recriar é uma operação só. Se quiser não pagar os ~US$ 1,20/mês da
janela:

```bash
aws secretsmanager list-secrets --region us-east-1 \
  --include-planned-deletion --filters Key=description,Values="Hub de Afiliados" \
  --query 'SecretList[].ARN' --output text |
  xargs -n1 -I{} aws secretsmanager delete-secret --secret-id {} \
    --force-delete-without-recovery --region us-east-1
```

## Verificação

```bash
# Fronteira da web: os dois devem falhar com "Network unreachable".
docker compose exec -T web node -e "fetch('http://169.254.169.254/').catch(e=>{console.log(e.cause.code);process.exit(0)})"
docker compose exec -T web node -e "fetch('http://<rds-endpoint>:5432').catch(e=>{console.log(e.cause.code);process.exit(0)})"

# E este deve funcionar — é o caminho que a aplicação usa.
docker compose exec -T web node -e "fetch('http://api:3000/v1/health').then(r=>console.log(r.status))"
```

Ponta a ponta: cadastro em `/cadastro`, aprovação em `/admin/afiliados`,
e-mail, `/definir-senha`, login em `/entrar`. Sem domínio próprio isso roda no
`WebUrl` do output, direto — não depende de a Porto ter apontado nada.

Já **com** domínio próprio, e antes de os CNAMEs propagarem, o caminho pelo nome
não existe ainda. Dois testes que funcionam nessa janela:

```bash
# Ponta a ponta pelo CloudFront, sem DNS. SNI e Host certos, certificado
# validado de verdade. Testar pelo <id>.cloudfront.net cru NÃO serve: o Host
# encaminhado seria o dele, e o Caddy não tem bloco para esse nome.
IP="$(dig +short <id>.cloudfront.net | head -1)"
curl -sS --resolve "dev.hubafiliados.com.br:443:$IP" \
  https://dev.hubafiliados.com.br/ -o /dev/null -w '%{http_code}\n'
```

```bash
# Ou de dentro da instância, por Session Manager — é o que o deploy já faz:
curl -sS -H 'Host: dev.hubafiliados.com.br' http://127.0.0.1/ -o /dev/null -w '%{http_code}\n'
```

## Custo aproximado (us-east-1, sob demanda)

| Item | US$/mês |
|---|---|
| EC2 `t3.small` | 16,64 |
| EBS 20 GB gp3 | 1,60 |
| IPv4 público | 3,65 |
| RDS `db.t4g.micro` + 20 GB gp3 | 13,98 |
| Secrets Manager (3 segredos) | 1,20 |
| CloudFront (tráfego de dev) | ~0,50 |
| ECR, S3, CloudWatch | ~0,70 |
| **Total** | **~US$ 38** |

O CloudFront cobra por requisição e por GB de saída; no volume de um ambiente de
desenvolvimento fica em trocados, e conta com o nível gratuito da AWS no primeiro
ano. Não muda a ordem de grandeza.

Duas alavancas, ambas parâmetro do template:

- **`InstanceType=t3.micro`** economiza ~US$ 9/mês. Cabe: a máquina não builda
  nada, só roda Caddy e dois processos Node. O aperto é durante o deploy, quando
  a migration sobe um terceiro processo — daí os 2 GB de swap. Ajuste os
  `mem_limit` do compose junto: somam 1,28 GB em regime e ~1,9 GB durante o
  deploy, e num box de 1 GB viram teto decorativo — não seguram mais nada.
- **Graviton (`t4g.small`)** economiza ~US$ 4/mês, mas exige trocar **três**
  coisas juntas: `InstanceType`, o `LatestAmiId` para o caminho `-arm64`, e o
  `--platform` no job `images` do `ci.yml`. O `bcrypt` publica prebuild `linux-arm64`, então
  não há compilação nativa no caminho; o custo é o `next build` sob QEMU, a
  menos que a organização tenha runner `ubuntu-24.04-arm`.

## Três armadilhas que custam uma tarde cada

Todas têm o mesmo formato: a tela carrega, nada quebra no log, e o app não
funciona. É o pior tipo de falha, e as três vêm de ter um proxy na frente.

**1. O cookie `secure` exige HTTPS de ponta a ponta do navegador.**
`secure: process.env.NODE_ENV === 'production'` nos dois `session.ts`, e
`next start` força `NODE_ENV=production`. Em HTTP puro o navegador **descarta**
o `Set-Cookie` e o login entra em loop, sem erro no log da API nem no do Next.
Aqui está resolvido porque a Imperva e o CloudFront servem HTTPS ao navegador —
a perna interna em claro não afeta o cookie, que só olha o que o navegador viu.

**2. As Server Actions checam a origem.** O Next compara `Origin` com
`X-Forwarded-Host` e aborta com `Invalid Server Actions request` e HTTP 500
quando divergem. São **sete actions**, e são todo o caminho de escrita:
cadastro, os dois logins, definir senha, aprovar/reprovar e os dois logouts.
Resolvido pelo `allowedOrigins` no `next.config.mjs`, alimentado pelo
`PUBLIC_DOMAIN_NAME` que o `install-release.sh` grava no `web.env`. **Trocar o
domínio sem trocar essa variável quebra tudo que é POST.**

**3. O CloudFront, no padrão, remove cookies e recusa POST.** Cache behavior
nasce com `AllowedMethods: GET, HEAD` — as sete actions são POST — e sem política
de origin request ele não encaminha cookies nem o `Host`. Qualquer um dos três
sozinho derruba a aplicação. Resolvido no template pela política `AllViewer` e
pelos métodos completos no `DefaultCacheBehavior`; se alguém "otimizar" isso um
dia, é aqui que vai doer.
