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
   │    ├─ Host dev.<domínio>      → web:3005
   │    └─ Host api-dev.<domínio>  → api:3000, só /v1/webhooks e /v1/health
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

## A API tem hostname, mas não é o navegador que fala com ela

`CLAUDE.md`, regra inviolável: *"o navegador nunca fala com a API; quem chama é o
servidor do Next"*. Ela continua valendo — a sessão é cookie `httpOnly` gravado
pelo servidor do Next, e um token alcançável por JavaScript desmontaria isso.

O que o `ApiDomainName` existe para atender é **chamada servidor-a-servidor**: o
serviço de cupom da Porto batendo em `/v1/webhooks`. Por isso o Caddy, nesse
host, publica **só `/v1/webhooks` e `/v1/health`** e devolve 404 no resto. Os
canais `/v1/admin` e `/v1/affiliate` seguem alcançáveis apenas pelo container da
web, por `http://api:3000/v1` na rede interna do compose.

É defesa em profundidade, não substituto de guard: os canais continuam
protegidos por audiência de JWT. Ampliar é uma linha no `Caddyfile`, quando
houver motivo.

Consequência prática: **Swagger e psql saem por túnel do SSM**, com os comandos
prontos nos outputs `SwaggerTunnelCommand` e `RdsTunnelCommand`.

## Por que a web fica numa rede `internal`

Ela tem a maior superfície de ataque (runtime do Next inteiro) e a menor
necessidade de privilégio: precisa de uma URL, não de `JWT_SECRET` nem de
`DATABASE_URL`. Na rede `internal` do compose ela perde a rota default — sem
caminho para o RDS, para a internet e para o IMDS. Quem a alcança é o Caddy;
quem ela alcança é a API.

Isso substitui a regra `DOCKER-USER` no iptables que a proposta original previa.
É a mesma fronteira, declarada no compose em vez de configurada no host: não há
o que dessincronizar depois, e o teste é uma linha (abaixo).

## Subir pela primeira vez

**1. Criar a stack.**

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/porto-hub-dev-stack.yaml \
  --stack-name porto-hub-dev \
  --region us-east-1 \
  --capabilities CAPABILITY_NAMED_IAM \
  --disable-rollback \
  --parameter-overrides \
      DomainName=dev.hubafiliados.com.br \
      ApiDomainName=api-dev.hubafiliados.com.br \
      CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/xxxx
```

O `CertificateArn` tem que estar em **`us-east-1`** — CloudFront não aceita
certificado de outra região — e precisa cobrir os dois nomes. É o certificado
que a segurança da informação da Porto emite, importado no ACM. Um curinga
`*.<domínio>` resolve os dois de uma vez e poupa um pedido futuro; vale pedir
assim desde o começo.

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

**2. Entregar o Elastic IP para a Porto.** O output `ElasticIpAddress` é o
endereço do registro A. **A stack não cria registro de DNS** — a zona fica no
servidor on premise deles, e é gente de lá que aponta o nome.

Confirme que o nome resolve **pela internet** antes de esperar HTTPS:

```bash
dig +short dev.hubafiliados.com.br @1.1.1.1     # tem que devolver o Elastic IP
```

**3. Injetar a chave do Resend.** Nasce `REPLACE_ME`.

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

## O que depende da Porto, e em que ordem

Nada disto está na nossa mão, e **os três são caminho crítico**. O certificado,
nas palavras do Diego, *"não é rápido"* — então começa por ele.

| # | O quê | Com quem | Trava o quê |
|---|---|---|---|
| 1 | **Certificado** do domínio, de preferência curinga | Segurança da informação (Lucas Paula / Thiago), por chamado interno | Tudo. *"Sem o certificado não vai ser externalizado."* |
| 2 | **Entrada TXT** para validar o domínio do certificado | DNS (Diego / Tiago) | O passo 1 |
| 3 | **CNAME** de `DomainName` e `ApiDomainName` → `CloudFrontDomainName` | DNS (Diego / Tiago) | O acesso |
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

`DomainName`, `ApiDomainName`, `MailProvider`, `MailFromEmail` e `ApiMocking` são
parâmetros da stack, mas **não vivem no UserData** — vivem no parâmetro
`/porto-hub/dev/config` do Parameter Store, que o `install-release.sh` lê a cada
deploy. Trocar um valor é:

```bash
aws cloudformation deploy ... --parameter-overrides MailProvider=resend ...   # 1
aws ssm send-command --document-name porto-hub-dev-deploy \
  --instance-ids <id> --parameters imageTag=<sha-no-ar>                        # 2
```

O passo 2 é o que aplica: o update de stack reescreve o parâmetro, o deploy
reescreve os arquivos de env e reinicia os containers.

Foi para isso que a configuração saiu do UserData. Lá, mudar um valor ou
**substituiria a instância**, ou não teria efeito nenhum — o `cloud-init` roda
só no primeiro boot. O endpoint do RDS entra na mesma conta: se o banco for
substituído, o parâmetro acompanha.

Trocar `DomainName` ou `ApiDomainName` tem um passo a mais: eles também são
`Aliases` do CloudFront, então o certificado precisa cobrir o nome novo **antes**
do update, e a Porto precisa do CNAME correspondente.

## Operação

Todos os comandos saem prontos nos outputs da stack.

| O quê | Como |
|---|---|
| Shell na máquina | `aws ssm start-session --target <id>` |
| Swagger | túnel do output `SwaggerTunnelCommand`, depois `http://localhost:3000/v1/docs` |
| psql no RDS | túnel do output `RdsTunnelCommand`, depois `psql -h localhost -p 5433 -U porto hub_afiliados` |
| Senha do RDS | output `ReadDbPasswordCommand` |
| Senha inicial do painel | output `ReadSeedPasswordCommand` |
| Logs | CloudWatch, grupo `/porto-hub/dev`, streams `api`, `web` e `caddy` |
| Rollback | *Actions → CD → Run workflow*, com o `imageTag` anterior (o ECR guarda as 10 últimas) |
| Certificados | copiados para `s3://<bucket-de-deploy>/caddy-data.tgz` a cada release e restaurados em instância nova |

O seed roda a cada deploy e é idempotente (`ON CONFLICT DO NOTHING`): não
devolve a senha do operador para a do seed, e garante que um ambiente
recém-criado já tenha com quem entrar no painel.

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

Ponta a ponta, com o DNS no ar: cadastro em `/cadastro`, aprovação em
`/admin/afiliados`, e-mail, `/definir-senha`, login em `/entrar`.

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
