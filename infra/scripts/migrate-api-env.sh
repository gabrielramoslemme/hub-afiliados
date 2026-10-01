#!/usr/bin/env bash
#
# Migração única: cria o /porto-hub/<env>/api-env a partir do que o template
# anterior guardava — o AppSecret (JWT e Resend), o PortoSecret (credenciais e
# webhook) e as linhas PORTO_OAUTH_URL, PORTO_API_BASE_URL e MAIL_FROM_EMAIL do
# /porto-hub/<env>/config.
#
#   infra/scripts/migrate-api-env.sh <dev|prod>
#
# Roda ANTES do update de stack que apaga os dois segredos e o parâmetro antigo.
# O JWT_SECRET vem igual, e não novo: trocá-lo derrubaria a sessão de todo
# afiliado e operador logado. Nenhum valor passa pela tela nem por argv.
#
# Some do repositório quando dev e prod tiverem migrado.
set -euo pipefail

ENVIRONMENT="${1:-}"
case "${ENVIRONMENT}" in
  # Cada ambiente na sua região, como as stacks.
  dev) AWS_REGION="${AWS_REGION:-us-east-1}" ;;
  prod) AWS_REGION="${AWS_REGION:-ca-central-1}" ;;
  *)
    echo "uso: infra/scripts/migrate-api-env.sh <dev|prod>" >&2
    exit 1
    ;;
esac

LEGACY_PARAM="/porto-hub/${ENVIRONMENT}/config"
API_ENV_PARAM="/porto-hub/${ENVIRONMENT}/api-env"

# `mktemp -d` nasce 0700, e o trap apaga tudo até quando um passo falha.
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

# Sobrescrever apagaria o que alguém já digitou no console. Existindo, a
# migração já foi feita, ou o parâmetro nasceu à mão — nos dois casos não há o
# que copiar.
if aws ssm get-parameter --name "${API_ENV_PARAM}" --region "${AWS_REGION}" > /dev/null 2>&1; then
  echo "FALHA: ${API_ENV_PARAM} já existe. Confira-o no console do Parameter Store." >&2
  exit 1
fi

if ! ( umask 077
  aws ssm get-parameter --name "${LEGACY_PARAM}" --region "${AWS_REGION}" \
    --query Parameter.Value --output text > "${WORK_DIR}/legacy.env"
); then
  echo "FALHA: ${LEGACY_PARAM} não existe — a stack já foi atualizada, e os segredos antigos estão na janela de recuperação (aws secretsmanager restore-secret)." >&2
  exit 1
fi

app_arn="$(sed -n 's/^APP_SECRET_ARN=//p' "${WORK_DIR}/legacy.env")"
porto_arn="$(sed -n 's/^PORTO_SECRET_ARN=//p' "${WORK_DIR}/legacy.env")"
if [ -z "${app_arn}" ] || [ -z "${porto_arn}" ]; then
  echo "FALHA: ${LEGACY_PARAM} não tem APP_SECRET_ARN e PORTO_SECRET_ARN." >&2
  exit 1
fi

( umask 077
  aws secretsmanager get-secret-value --secret-id "${app_arn}" --region "${AWS_REGION}" \
    --query SecretString --output text > "${WORK_DIR}/app.json"
  aws secretsmanager get-secret-value --secret-id "${porto_arn}" --region "${AWS_REGION}" \
    --query SecretString --output text > "${WORK_DIR}/porto.json"

  # REPLACE_ME e vazio ficam de fora: chave ausente já quer dizer "não
  # preenchido", e o deploy diz qual obrigatória falta.
  python3 -c 'import json, sys
work = sys.argv[1]
config = dict(
    line.split("=", 1) for line in open(work + "/legacy.env").read().splitlines() if "=" in line
)
app = json.load(open(work + "/app.json"))
porto = json.load(open(work + "/porto.json"))
values = {
    "JWT_SECRET": app.get("jwt_secret", ""),
    "PORTO_CLIENT_ID": porto.get("client_id", ""),
    "PORTO_CLIENT_SECRET": porto.get("client_secret", ""),
    "PORTO_OAUTH_URL": config.get("PORTO_OAUTH_URL", ""),
    "PORTO_API_BASE_URL": config.get("PORTO_API_BASE_URL", ""),
    "MAIL_FROM_EMAIL": config.get("MAIL_FROM_EMAIL", ""),
    "RESEND_API_KEY": app.get("resend_api_key", ""),
    "PORTO_WEBHOOK_SECRET": porto.get("webhook_secret", ""),
}
kept = {k: v for k, v in values.items() if v not in ("", "REPLACE_ME")}
with open(work + "/api-env.txt", "w") as f:
    f.write("".join("%s=%s\n" % kv for kv in kept.items()))
print("chaves: " + " ".join(kept), file=sys.stderr)
missing = [k for k in values if k not in kept]
if missing:
    print("sem valor, grave no console se precisar: " + " ".join(missing), file=sys.stderr)' \
    "${WORK_DIR}"
)

# Do arquivo, e não de argv: o AWS CLI lê `file://` em qualquer parâmetro.
# Sem --overwrite: se alguém criou o parâmetro nesse meio-tempo, falha em vez
# de apagá-lo.
aws ssm put-parameter --name "${API_ENV_PARAM}" --type SecureString \
  --description "Variaveis da API definidas a mao - fora da stack" \
  --value "file://${WORK_DIR}/api-env.txt" --region "${AWS_REGION}" > /dev/null

echo "criado ${API_ENV_PARAM} (SecureString) em ${AWS_REGION}." >&2
