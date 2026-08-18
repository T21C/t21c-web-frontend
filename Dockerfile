# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
WORKDIR /app
# sentry-cli needs a CA bundle for HTTPS (slim image has none by default)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY eslint-plugin-tuf ./eslint-plugin-tuf
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
# Secret mounts are not part of the layer cache key. Hash the env file in CI and
# pass it here so Vite rebuilds when VITE_* vars / FRONTEND_BUILD_ENV change.
ARG FRONTEND_ENV_HASH
RUN --mount=type=secret,id=frontend_env,target=/app/.env.production,required=true \
    : "${FRONTEND_ENV_HASH:?FRONTEND_ENV_HASH build-arg is required}" \
    && npm run build:prod

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
