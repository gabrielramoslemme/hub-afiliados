#!/usr/bin/env bash
#
# Instala uma release na instância. Chamado pelo documento SSM, que baixa este
# arquivo do bucket de deploy junto com o compose. Recebe a tag da imagem.
#
# `set -euo pipefail` é o que dá sentido ao rollback: sem ele o script seguiria
# depois de um comando que falhou e terminaria dizendo que deu certo.
set -euo pipefail

IMAGE_TAG_NEW="${1:?uso: install-release.sh <image-tag>}"

APP_DIR=/opt/porto-hub
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
ENV_FILE="${APP_DIR}/.env"

# Vira true assim que a migration desta release passa. O rollback precisa saber:
# voltar a imagem não desfaz schema.
MIGRATION_APPLIED=false

# O UserData deixa só a região e o nome do parâmetro — nada que possa mudar
# durante a vida da instância. A configuração de verdade vem do Parameter Store
# a cada deploy: é isso que faz um update de stack (endpoint novo do RDS, outro
# MailProvider) chegar aqui sem substituir a máquina.
# shellcheck source=/dev/null
source "${APP_DIR}/bootstrap.env"

# `umask 077` por hábito: o parâmetro só traz ARNs de segredo, mas o arquivo
# fica no disco da instância entre um deploy e outro.
( umask 077
  aws ssm get-parameter --name "${CONFIG_PARAM}" --region "${AWS_REGION}" \
    --query Parameter.Value --output text > "${APP_DIR}/stack.env"
)
# shellcheck source=/dev/null
source "${APP_DIR}/stack.env"

# Chaves que nasceram junto com o template de producao. Faltando, a stack ainda
# roda o template anterior: o `set -u` pararia mais adiante com um "unbound
# variable" que nao diz o que fazer.
for key in PORTO_SECRET_ARN PORTO_OAUTH_URL PORTO_API_BASE_URL; do
  if [ -z "${!key+set}" ]; then
    echo "FALHA: ${key} ausente em ${CONFIG_PARAM}. Atualize a stack com o template atual antes do deploy." >&2
    exit 1
  fi
done

compose() {
  docker compose -f "${COMPOSE_FILE}" --project-directory "${APP_DIR}" "$@"
}

# A tag que está no ar agora. Se o deploy falhar, é para ela que voltamos.
IMAGE_TAG_PREVIOUS=""
if [ -f "${ENV_FILE}" ]; then
  IMAGE_TAG_PREVIOUS="$(sed -n 's/^IMAGE_TAG=//p' "${ENV_FILE}")"
fi

write_env_file() {
  cat > "${ENV_FILE}" <<ENV
IMAGE_TAG=$1
API_IMAGE=${API_IMAGE}
WEB_IMAGE=${WEB_IMAGE}
AWS_REGION=${AWS_REGION}
LOG_GROUP=${LOG_GROUP}
ENV
}

rollback() {
  if [ -z "${IMAGE_TAG_PREVIOUS}" ]; then
    echo "FALHA no primeiro deploy: não há tag anterior para voltar." >&2
    exit 1
  fi

  if [ "${MIGRATION_APPLIED}" = true ]; then
    cat >&2 <<AVISO

ATENÇÃO: as migrations desta release foram aplicadas e NÃO foram revertidas.
A imagem volta para a anterior; o schema, não. Migration aditiva (coluna ou
tabela nova) o código antigo tolera. Migration destrutiva, não.

Para reverter à mão, uma migration por vez:
  docker compose -f ${COMPOSE_FILE} --project-directory ${APP_DIR} \
    run --rm api npm run typeorm:revert:prod

Reverter aqui, automático, é justamente o que não se faz: um health check
instável passaria a rodar 'down()' sozinho, e 'down()' derruba coluna. A escolha
é falhar barulhento em vez de desfazer schema por conta própria.
AVISO
  fi

  echo "FALHA — voltando para ${IMAGE_TAG_PREVIOUS}" >&2
  write_env_file "${IMAGE_TAG_PREVIOUS}"
  compose up -d --remove-orphans --quiet-pull
  exit 1
}

