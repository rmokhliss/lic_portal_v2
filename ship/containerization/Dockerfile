# ==============================================================================
# LIC v2 — Dockerfile production multi-stage
# ==============================================================================

# --- Stage 1 : base -----------------------------------------------------------
FROM node:24-alpine AS base

RUN corepack enable && apk add --no-cache libc6-compat

WORKDIR /repo

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1

# --- Stage 2 : deps -----------------------------------------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json ./app/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile

# --- Stage 3 : builder --------------------------------------------------------
FROM base AS builder

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/app/node_modules ./app/node_modules
COPY --from=deps /repo/shared/node_modules ./shared/node_modules

COPY . .

ARG BUILD_SHA=unknown

ARG NODE_ENV=production
ARG APP_URL=http://localhost:3000
ARG PORT=3000

ARG NEXT_PUBLIC_PRODUCT_CODE=LIC
ARG NEXT_PUBLIC_PRODUCT_NAME=Licence Manager
ARG NEXT_PUBLIC_PRODUCT_SUFFIX=PORTAL

ARG DATABASE_URL=postgresql://ci_user:ci_password@localhost:5432/ci_db
ARG DATABASE_POOL_SIZE=10

ARG AUTH_SECRET=ci_auth_secret_123456789012345678901234567890
ARG AUTH_TRUST_HOST=true

ARG APP_MASTER_KEY=ci_app_master_key_123456789012345678901234567890

ARG SMTP_HOST=localhost
ARG SMTP_PORT=587
ARG SMTP_USER=ci-user
ARG SMTP_PASSWORD=ci-password
ARG SMTP_FROM=noreply@s2m.ma
ARG SMTP_SECURE=false

ARG LOG_LEVEL=info
ARG DEFAULT_LOCALE=fr

ARG OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
ARG OTEL_SERVICE_NAME=s2m-lic

ENV BUILD_SHA=$BUILD_SHA
ENV NODE_ENV=$NODE_ENV
ENV APP_URL=$APP_URL
ENV PORT=$PORT

ENV NEXT_PUBLIC_PRODUCT_CODE=$NEXT_PUBLIC_PRODUCT_CODE
ENV NEXT_PUBLIC_PRODUCT_NAME=$NEXT_PUBLIC_PRODUCT_NAME
ENV NEXT_PUBLIC_PRODUCT_SUFFIX=$NEXT_PUBLIC_PRODUCT_SUFFIX

ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_POOL_SIZE=$DATABASE_POOL_SIZE

ENV AUTH_SECRET=$AUTH_SECRET
ENV AUTH_TRUST_HOST=$AUTH_TRUST_HOST

ENV APP_MASTER_KEY=$APP_MASTER_KEY

ENV SMTP_HOST=$SMTP_HOST
ENV SMTP_PORT=$SMTP_PORT
ENV SMTP_USER=$SMTP_USER
ENV SMTP_PASSWORD=$SMTP_PASSWORD
ENV SMTP_FROM=$SMTP_FROM
ENV SMTP_SECURE=$SMTP_SECURE

ENV LOG_LEVEL=$LOG_LEVEL
ENV DEFAULT_LOCALE=$DEFAULT_LOCALE

ENV OTEL_EXPORTER_OTLP_ENDPOINT=$OTEL_EXPORTER_OTLP_ENDPOINT
ENV OTEL_SERVICE_NAME=$OTEL_SERVICE_NAME

RUN pnpm -C app build

# --- Stage 4 : runner-app -----------------------------------------------------
FROM base AS runner-app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

RUN mkdir -p ./public

# Root workspace files needed by pnpm, tsx and TypeScript aliases
COPY --from=builder --chown=nextjs:nodejs /repo/package.json /package.json
COPY --from=builder --chown=nextjs:nodejs /repo/pnpm-lock.yaml /pnpm-lock.yaml
COPY --from=builder --chown=nextjs:nodejs /repo/pnpm-workspace.yaml /pnpm-workspace.yaml
COPY --from=builder --chown=nextjs:nodejs /repo/tsconfig.base.json /tsconfig.base.json

# Root node_modules is required because pnpm creates symlinks from app/node_modules
COPY --from=builder --chown=nextjs:nodejs /repo/node_modules /node_modules

# Next.js runtime files
COPY --from=builder --chown=nextjs:nodejs /repo/app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /repo/app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /repo/app/package.json ./package.json

# Files required for db:migrate, db:seed and runtime scripts
COPY --from=builder --chown=nextjs:nodejs /repo/app/src ./src
COPY --from=builder --chown=nextjs:nodejs /repo/app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /repo/app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /repo/app/drizzle.config.ts ./drizzle.config.ts

# Shared workspace package
COPY --from=builder --chown=nextjs:nodejs /repo/shared ./shared

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "node_modules/next/dist/bin/next", "start"]

# --- Stage 5 : runner-worker --------------------------------------------------
FROM base AS runner-worker

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs -g 1001 && adduser -S worker -u 1001 -G nodejs

WORKDIR /app

# Root workspace files needed by pnpm, tsx and TypeScript aliases
COPY --from=builder --chown=worker:nodejs /repo/package.json /package.json
COPY --from=builder --chown=worker:nodejs /repo/pnpm-lock.yaml /pnpm-lock.yaml
COPY --from=builder --chown=worker:nodejs /repo/pnpm-workspace.yaml /pnpm-workspace.yaml
COPY --from=builder --chown=worker:nodejs /repo/tsconfig.base.json /tsconfig.base.json

# Root node_modules is required because pnpm creates symlinks from app/node_modules
COPY --from=builder --chown=worker:nodejs /repo/node_modules /node_modules

# Worker/runtime source files
COPY --from=builder --chown=worker:nodejs /repo/app/src ./src
COPY --from=builder --chown=worker:nodejs /repo/app/scripts ./scripts
COPY --from=builder --chown=worker:nodejs /repo/app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=worker:nodejs /repo/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=worker:nodejs /repo/app/package.json ./package.json
COPY --from=builder --chown=worker:nodejs /repo/app/node_modules ./node_modules

# Shared workspace package
COPY --from=builder --chown=worker:nodejs /repo/shared ./shared

USER worker

CMD ["node", "--import=tsx/esm", "--conditions=react-server", "src/server/jobs/worker.ts"]