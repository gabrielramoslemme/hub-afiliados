#!/usr/bin/env bash
#
# Abre o RDS privado em localhost:5433, ou imprime a senha do master com
# `--password`. O banco não tem rota para a internet de propósito: quem entra é
# barrado por IAM, no `ssm:StartSession`, e não por uma senha que circula em
# GUI. Com o túnel de pé, qualquer cliente conecta como se o banco fosse local.
set -euo pipefail

STACK_NAME="${STACK_NAME:-porto-hub-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
LOCAL_PORT="${LOCAL_PORT:-5433}"

# Os nomes dos segredos são gerados pelo CloudFormation, então o ARN sai do
# output da stack — não há nome fixo para adivinhar.
stack_outputs="$(
  aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs' \
    --output json
)"

output_value() {
  python3 -c 'import json,sys;print(next(o["OutputValue"] for o in json.load(sys.stdin) if o["OutputKey"]==sys.argv[1]))' \
    "$1" <<< "${stack_outputs}"
}

if [ "${1:-}" = "--password" ]; then
  aws secretsmanager get-secret-value \
    --secret-id "$(output_value DbSecretArn)" \
    --region "${AWS_REGION}" \
    --query SecretString \
    --output text \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["password"])'
  exit 0
fi

# O plugin não vem junto com o AWS CLI, e sem ele o erro só aparece depois da
# sessão já ter sido aberta do lado da AWS.
if ! command -v session-manager-plugin > /dev/null 2>&1; then
  echo "Falta o session-manager-plugin: brew install --cask session-manager-plugin" >&2
  exit 1
fi

db_host="$(output_value RdsEndpoint)"

cat >&2 <<INFO
Túnel para ${db_host}

  psql -h localhost -p ${LOCAL_PORT} -U porto hub_afiliados
  senha: npm run db:password

Ctrl-C encerra.
INFO

exec aws ssm start-session \
  --target "$(output_value InstanceId)" \
  --region "${AWS_REGION}" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"${db_host}\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}"