write_secret_files() {
  set +x

  local db_secret app_secret porto_secret database_url jwt_secret resend_key

  db_secret="$(aws secretsmanager get-secret-value --secret-id "${DB_SECRET_ARN}" \
    --region "${AWS_REGION}" --query SecretString --output text)"
  app_secret="$(aws secretsmanager get-secret-value --secret-id "${APP_SECRET_ARN}" \
    --region "${AWS_REGION}" --query SecretString --output text)"

  database_url="$(python3 -c 'import json,sys,urllib.parse as u
s = json.loads(sys.argv[1])
# A senha é gerada sem pontuação, mas passar pelo quote mantém o script correto
# se alguém trocar a senha à mão por uma com "@" ou "/".
print("postgres://%s:%s@%s:5432/%s" % (
    u.quote(s["username"], safe=""), u.quote(s["password"], safe=""),
    sys.argv[2], sys.argv[3]))' "${db_secret}" "${DB_HOST}" "${DB_NAME}")"

  jwt_secret="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["jwt_secret"])' "${app_secret}")"
  resend_key="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["resend_api_key"])' "${app_secret}")"

  # O segredo nasce com REPLACE_ME e é preenchido à mão depois do create. Falhar
  # aqui, antes de tocar em container, é melhor que subir uma API que só descobre
  # a credencial falsa na primeira aprovação de cupom.
  porto_secret="$(aws secretsmanager get-secret-value --secret-id "${PORTO_SECRET_ARN}" \
    --region "${AWS_REGION}" --query SecretString --output text)"
  PORTO_CLIENT_ID="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["client_id"])' "${porto_secret}")"
  PORTO_CLIENT_SECRET="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["client_secret"])' "${porto_secret}")"
  PORTO_WEBHOOK_SECRET="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1]).get("webhook_secret",""))' "${porto_secret}")"
  if [ "${PORTO_CLIENT_ID}" = REPLACE_ME ] || [ "${PORTO_CLIENT_SECRET}" = REPLACE_ME ]; then
    echo "FALHA: as credenciais da Porto ainda são REPLACE_ME no ${PORTO_SECRET_ARN}." >&2
    echo "Grave-as com o comando do output SetPortoSecretCommand e rode o deploy de novo." >&2
    exit 1
  fi

  # `umask 077` antes de escrever: criar e depois `chmod` deixa uma janela em
  # que o arquivo com a senha do banco é legível por qualquer usuário do host.
  ( umask 077
    cat > "${APP_DIR}/api.env" <<ENV
NODE_ENV=production
PORT=3000
DATABASE_URL=${database_url}
# O parameter group padrão do RDS PostgreSQL 16 traz rds.force_ssl = 1: sem TLS
# o servidor recusa a conexão antes de olhar a senha. O bundle das CAs da Amazon
# vai dentro da imagem, porque o trust store do Node não as conhece.
DATABASE_SSL=true
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN_SECONDS=28800
APP_BASE_URL=https://${DOMAIN_NAME}
PANEL_BASE_URL=https://${DOMAIN_NAME}
MAIL_PROVIDER=${MAIL_PROVIDER}
RESEND_API_KEY=${resend_key}
MAIL_FROM_EMAIL=${MAIL_FROM_EMAIL}
MAIL_FROM_NAME=Hub de Afiliados
PORTO_CLIENT_ID=${PORTO_CLIENT_ID}
PORTO_CLIENT_SECRET=${PORTO_CLIENT_SECRET}
# O segredo do webhook de incentivos é opcional de propósito: vazio no segredo,
# a API sobe e a rota recusa toda chamada com 401.
PORTO_WEBHOOK_SECRET=${PORTO_WEBHOOK_SECRET}
# Transfeera (saque via PIX). As três linhas são opcionais de propósito: sem
# credencial a API sobe com o saque desligado (WDR-003), e sem o segredo a
# rota do webhook recusa tudo com 401.
TRANSFEERA_CLIENT_ID=${TRANSFEERA_CLIENT_ID:-}
TRANSFEERA_CLIENT_SECRET=${TRANSFEERA_CLIENT_SECRET:-}
TRANSFEERA_WEBHOOK_SECRET=${TRANSFEERA_WEBHOOK_SECRET:-}
ENV

    # Os endereços do gateway só entram quando a stack os traz. Vazios (dev),
    # valem os padrões da API, que são os de homologação; em prod a stack não
    # cria sem eles. Linha vazia aqui não serviria: o Joi recusaria a string
    # vazia em vez de cair no padrão.
    if [ -n "${PORTO_OAUTH_URL}" ]; then
      echo "PORTO_OAUTH_URL=${PORTO_OAUTH_URL}" >> "${APP_DIR}/api.env"
    fi
    if [ -n "${PORTO_API_BASE_URL}" ]; then
      echo "PORTO_API_BASE_URL=${PORTO_API_BASE_URL}" >> "${APP_DIR}/api.env"
    fi

    # Os endereços da Transfeera seguem a mesma regra, mas vêm do parâmetro:
    # sem a linha valem os padrões de sandbox; produção põe no parâmetro
    # TRANSFEERA_AUTH_URL e TRANSFEERA_API_BASE_URL.
    local name
    for name in TRANSFEERA_AUTH_URL TRANSFEERA_API_BASE_URL; do
      if [ -n "${!name:-}" ]; then
        printf '%s=%s\n' "${name}" "${!name}" >> "${APP_DIR}/api.env"
      fi
    done

    # Nada de segredo aqui, e é essa a fronteira: a web não tem o que vazar.
    # `API_BASE_URL` aponta para o nome do serviço na rede interna do compose —
    # não é `NEXT_PUBLIC_`, e o navegador nunca a vê.
    #
    # ATENÇÃO: o delimitador é aberto (sem aspas) porque as variáveis abaixo
    # precisam expandir. Isso vale para crase e para $(...) também, inclusive
    # dentro de comentário: dentro deste bloco, crase é escapada com \` ou o
    # bash tenta executar o que está entre elas.
    cat > "${APP_DIR}/web.env" <<ENV
NODE_ENV=production
PORT=3005
HOSTNAME=0.0.0.0
API_BASE_URL=http://api:3000/v1
API_MOCKING=${API_MOCKING}
# Alimenta o \`allowedOrigins\` das Server Actions no next.config.mjs. Atrás do
# CloudFront, sem ele todo POST volta 500 — e são nove actions.
PUBLIC_DOMAIN_NAME=${DOMAIN_NAME}
ENV
  )
}

