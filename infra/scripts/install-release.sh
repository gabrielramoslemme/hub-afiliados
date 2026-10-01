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
# durante a vida da instância. A configuração de verdade vem de dois lugares, a
# cada deploy, e cada um tem um dono só:
#
#   /porto-hub/<env>/aws-config  Parameter Store. Escrito pela stack: endereços,
#                                imagens e ARNs das senhas que a AWS gera.
#   /porto-hub/<env>/api-env     Parameter Store, SecureString. Escrito à mão, no
#                                console: tudo o que uma pessoa define, uma linha
#                                CHAVE=valor por variável.
#
# O bootstrap.env ainda aponta para `/porto-hub/<env>/config`, o nome antigo: o
# UserData não roda de novo, e corrigi-lo no template pararia a instância sem
# atualizar o arquivo. O prefixo é o mesmo; só o sufixo muda.
# shellcheck source=/dev/null
source "${APP_DIR}/bootstrap.env"
AWS_CONFIG_PARAM="${CONFIG_PARAM%/*}/aws-config"

# Grava o valor de um parâmetro no arquivo do segundo argumento. Devolve 2 só
# quando o parâmetro não existe: throttling, AccessDenied ou credencial vencida
# tratados como "não existe" mandariam quem lê o log para o caminho errado — e
# o erro da AWS, nesses casos, vai inteiro para o stderr.
get_param() {
  local name="$1" out="$2" err
  shift 2
  if err="$(aws ssm get-parameter --name "${name}" "$@" --region "${AWS_REGION}" \
    --query Parameter.Value --output text 2>&1 > "${out}")"; then
    return 0
  fi
  case "${err}" in
    *ParameterNotFound*) return 2 ;;
  esac
  echo "${err}" >&2
  return 1
}

# `umask 077` por hábito: o parâmetro só traz ARNs de segredo, mas o arquivo
# fica no disco da instância entre um deploy e outro.
rc=0
( umask 077 && get_param "${AWS_CONFIG_PARAM}" "${APP_DIR}/stack.env" ) || rc=$?
case "${rc}" in
  0) ;;
  2)
    echo "FALHA: ${AWS_CONFIG_PARAM} não existe. Atualize a stack com o template atual antes do deploy." >&2
    exit 1
    ;;
  *)
    echo "FALHA: não consegui ler ${AWS_CONFIG_PARAM} (erro da AWS acima)." >&2
    exit 1
    ;;
esac
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
  # A imagem anterior volta com o api.env com que ela estava rodando. Com o
  # novo, um valor que a API recusa derrubaria também o rollback: o compose
  # recria o container quando o env_file muda.
  if [ -f "${APP_DIR}/api.env.previous" ]; then
    mv "${APP_DIR}/api.env.previous" "${APP_DIR}/api.env"
  fi
  write_env_file "${IMAGE_TAG_PREVIOUS}"
  compose up -d --remove-orphans --quiet-pull
  exit 1
}

# Variáveis que o deploy escreve a partir da stack. Uma delas também no
# api-env seria duas fontes para o mesmo valor, e o compose ficaria com a última
# linha sem ninguém perceber.
STACK_OWNED_KEYS="NODE_ENV PORT DATABASE_URL DATABASE_SSL APP_BASE_URL"

# Sem estas a API não sobe com NODE_ENV=production, ou sobe falando com quem não
# devia: o padrão do MAIL_FROM_EMAIL é um domínio de exemplo. Conferir aqui,
# antes da migration, troca um rollback com schema já aplicado por uma falha
# limpa que diz qual chave gravar. O resto do api-env é opcional — o
# env.validation.ts da API tem o padrão de cada uma.
REQUIRED_API_ENV_KEYS="JWT_SECRET PORTO_CLIENT_ID PORTO_CLIENT_SECRET PORTO_OAUTH_URL PORTO_API_BASE_URL MAIL_FROM_EMAIL"

