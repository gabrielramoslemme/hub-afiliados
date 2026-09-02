# Infraestrutura — ambiente de desenvolvimento

Stack única em `porto-hub-dev-stack.yaml`. Sobe uma EC2 com Docker Compose
(Caddy + web + API), um RDS Postgres em subnets privadas, dois repositórios no
ECR e o deploy por documento SSM.

## O que existe, e o que não existe

```
Internet ──► EC2 (subnet pública, Elastic IP)     security group: 80 e 443, nada mais
             │  caddy    :80/:443   TLS pelo Let's Encrypt
             │    └─ reverse_proxy web:3005
             │  web      :3005      rede `internal`: sem rota para RDS, internet ou IMDS
             │  api      :3000      publicada só em 127.0.0.1
             └──────────────────────► RDS Postgres 16 (subnets privadas, 2 AZs)
```

**Não há ALB, NAT Gateway, ASG, Multi-AZ, CloudFront nem alarmes.** Cada um foi
recusado por um motivo, não por esquecimento:

| Ausente | Por quê |
|---|---|
| ALB (~US$ 18/mês) | Só o servidor do Next fala com a API — o navegador nunca fala. Com uma aplicação e um host, o ALB não roteava nada que o Caddy não roteie. |
| NAT Gateway (~US$ 33/mês) | A instância fica em subnet pública com Elastic IP e alcança ECR, SSM, Secrets Manager e Resend pelo internet gateway. O que a protege é o security group, que abre 80 e 443 e mais nada. |
| Multi-AZ, ASG | É ambiente de desenvolvimento. Cair e voltar é aceitável; pagar o dobro por isso não. |
| Alarmes e SNS | Higiene de produção. Em dev quem percebe que quebrou é quem está usando. O log group fica, com 14 dias de retenção. |

## Por que a API não é publicada

`CLAUDE.md`, regra inviolável: *"o navegador nunca fala com a API; quem chama é o
servidor do Next"*. Como o `/v1/webhooks` ainda não tem controller, nada de fora
precisa alcançá-la — então ela não sai da máquina. O container da web chama
`http://api:3000/v1` pela rede interna do compose.

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
      HostedZoneName=hubafiliados.com.br. \
      AcmeEmail=voce@mesa.tech \
      AppIngressCidr=203.0.113.0/24
```

`--disable-rollback` **só na primeira criação**. O log do `cloud-init` não vai
para o CloudWatch, e no rollback a instância é terminada junto — um UserData que
falhou vira um erro sem causa. Com a instância de pé, `aws ssm start-session` e
`cat /var/log/cloud-init-output.log` dizem o que houve. Depois de a stack subir
uma vez, tire a flag.

`AppIngressCidr` restringe **só a 443**, que é a aplicação inteira, painel
incluso. A 80 (`AcmeIngressCidr`) fica aberta porque é por ela que o Let's
Encrypt faz o desafio HTTP-01 — fechá-la desliga o TLS automático. Deixar as
duas no padrão põe na internet um ambiente com CPF e chave PIX no banco; é
escolha, não descuido, e vale fazê-la de propósito.

`HostedZoneName` só quando a zona estiver **nesta mesma conta** — RecordSet não
atravessa conta, e a stack falharia com `No hosted zones named ... found`. Fora
disso, deixe vazia e crie o registro A à mão apontando para o output
`ElasticIpAddress`.

Se a conta já tiver o provider OIDC do GitHub, acrescente
`CreateGitHubOidcProvider=false` — o segundo faz a stack falhar com
`EntityAlreadyExists`, e o rollback derruba tudo.

**2. Injetar a chave do Resend.** Nasce `REPLACE_ME`.

```bash
echo -n 're_sua_chave' > resend_key.txt
# O comando exato sai no output SetResendKeyCommand; ele lê de arquivo, nunca de
# argv, porque segredo em argv fica visível em `ps` e no histórico do shell.
```

Enquanto o domínio não estiver verificado no Resend, suba com
`MailProvider=logger`: o link de definir senha sai no CloudWatch em vez da caixa
de entrada.

**3. Ligar o deploy.** Duas coisas no GitHub, e a segunda não é opcional:

- o output `GitHubOidcRoleArn` no secret `AWS_DEPLOY_ROLE_ARN`;
- o ambiente **`development`** em *Settings → Environments*, com
  *Deployment branches* em **Selected branches: `development`**.

O ambiente não é enfeite. O job de deploy declara `environment: development`, e
o GitHub monta o `sub` do token OIDC como `repo:OWNER/REPO:environment:development`
— sem a referência da branch. A trust policy aceita esse valor; quem garante que
só a `development` chega até ele é a regra de proteção do ambiente. Sem ela,
qualquer branch pode pedir o deploy deste ambiente.

**4. Publicar.** Um push na `development` roda a CI; os jobs de verificação, o
de infra e o que publica as imagens rodam em paralelo, e o deploy só existe como
`needs:` de todos eles.

Antes desse primeiro deploy a instância está de pé mas vazia — não há imagem no
ECR, e o `https://` ainda não responde. É esperado.

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

`DomainName`, `AcmeEmail`, `MailProvider`, `MailFromEmail` e `ApiMocking` são
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
**substituiria a instância** — levando o volume `caddy-data` e, com ele, a cota
de 5 emissões por semana do Let's Encrypt — ou não teria efeito nenhum, porque o
`cloud-init` roda só no primeiro boot. O endpoint do RDS entra na mesma conta:
se o banco for substituído, o parâmetro acompanha.

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
| ECR, S3, CloudWatch, Route 53 | ~1,20 |
| **Total** | **~US$ 38** |

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

## Uma armadilha que custa uma tarde

`secure: process.env.NODE_ENV === 'production'` nos dois `session.ts`, e
`next start` força `NODE_ENV=production`. **Em HTTP puro o navegador descarta o
cookie de sessão** e o login entra em loop, sem erro no log da API nem no do
Next. Por isso o `DomainName` é obrigatório e o Caddy existe: sem TLS o ambiente
sobe inteiro e não dá para entrar.
