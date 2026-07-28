# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json ./
COPY eslint-plugin-tuf ./eslint-plugin-tuf
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN --mount=type=secret,id=frontend_env,target=/app/.env.production,required=true \
    npm run build:prod

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
