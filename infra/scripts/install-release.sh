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
# Alimenta o `allowedOrigins` das Server Actions no next.config.mjs. Atrás do
# CloudFront, sem ele todo POST volta 500 — e são sete actions.
PUBLIC_DOMAIN_NAME=${DOMAIN_NAME}
ENV
  )
}

# O Caddy não termina mais TLS: quem faz isso é o CloudFront, com o certificado
# da Porto. Aqui ele só escuta HTTP na 80 — a única porta que o security group
# abre, e só para as faixas do CloudFront — e roteia pelo `Host` encaminhado.
write_caddyfile() {
  ( umask 022
    cat > "${APP_DIR}/Caddyfile" <<CADDY
{
	# Sem isto o Caddy tentaria emitir certificado para os nomes abaixo. Eles
	# apontam para a Imperva, não para esta máquina, e cada tentativa queimaria
	# cota do Let's Encrypt sem nunca validar.
	auto_https off
}

http://${DOMAIN_NAME} {
	encode zstd gzip
	reverse_proxy web:3005
}

# A API existe para chamada servidor-a-servidor. São os dois únicos caminhos
# publicados; os canais /v1/admin e /v1/affiliate ficam de fora, alcançáveis
# apenas pelo container da web, pela rede interna do compose.
http://${API_DOMAIN_NAME} {
	encode zstd gzip

	@publico path /v1/webhooks /v1/webhooks/* /v1/health
	handle @publico {
		reverse_proxy api:3000
	}

	handle {
		respond 404
	}
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

# Pela 80 do host e com o `Host` do CloudFront, porque agora o roteamento é
# lógica: são dois blocos casados por nome e um `respond 404` de fallback.
# Bater em `web:3005` direto passaria por cima disso, e um nome errado no
# Caddyfile — ou o bloco da API respondendo 404 no que deveria servir —
# subiria dizendo que deu certo. É o caminho do navegador e o da Porto, sem
# o TLS, que termina no CloudFront e não aqui.
curl -fsS --max-time 5 -H "Host: ${DOMAIN_NAME}" http://127.0.0.1/ -o /dev/null \
  || rollback
curl -fsS --max-time 5 -H "Host: ${API_DOMAIN_NAME}" \
  http://127.0.0.1/v1/health -o /dev/null || rollback

echo "Release ${IMAGE_TAG_NEW} no ar."
