# ==============================================================================
# LIC v2 — Dockerfile production multi-stage (Phase 13.E)
#
# 3 stages :
#   1. base       : Node 24 alpine + pnpm + corepack
#   2. deps       : install workspace deps (cache layer)
#   3. builder    : pnpm build (next.js + bundle)
#   4. runner-app : runtime Next.js (standalone) — image ~180 MB
#   5. runner-worker : runtime worker pg-boss (tsx + node) — image ~200 MB
#
# Build app : `docker build --target runner-app -t lic-app .`
# Build worker : `docker build --target runner-worker -t lic-worker .`
#
# Non-root user (uid 1001) dans les deux runners. Healthcheck Next.js via
# /api/health (Phase 2.A.bis). Worker n'a pas de port HTTP exposé.
# ==============================================================================

# --- Stage 1 : base avec pnpm via corepack -----------------------------------
FROM node:26-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /repo

# Phase 19 — Puppeteer ne télécharge PAS Chromium pendant `pnpm install`.
# La version installée par apk dans le runner-app sera utilisée à la place
# (cf. ENV PUPPETEER_EXECUTABLE_PATH dans runner-app). Évite ~200MB de
# binaires inutiles pendant les stages deps + builder.
ENV PUPPETEER_SKIP_DOWNLOAD=true

# --- Stage 2 : deps (cache layer) --------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json ./app/
COPY shared/package.json ./shared/
RUN pnpm install --frozen-lockfile

# --- Stage 3 : builder (pnpm build) ------------------------------------------
FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/app/node_modules ./app/node_modules
COPY --from=deps /repo/shared/node_modules ./shared/node_modules
COPY . .
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm -C app build

# --- Stage 4 : runner-app (Next.js standalone) -------------------------------
FROM base AS runner-app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Phase 19 — Chromium pour Puppeteer PDF export (R-21 /reports). Alpine
# fournit le binaire via apk au chemin `/usr/bin/chromium`. Les libs
# additionnelles (nss/freetype/harfbuzz/ttf-freefont) sont les dépendances
# minimales pour render des pages HTML simples (assez pour les tableaux
# rapports). Pas de fonts CJK — à compléter si l'export PDF doit afficher
# des caractères non-latin1.
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

# Standalone output (next.config.ts doit avoir output: "standalone" — à vérifier
# Phase 13.E+ ; sans ce flag, fallback : copier .next/, public/, package.json
# et lancer `node node_modules/next/dist/bin/next start`).
COPY --from=builder --chown=nextjs:nodejs /repo/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /repo/app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /repo/app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /repo/app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /repo/shared ./shared

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "node_modules/next/dist/bin/next", "start"]

# --- Stage 5 : runner-worker (pg-boss) ---------------------------------------
FROM base AS runner-worker
ENV NODE_ENV=production
RUN addgroup -S nodejs -g 1001 && adduser -S worker -u 1001 -G nodejs
WORKDIR /app

# Le worker tourne via tsx (pas un build standalone). On embarque les sources
# + node_modules + tsx pour lancer src/server/jobs/worker.ts.
COPY --from=builder --chown=worker:nodejs /repo/app/src ./src
COPY --from=builder --chown=worker:nodejs /repo/app/scripts ./scripts
COPY --from=builder --chown=worker:nodejs /repo/app/tsconfig.json ./
COPY --from=builder --chown=worker:nodejs /repo/app/package.json ./
COPY --from=builder --chown=worker:nodejs /repo/app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /repo/shared ./shared

USER worker
# Pas d'EXPOSE — le worker n'écoute pas en HTTP.
CMD ["node", "--import=tsx/esm", "--conditions=react-server", "src/server/jobs/worker.ts"]
