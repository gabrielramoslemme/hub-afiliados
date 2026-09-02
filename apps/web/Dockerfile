# syntax=docker/dockerfile:1

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
COPY apps/web/ apps/web/
# Nenhum `--build-arg` de URL aqui, de propósito: `API_BASE_URL` é lida em
# runtime pelo servidor do Next, não embutida no bundle. Trocar o endereço da
# API é reiniciar o container, não rebuildar a imagem.
RUN npm run build --workspace packages/contracts \
 && npm run build --workspace apps/web

# ----------------------------------------------------------------- runtime
FROM base AS runner
ENV NODE_ENV=production
# Sem isto o servidor do standalone escuta em localhost e o container fica
# inalcançável de fora dele.
ENV HOSTNAME=0.0.0.0
ENV PORT=3005

# O `standalone` já traz o `node_modules` mínimo que ele mesmo rastreou — não
# há `npm ci` neste estágio. `static` e `public` ficam de fora do rastreamento
# e precisam ser copiados à mão.
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3005

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3005/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