# O Caddy não termina mais TLS: quem faz isso é o CloudFront, com o certificado
# da Porto. Aqui ele só escuta HTTP na 80 — a única porta que o security group
# abre, e só para as faixas do CloudFront — e roteia pelo `Host` encaminhado.
#
# `DOMAIN_NAME` nunca chega vazio: sem domínio próprio a stack o resolve para o
# nome da distribuição do CloudFront. `API_DOMAIN_NAME`, sim — e aí o bloco da
# API não é escrito. Não se perde nada: o host da web também publica /v1/*.
#
# A API é pública de propósito, para consumidor externo usá-la pela mesma URL
# do CloudFront. Nenhuma rota da web começa com /v1, então separar por caminho
# não esconde tela nenhuma. O que protege /v1/admin e /v1/affiliate são os
# guards da API, com audiência de JWT — não mais a rede interna do compose.
write_caddyfile() {
  ( umask 022
    cat > "${APP_DIR}/Caddyfile" <<CADDY
{
	# Sem isto o Caddy tentaria emitir certificado para os nomes abaixo. Com
	# domínio próprio eles apontam para a Imperva, não para esta máquina, e cada
	# tentativa queimaria cota do Let's Encrypt sem nunca validar. Sem domínio
	# próprio o nome é do CloudFront, e o desafio jamais chegaria aqui.
	auto_https off
}

http://${DOMAIN_NAME} {
	encode zstd gzip

	handle /v1/* {
		reverse_proxy api:3000
	}

	handle {
		reverse_proxy web:3005
	}
}
CADDY

    # Host próprio da API: mesma API do bloco acima, sem a web atrás.
    if [ -n "${API_DOMAIN_NAME}" ]; then
      cat >> "${APP_DIR}/Caddyfile" <<CADDY

http://${API_DOMAIN_NAME} {
	encode zstd gzip

	handle /v1/* {
		reverse_proxy api:3000
	}

	handle {
		respond 404
	}
}
CADDY
    fi
  )
}

# A senha do hub_rw segue o mesmo caminho da do seed: lida na hora e passada só
# para o container dos grants, que a aplica no papel.
read_rw_password() {
  set +x
  aws secretsmanager get-secret-value --secret-id "${DB_RW_SECRET_ARN}" \
    --region "${AWS_REGION}" --query SecretString --output text \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["password"])'
}

# A senha inicial dos operadores nao entra em arquivo nenhum: e lida na hora e
# passada so para o container do seed, que a grava ja com bcrypt.
read_seed_password() {
  set +x
  aws secretsmanager get-secret-value --secret-id "${SEED_SECRET_ARN}" \
    --region "${AWS_REGION}" --query SecretString --output text \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["admin_password"])'
}

# `compose up -d` devolve quando o container **iniciou**, não quando ele atende.
# Só a API tem healthcheck, e é a única que o compose espera; a web sobe depois
# dela, por `depends_on`, e é a última a ficar de pé. Conferir qualquer uma
# delas uma vez só, logo depois do `up`, é corrida perdida — e foi assim que um
# deploy com migration e seed aplicados morreu num 502 do Caddy, que só queria
# dizer "ainda não tem ninguém em web:3005".
#
# Por isso todo check aqui espera, e não só o primeiro. Sessenta segundos é
# folga larga para um servidor Node que já subiu; o que passar disso é falha de
# verdade, e aí a mensagem diz qual check ficou para trás.
wait_for() {
  local descricao="$1"
  shift

  for _ in $(seq 1 30); do
    if "$@" > /dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "verificação falhou depois de 60s: ${descricao}" >&2
  return 1
}

# ------------------------------------------------------------------- deploy
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

write_secret_files
write_caddyfile
write_env_file "${IMAGE_TAG_NEW}"

# O disco são 20 GB e cada release traz duas imagens novas. Nada em uso é
# removido: as imagens do que está no ar estão rodando neste instante, e a
# janela de uma semana preserva o alvo de um rollback recente. O resto é lixo de
# releases velhas — que, sem isto, enche o disco em poucos meses e derruba o
# deploy de um jeito que não se parece com falta de espaço.
docker image prune -af --filter 'until=168h' > /dev/null

# `--quiet` não é cosmético: o SSM guarda no máximo 24 KB de stdout e outros
# 24 KB de stderr por invocação, e corta o FIM. Uma linha de progresso por
# camada e por atualização enche isso sozinha, e o erro que interessa — o que
# vem depois, da migration — é justamente o que se perde. Foi assim que um
# deploy quebrado chegou ao log dizendo apenas "Error during migration run:".
#
# Os `compose run` abaixo não levam flag de silêncio de propósito: a imagem já
# veio deste pull, e é a saída deles — a da migration e a do seed — que se quer
# ler inteira quando algo falha.
compose pull --quiet || rollback


# Instância única: não há corrida entre processos aplicando migration. Quando
# aparecer a segunda, este passo sai daqui e vira job à parte, antes do fan-out.
compose run --rm api npm run typeorm:run:prod || rollback
MIGRATION_APPLIED=true

# Depois da migration, e nao antes: GRANT ON ALL TABLES so alcanca o que ja
# existe, e a release de hoje pode ter criado tabela. A senha vai por -e, como
# a do seed - o api.env continua com a do master, que e quem pode criar papel.
DB_RW_PASSWORD="$(read_rw_password)" \
  compose run --rm -e DB_RW_PASSWORD api npm run db:grants:prod || rollback

# Idempotente por `ON CONFLICT DO NOTHING`: rodar a cada deploy não devolve a
# senha do operador para a do seed, e garante que um ambiente recém-criado já
# tenha com quem entrar no painel.
#
# Só em dev. Em prod a stack não cria o SeedSecret e deixa SEED_SECRET_ARN
# vazio: os operadores do seed são contas fictícias com senha compartilhada, e
# operador de produção nasce à mão, pelo túnel.
if [ -n "${SEED_SECRET_ARN}" ]; then
  SEED_ADMIN_PASSWORD="$(read_seed_password)" \
    compose run --rm -e SEED_ADMIN_PASSWORD api npm run seed:prod || rollback
fi

compose up -d --remove-orphans --quiet-pull

# --------------------------------------------------------------- verificação
wait_for "API em 127.0.0.1:3000/v1/health" \
  curl -fsS --max-time 3 http://127.0.0.1:3000/v1/health || rollback

# Pela 80 do host e com o `Host` do CloudFront, porque agora o roteamento é
# lógica: são dois blocos casados por nome e um `respond 404` de fallback.
# Bater em `web:3005` direto passaria por cima disso, e um nome errado no
# Caddyfile — ou o bloco da API respondendo 404 no que deveria servir —
# subiria dizendo que deu certo. É o caminho do navegador e o da Porto, sem
# o TLS, que termina no CloudFront e não aqui.
wait_for "web pelo Caddy, com Host ${DOMAIN_NAME}" \
  curl -fsS --max-time 5 -H "Host: ${DOMAIN_NAME}" http://127.0.0.1/ || rollback

if [ -n "${API_DOMAIN_NAME}" ]; then
  wait_for "API pelo Caddy, com Host ${API_DOMAIN_NAME}" \
    curl -fsS --max-time 5 -H "Host: ${API_DOMAIN_NAME}" http://127.0.0.1/v1/health \
    || rollback
fi

echo "Release ${IMAGE_TAG_NEW} no ar."
