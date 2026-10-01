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
  # A região é a do ambiente, e um AWS_REGION exportado no shell NÃO ganha: com
  # ele apontando para outro lugar, o parâmetro antigo "não existiria", e quem
  # lê poderia concluir que a stack já foi atualizada e executar o change set
  # que apaga os segredos antes de migrá-los.
  dev) AWS_REGION=us-east-1 ;;
  prod) AWS_REGION=ca-central-1 ;;
  *)
    echo "uso: infra/scripts/migrate-api-env.sh <dev|prod>" >&2
    exit 1
    ;;
esac

LEGACY_PARAM="/porto-hub/${ENVIRONMENT}/config"
API_ENV_PARAM="/porto-hub/${ENVIRONMENT}/api-env"

echo "${ENVIRONMENT} em ${AWS_REGION}" >&2

# `mktemp -d` nasce 0700, e o trap apaga tudo até quando um passo falha.
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

# Grava o valor do parâmetro no arquivo do segundo argumento. Devolve 2 só
# quando ele não existe; qualquer outro erro da AWS (credencial vencida,
# AccessDenied, throttling) sai inteiro no stderr, e não vira "não existe".
get_param() {
  local err
  if err="$(aws ssm get-parameter --name "$1" --region "${AWS_REGION}" \
    --query Parameter.Value --output text 2>&1 > "$2")"; then
    return 0
  fi
  case "${err}" in
    *ParameterNotFound*) return 2 ;;
  esac
  echo "${err}" >&2
  return 1
}

# Sobrescrever apagaria o que alguém já digitou no console. Existindo, a
# migração já foi feita, ou o parâmetro nasceu à mão — nos dois casos não há o
# que copiar.
rc=0
get_param "${API_ENV_PARAM}" /dev/null || rc=$?
case "${rc}" in
  0)
    echo "FALHA: ${API_ENV_PARAM} já existe. Confira-o no console do Parameter Store." >&2
    exit 1
    ;;
  2) ;;
  *)
    echo "FALHA: não consegui conferir se ${API_ENV_PARAM} existe (erro da AWS acima). Nada foi feito." >&2
    exit 1
    ;;
esac

rc=0
( umask 077 && get_param "${LEGACY_PARAM}" "${WORK_DIR}/legacy.env" ) || rc=$?
case "${rc}" in
  0) ;;
  2)
    echo "FALHA: ${LEGACY_PARAM} não existe em ${AWS_REGION} — a stack já foi atualizada, e os segredos antigos estão na janela de recuperação (aws secretsmanager restore-secret)." >&2
    exit 1
    ;;
  *)
    echo "FALHA: não consegui ler ${LEGACY_PARAM} (erro da AWS acima). Nada foi feito; NÃO atualize a stack." >&2
    exit 1
    ;;
esac

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
# As mesmas regras do install-release.sh. Gravar um valor que o deploy recusa
# deixaria o ambiente sem deploy depois que o update de stack apagasse os
# segredos de onde ele veio; falhar aqui, antes do put, não apaga nada.
problems = [
    "%s tem aspas ou barra invertida" % k
    for k, v in kept.items() if any(c in v for c in "\x27\"\\\n")
]
if len(kept.get("JWT_SECRET", "")) < 32:
    problems.append("JWT_SECRET tem menos de 32 caracteres")
if problems:
    sys.exit("FALHA, nada foi gravado:\n  " + "\n  ".join(problems))
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
