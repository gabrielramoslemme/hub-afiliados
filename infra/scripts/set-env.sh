#!/usr/bin/env bash
#
# Grava, lista e remove chaves do /porto-hub/<env>/api-env, o segredo com tudo o
# que uma pessoa define para a API: JWT_SECRET, credenciais da Porto, chave do
# Resend, remetente. Cada chave é o nome da variável de ambiente, e o
# install-release.sh copia todas para o api.env sem precisar conhecê-las.
#
#   infra/scripts/set-env.sh <dev|prod> --list
#   infra/scripts/set-env.sh <dev|prod> CHAVE [CHAVE...]
#   infra/scripts/set-env.sh <dev|prod> --unset CHAVE [CHAVE...]
#   infra/scripts/set-env.sh <dev|prod> --import-legacy
#
# O valor nunca vai como argumento: argv aparece em `ps` e fica no histórico do
# shell. Com terminal, ele é pedido sem eco; sem terminal, sai da entrada padrão,
# uma linha por chave, na ordem em que as chaves foram passadas.
#
# A stack não gerencia este segredo, e é isso que o protege: update nenhum
# regrava o que foi digitado aqui. O primeiro `set` o cria. O valor só chega à
# API no próximo deploy.
set -euo pipefail

usage() {
  sed -n '8,11p' "$0" | sed 's/^# //' >&2
  exit 1
}

ENVIRONMENT="${1:-}"
case "${ENVIRONMENT}" in
  # Cada ambiente na sua região, como as stacks: dev em us-east-1, prod em
  # ca-central-1.
  dev) AWS_REGION="${AWS_REGION:-us-east-1}" ;;
  prod) AWS_REGION="${AWS_REGION:-ca-central-1}" ;;
  *) usage ;;
