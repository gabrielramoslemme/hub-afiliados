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
CADDY_BACKUP_KEY=caddy-data.tgz

# Vira true assim que a migration desta release passa. O rollback precisa saber:
# voltar a imagem não desfaz schema.
MIGRATION_APPLIED=false

# O UserData deixa só a região e o nome do parâmetro — nada que possa mudar
# durante a vida da instância. A configuração de verdade vem do Parameter Store
# a cada deploy: é isso que faz um update de stack (endpoint novo do RDS, outro
# MailProvider) chegar aqui sem substituir a máquina.
# shellcheck source=/dev/null
source "${APP_DIR}/bootstrap.env"

aws ssm get-parameter --name "${CONFIG_PARAM}" --region "${AWS_REGION}" \
  --query Parameter.Value --output text > "${APP_DIR}/stack.env"
# shellcheck source=/dev/null
source "${APP_DIR}/stack.env"

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
  compose up -d --remove-orphans
  exit 1
}

# ------------------------------------------------------------- certificados
# Instância nova nasce sem os certificados — e a troca de AMI num update de
# stack cria uma instância nova sem ninguém pedir. Reemitir queima a cota do
# Let's Encrypt (5 certificados duplicados por semana para o mesmo host), então
# eles vivem no bucket e não só no volume do compose.
#
# O `caddy` do compose já monta `caddy-data` em /data; usar o próprio serviço
# evita uma segunda imagem e mantém uma fonte de verdade só para o caminho.
restore_caddy_data() {
  if compose run --rm --no-deps --entrypoint /bin/sh caddy \
       -c '[ -n "$(ls -A /data 2>/dev/null)" ]' > /dev/null 2>&1; then
    return 0
  fi

  if ! aws s3 cp "s3://${DEPLOY_BUCKET}/${CADDY_BACKUP_KEY}" "/tmp/${CADDY_BACKUP_KEY}" \
        --region "${AWS_REGION}" > /dev/null 2>&1; then
    echo "Sem backup de certificados no bucket — o Caddy vai emitir do zero."
    return 0
  fi

  compose run --rm --no-deps -v /tmp:/backup --entrypoint /bin/sh caddy \
    -c "tar xzf /backup/${CADDY_BACKUP_KEY} -C /data"
  rm -f "/tmp/${CADDY_BACKUP_KEY}"
  echo "Certificados restaurados do bucket."
}

# Roda depois da verificação. No primeiro deploy de um host novo o Caddy ainda
# pode estar emitindo, e o backup sai vazio ou parcial — o do deploy seguinte
# corrige. Não vale falhar um deploy saudável por causa disso.
backup_caddy_data() {
  compose run --rm --no-deps -v /tmp:/backup --entrypoint /bin/sh caddy \
    -c "tar czf /backup/${CADDY_BACKUP_KEY} -C /data ." \
    && aws s3 cp "/tmp/${CADDY_BACKUP_KEY}" "s3://${DEPLOY_BUCKET}/${CADDY_BACKUP_KEY}" \
        --region "${AWS_REGION}" > /dev/null
  rm -f "/tmp/${CADDY_BACKUP_KEY}"
}

# ------------------------------------------------------------------ segredos
# Daqui até o fim da função nada é ecoado: `set +x` é explícito porque o
# documento SSM pode rodar com rastreamento ligado, e um `echo` de debug aqui
# publicaria a senha do banco no log do CloudWatch.
write_secret_files() {
  set +x

  local db_secret app_secret database_url jwt_secret resend_key

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

  # `umask 077` antes de escrever: criar e depois `chmod` deixa uma janela em
  # que o arquivo com a senha do banco é legível por qualquer usuário do host.
  ( umask 077
    cat > "${APP_DIR}/api.env" <<ENV
NODE_ENV=production
PORT=3000
DATABASE_URL=${database_url}
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN_SECONDS=28800
APP_BASE_URL=https://${DOMAIN_NAME}
PANEL_BASE_URL=https://${DOMAIN_NAME}
MAIL_PROVIDER=${MAIL_PROVIDER}
RESEND_API_KEY=${resend_key}
MAIL_FROM_EMAIL=${MAIL_FROM_EMAIL}
MAIL_FROM_NAME=Hub de Afiliados
ENV

    # Nada de segredo aqui, e é essa a fronteira: a web não tem o que vazar.
    # `API_BASE_URL` aponta para o nome do serviço na rede interna do compose —
    # não é `NEXT_PUBLIC_`, e o navegador nunca a vê.
    cat > "${APP_DIR}/web.env" <<ENV
NODE_ENV=production
PORT=3005
HOSTNAME=0.0.0.0
API_BASE_URL=http://api:3000/v1
API_MOCKING=${API_MOCKING}
ENV
  )
}

write_caddyfile() {
  ( umask 022
    cat > "${APP_DIR}/Caddyfile" <<CADDY
{
	email ${ACME_EMAIL}
}

${DOMAIN_NAME} {
	encode zstd gzip
	reverse_proxy web:3005
}
CADDY
  )
}

# A senha inicial dos operadores nao entra em arquivo nenhum: e lida na hora e
# passada so para o container do seed, que a grava ja com bcrypt.
read_seed_password() {
  set +x
  aws secretsmanager get-secret-value --secret-id "${SEED_SECRET_ARN}" \
    --region "${AWS_REGION}" --query SecretString --output text \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["admin_password"])'
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

compose pull || rollback

restore_caddy_data

# Instância única: não há corrida entre processos aplicando migration. Quando
# aparecer a segunda, este passo sai daqui e vira job à parte, antes do fan-out.
compose run --rm api npm run typeorm:run:prod || rollback
MIGRATION_APPLIED=true

# Idempotente por `ON CONFLICT DO NOTHING`: rodar a cada deploy não devolve a
# senha do operador para a do seed, e garante que um ambiente recém-criado já
# tenha com quem entrar no painel.
SEED_ADMIN_PASSWORD="$(read_seed_password)" \
  compose run --rm -e SEED_ADMIN_PASSWORD api npm run seed:prod || rollback

compose up -d --remove-orphans

# --------------------------------------------------------------- verificação
for _ in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/v1/health > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

curl -fsS --max-time 5 http://127.0.0.1:3000/v1/health > /dev/null || rollback
# A web só existe na rede interna, então quem a alcança é o Caddy — e é
# exatamente o caminho que o navegador vai fazer.
compose exec -T caddy wget -q -O /dev/null http://web:3005/ || rollback

backup_caddy_data || echo "AVISO: não foi possível salvar os certificados no bucket." >&2

echo "Release ${IMAGE_TAG_NEW} no ar."