# Transforma o api-env, que chega pela entrada padrão, em linhas do env_file. O
# valor nunca vai para a linha de comando: argv de qualquer processo aparece
# inteiro em `ps` e em /proc/<pid>/cmdline para todo usuário do host. `printf` é
# builtin do bash, e por isso o pipe não expõe nada.
#
# O parâmetro é digitado à mão no console, então a leitura é tolerante no que
# não muda o sentido — linha em branco, comentário com `#`, espaço em volta da
# chave e do valor — e estrita no resto. Os problemas citam a linha, nunca o
# conteúdo dela: a mensagem vai para o log do SSM.
#
# Aspas simples na saída porque o compose não interpola nada dentro delas: um
# `$` numa senha chegaria inteiro à API, e espaço no meio do valor também
# (`MAIL_FROM_NAME=Hub de Afiliados`). Por isso mesmo aspas, simples ou duplas,
# e barra invertida são recusadas.
#
# Chave sem valor também: para a API, vazia não é ausente — o Joi aplica o
# padrão só à ausente, e recusa vazia em número, URI e e-mail. Quem quer o
# padrão apaga a linha.
#
# Em prod, endereço de homologação da Porto é recusado: sem a regra da stack que
# exigia os de produção, um api-env copiado do dev passaria, e toda aprovação de
# cupom voltaria CPN-004 sem apontar para cá.
api_env_lines() {
  python3 -c 'import re, sys
reserved = set(sys.argv[1].split())
required = sys.argv[2].split()
environment = sys.argv[3]
env, problems = {}, []
for number, line in enumerate(sys.stdin.read().splitlines(), 1):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    key, sep, value = line.partition("=")
    key, value = key.strip(), value.strip()
    if not sep or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
        problems.append("linha %d não é CHAVE=valor" % number)
    elif key in reserved:
        problems.append("%s é escrita pelo deploy a partir da stack" % key)
    elif key in env:
        problems.append("%s aparece mais de uma vez" % key)
    elif value == "":
        problems.append("%s está vazia: apague a linha para valer o padrão da API" % key)
    elif re.search(r"[\x27\"\\\n]", value):
        problems.append("%s tem aspas ou barra invertida no valor" % key)
    elif environment == "prod" and key.startswith("PORTO_") and key.endswith("_URL") and "-hml" in value:
        problems.append("%s aponta para homologação em prod" % key)
    elif key == "JWT_SECRET" and len(value) < 32:
        problems.append("JWT_SECRET precisa de pelo menos 32 caracteres: openssl rand -hex 32")
    else:
        env[key] = value
reported = {p.split()[0] for p in problems}
for key in required:
    if key not in env and key not in reported:
        problems.append("%s ausente" % key)
if problems:
    sys.exit("\n".join(problems))
for key in sorted(env):
    print("%s=\x27%s\x27" % (key, env[key]))' "$@"
}

write_secret_files() {
  set +x

  local db_secret api_env database_url api_env_lines_out rc

  db_secret="$(aws secretsmanager get-secret-value --secret-id "${DB_MASTER_SECRET_ARN}" \
    --region "${AWS_REGION}" --query SecretString --output text)"

  # O JSON vem pela entrada padrão; só o host e o nome do banco, que não são
  # segredo, vão como argumento.
  database_url="$(printf '%s' "${db_secret}" | python3 -c 'import json,sys,urllib.parse as u
s = json.load(sys.stdin)
# A senha é gerada sem pontuação, mas passar pelo quote mantém o script correto
# se alguém trocar a senha à mão por uma com "@" ou "/".
print("postgres://%s:%s@%s:5432/%s" % (
    u.quote(s["username"], safe=""), u.quote(s["password"], safe=""),
    sys.argv[1], sys.argv[2]))' "${DB_HOST}" "${DB_NAME}")"

  # Pelo disco, e não por variável, para separar o valor do erro da AWS. O
  # arquivo nasce 0600 e some logo abaixo; o api.env leva o mesmo conteúdo.
  rc=0
  ( umask 077 && get_param "${API_ENV_PARAM}" "${APP_DIR}/api-env.raw" --with-decryption ) || rc=$?
  case "${rc}" in
    0) ;;
    2)
      echo "FALHA: ${API_ENV_PARAM} não existe. Crie-o no Parameter Store, como SecureString." >&2
      exit 1
      ;;
    *)
      echo "FALHA: não consegui ler ${API_ENV_PARAM} (erro da AWS acima)." >&2
      exit 1
      ;;
  esac
  api_env="$(cat "${APP_DIR}/api-env.raw")"
  rm -f "${APP_DIR}/api-env.raw"
  # Falhar aqui, antes de tocar em container, é melhor que subir uma API que só
  # descobre a credencial faltando na primeira aprovação de cupom.
  if ! api_env_lines_out="$(printf '%s' "${api_env}" \
    | api_env_lines "${STACK_OWNED_KEYS}" "${REQUIRED_API_ENV_KEYS}" "${ENVIRONMENT_NAME}")"; then
    echo "FALHA: o ${API_ENV_PARAM} não está pronto (acima). Corrija no Parameter Store e rode o deploy de novo." >&2
    exit 1
  fi

  # O que está rodando agora, para o rollback. `cp -p` mantém o 0600.
  if [ -f "${APP_DIR}/api.env" ]; then
    cp -p "${APP_DIR}/api.env" "${APP_DIR}/api.env.previous"
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
APP_BASE_URL=https://${DOMAIN_NAME}
# Daqui para baixo, o /porto-hub/<env>/api-env, chave por chave.
ENV
    printf '%s\n' "${api_env_lines_out}" >> "${APP_DIR}/api.env"

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

# O schema Joi da própria release, contra o api.env que ela vai receber, antes
# da migration. As checagens do api-env acima só conhecem formato e as
# obrigatórias; esta conhece cada regra — `PORTO_WEBHOOK_SECRET` curto, número
# que não é número. Sem ela, um valor recusado só aparecia no boot, com o schema
# já migrado. Mesmas opções do ConfigModule do Nest. Sai só a chave e a regra,
# nunca o valor: isto vai para o log do SSM.
# shellcheck disable=SC2016 # é JavaScript: a crase e o ${} são do node
compose run --rm --no-deps api node -e '
const { envValidationSchema } = require("./dist/infra/config/env.validation");
const { error } = envValidationSchema.validate(process.env, { allowUnknown: true, abortEarly: false });
if (error) {
  for (const d of error.details) console.error(`api-env: ${d.context.label} recusada (${d.type})`);
  process.exit(1);
}' || rollback

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
