# ============================================
# Dockerfile - EventCulture Backend
# ============================================
# Multi-stage build : deps -> production
# Securite : utilisateur non-root, pas de secrets dans l'image
# ============================================

FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# Stage: Dependencies (production uniquement)
# ============================================
FROM base AS deps

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# ============================================
# Stage: Production
# ============================================
FROM base AS production

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY --chown=expressjs:nodejs . .

RUN mkdir -p uploads/images uploads/documents uploads/videos uploads/temp logs && \
    chown -R expressjs:nodejs uploads logs

RUN rm -rf scripts/archives tests __tests__ *.test.js *.spec.js .env .env.* 2>/dev/null || true

EXPOSE 3001

USER expressjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