esac
shift
[ $# -gt 0 ] || usage

SECRET_ID="/porto-hub/${ENVIRONMENT}/api-env"

# As mesmas do STACK_OWNED_KEYS do install-release.sh: o deploy as escreve a
# partir da stack, e o deploy recusa o api-env que as repete.
STACK_OWNED_KEYS="NODE_ENV PORT DATABASE_URL DATABASE_SSL APP_BASE_URL"

# `mktemp -d` já nasce 0700. O JSON inteiro do segredo passa por aqui, e o trap
# o apaga até quando o put falha.
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

# Toda a manipulação do JSON. Os valores chegam pela entrada padrão, separados
# por NUL, e nunca pela linha de comando.
# shellcheck disable=SC2016 # é Python: nada aqui é para o bash expandir
MERGE_PY='import json, re, sys

mode, current_path, next_path, reserved = sys.argv[1:5]
reserved = set(reserved.split())
env = json.load(open(current_path))


def problem(key, value):
    if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
        return "não é nome de variável"
    if key in reserved:
        return "é escrita pelo deploy a partir da stack"
    # Aspas simples e barra invertida quebrariam o env_file, que o deploy
    # escreve entre aspas simples para o compose não interpolar `$`.
    if any(c in value for c in "\n\x27\\"):
        return "tem quebra de linha, aspas simples ou barra invertida"
    if key == "JWT_SECRET" and len(value) < 32:
        return "precisa de pelo menos 32 caracteres - gere com: openssl rand -base64 48"
    return None


if mode == "list":
    for key in sorted(env):
        print("%s%s" % (key, "  (vazio)" if env[key] == "" else ""))
    sys.exit(0)

if mode == "set":
    fields = sys.stdin.buffer.read().decode().split("\0")[:-1]
    updates = dict(zip(fields[::2], fields[1::2]))
    errors = ["%s %s" % (k, problem(k, v)) for k, v in updates.items() if problem(k, v)]
    if errors:
        sys.exit("FALHA:\n  " + "\n  ".join(errors))
    env.update(updates)
    print("a gravar: " + " ".join(sorted(updates)), file=sys.stderr)

if mode == "unset":
    keys = sys.argv[5:]
    missing = [k for k in keys if k not in env]
    if missing:
        sys.exit("FALHA: não existem no segredo: " + " ".join(missing))
    for key in keys:
        del env[key]
    print("removidas: " + " ".join(keys), file=sys.stderr)

if mode == "import-legacy":
    legacy = json.load(sys.stdin)
    added = {k: v for k, v in legacy.items() if k not in env}
    kept = sorted(k for k in legacy if k in env)
    env.update(added)
    print("importadas: " + (" ".join(sorted(added)) or "nenhuma"), file=sys.stderr)
    if kept:
        print("já existiam, mantidas: " + " ".join(kept), file=sys.stderr)

with open(next_path, "w") as f:
    json.dump(env, f)
'

secret_exists() {
  aws secretsmanager describe-secret --secret-id "${SECRET_ID}" \
    --region "${AWS_REGION}" > /dev/null 2>&1
}

read_current() {
  ( umask 077
    if secret_exists; then
      aws secretsmanager get-secret-value --secret-id "${SECRET_ID}" \
        --region "${AWS_REGION}" --query SecretString --output text \
        > "${WORK_DIR}/current.json"
    else
      echo '{}' > "${WORK_DIR}/current.json"
    fi
  )
}

merge() {
  local mode="$1"
  shift
  ( umask 077
    python3 -c "${MERGE_PY}" "${mode}" "${WORK_DIR}/current.json" "${WORK_DIR}/next.json" \
      "${STACK_OWNED_KEYS}" "$@"
  )
}

save() {
  if secret_exists; then
    aws secretsmanager put-secret-value --secret-id "${SECRET_ID}" \
      --region "${AWS_REGION}" --secret-string "file://${WORK_DIR}/next.json" > /dev/null
  else
    # Sem "Hub de Afiliados" na descrição, ao contrário dos segredos da stack:
    # é por ela que o comando de limpeza do README os acha, e este tem que
    # sobreviver à stack.
    aws secretsmanager create-secret --name "${SECRET_ID}" \
      --region "${AWS_REGION}" \
      --description "Variaveis da API definidas a mao - mantido por infra/scripts/set-env.sh, fora da stack" \
      --secret-string "file://${WORK_DIR}/next.json" > /dev/null
    echo "criado ${SECRET_ID} em ${AWS_REGION}" >&2
  fi
  echo "Vale a partir do próximo deploy." >&2
}

# Lê os segredos que o api-env substituiu e copia o que havia neles. Roda uma
# vez por ambiente, ANTES do update de stack que apaga o AppSecret e o
# PortoSecret. O JWT_SECRET vem igual, e não novo: trocá-lo derrubaria a sessão
# de todo afiliado e operador logado. O que já existe no api-env não é tocado.
#
# Some deste script quando dev e prod tiverem migrado.
import_legacy() {
  local legacy_param="/porto-hub/${ENVIRONMENT}/config"

  if ! ( umask 077
    aws ssm get-parameter --name "${legacy_param}" --region "${AWS_REGION}" \
      --query Parameter.Value --output text > "${WORK_DIR}/legacy.env"
  ); then
    echo "FALHA: ${legacy_param} não existe - a stack já foi atualizada, ou o ambiente nunca teve o formato antigo." >&2
    exit 1
  fi

  local app_arn porto_arn
  app_arn="$(sed -n 's/^APP_SECRET_ARN=//p' "${WORK_DIR}/legacy.env")"
  porto_arn="$(sed -n 's/^PORTO_SECRET_ARN=//p' "${WORK_DIR}/legacy.env")"
  if [ -z "${app_arn}" ] || [ -z "${porto_arn}" ]; then
    echo "FALHA: ${legacy_param} não tem APP_SECRET_ARN e PORTO_SECRET_ARN." >&2
    exit 1
  fi

  ( umask 077
    aws secretsmanager get-secret-value --secret-id "${app_arn}" --region "${AWS_REGION}" \
      --query SecretString --output text > "${WORK_DIR}/app.json"
    aws secretsmanager get-secret-value --secret-id "${porto_arn}" --region "${AWS_REGION}" \
      --query SecretString --output text > "${WORK_DIR}/porto.json"
  )

  # REPLACE_ME e vazio ficam de fora: no api-env, chave ausente já quer dizer
  # "não preenchido", e o deploy diz qual obrigatória falta.
  python3 -c 'import json, sys
work = sys.argv[1]
config = dict(
    line.split("=", 1) for line in open(work + "/legacy.env").read().splitlines() if "=" in line
)
app = json.load(open(work + "/app.json"))
porto = json.load(open(work + "/porto.json"))
legacy = {
    "JWT_SECRET": app.get("jwt_secret", ""),
    "RESEND_API_KEY": app.get("resend_api_key", ""),
    "PORTO_CLIENT_ID": porto.get("client_id", ""),
    "PORTO_CLIENT_SECRET": porto.get("client_secret", ""),
    "PORTO_WEBHOOK_SECRET": porto.get("webhook_secret", ""),
    "PORTO_OAUTH_URL": config.get("PORTO_OAUTH_URL", ""),
    "PORTO_API_BASE_URL": config.get("PORTO_API_BASE_URL", ""),
    "MAIL_FROM_EMAIL": config.get("MAIL_FROM_EMAIL", ""),
}
json.dump({k: v for k, v in legacy.items() if v not in ("", "REPLACE_ME")}, sys.stdout)' \
    "${WORK_DIR}" | merge import-legacy
}

case "$1" in
  --list)
    read_current
    merge list
    ;;
  --unset)
    shift
    [ $# -gt 0 ] || usage
    read_current
    merge unset "$@"
    save
    ;;
  --import-legacy)
    read_current
    import_legacy
    save
    ;;
  -*)
    usage
    ;;
  *)
    read_current
    # Todos os valores antes do merge: faltando um, nada é gravado.
    ( umask 077 && : > "${WORK_DIR}/values" )
    for key in "$@"; do
      if [ -t 0 ]; then
        IFS= read -rs -p "${key}: " value < /dev/tty
        echo >&2
      elif ! IFS= read -r value; then
        echo "FALHA: faltou o valor de ${key} na entrada padrão. Nada foi gravado." >&2
        exit 1
      fi
      # `printf` é builtin: o valor vai para o arquivo sem passar por argv.
      printf '%s\0%s\0' "${key}" "${value}" >> "${WORK_DIR}/values"
    done
    merge set < "${WORK_DIR}/values"
    save
    ;;
esac
