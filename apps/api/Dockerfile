# syntax=docker/dockerfile:1

# Debian slim, e não Alpine: é a plataforma para a qual o `bcrypt` publica o
# prebuild glibc que vem dentro do próprio pacote. Em musl ele existe também,
# mas glibc é o caminho testado pelo upstream.
FROM node:24-bookworm-slim AS base
WORKDIR /app

# ------------------------------------------------------------- dependências
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/tsconfig/package.json packages/tsconfig/
# `--ignore-scripts`: o `prepare` da raiz builda o `@porto/contracts`, e neste
# ponto só os `package.json` foram copiados — não há fonte para compilar. O
# build de verdade acontece no estágio seguinte.
RUN npm ci --ignore-scripts

# ------------------------------------------------------------------- build
FROM deps AS builder
COPY packages/ packages/
COPY apps/api/ apps/api/
# `@porto/contracts` é consumido compilado; sem este passo o build da API não
# acha os tipos.
RUN npm run build --workspace packages/contracts \
 && npm run build --workspace apps/api

# --------------------------------------------- dependências de produção só
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/tsconfig/package.json packages/tsconfig/
# Sem `--ignore-scripts` o `prepare` da raiz tentaria compilar o
# `@porto/contracts` sem `tsc` (que é devDependency) e o install falharia. Pular
# os scripts também não custa binário: o `bcrypt` publica o prebuild glibc
# dentro do próprio tarball, e o `node-gyp rebuild` dele é só fallback.
RUN npm ci --omit=dev --ignore-scripts --workspace apps/api --include-workspace-root

# ----------------------------------------------------------------- runtime
FROM base AS runner
ENV NODE_ENV=production

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/package.json ./package.json
# `@porto/contracts` no `node_modules` é symlink para cá — sem o alvo, o
# require falha na subida.
COPY --from=builder --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist

# As autoridades do RDS não estão no trust store do Node. Sem o bundle, ligar
# `DATABASE_SSL` só teria duas saídas — recusar toda conexão ou desligar a
# verificação —, e o banco guarda CPF e chave PIX. O caminho é o mesmo que
# `postgres-ssl.ts` assume; mudá-lo aqui exige mudar lá.
COPY --chown=node:node infra/certs/rds-global-bundle.pem /app/certs/rds-global-bundle.pem

USER node
WORKDIR /app/apps/api
EXPOSE 3000

# `fetch` global do Node 24 — a imagem slim não tem curl nem wget, e instalar
# um deles só para o healthcheck engordaria a camada à toa.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]
