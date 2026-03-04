# ============================================
# Dockerfile - EventCulture Backend
# ============================================
# Multi-stage build : deps -> production
# Securite : utilisateur non-root, pas de secrets dans l'image
# ============================================

FROM node:20-alpine AS base

# Dependances systeme
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# Stage: Dependencies (production uniquement)
# ============================================
FROM base AS deps

COPY package*.json ./

# --omit=dev : exclut les devDependencies (securite + image plus legere)
RUN npm ci --omit=dev && npm cache clean --force

# ============================================
# Stage: Production
# ============================================
FROM base AS production

ENV NODE_ENV=production

# Creer un utilisateur non-root (securite : si l'app est compromise,
# l'attaquant n'a pas les droits root dans le conteneur)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

WORKDIR /app

# Copier les dependances de production depuis le stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source (le .dockerignore exclut .env, node_modules, tests, logs)
COPY --chown=expressjs:nodejs . .

# Creer les dossiers d'upload et de logs avec les bonnes permissions
RUN mkdir -p uploads/images uploads/documents uploads/videos uploads/temp logs && \
    chown -R expressjs:nodejs uploads logs

# Supprimer les fichiers qui ne doivent pas etre dans l'image de production
RUN rm -rf scripts/archives tests __tests__ *.test.js *.spec.js .env .env.* 2>/dev/null || true

EXPOSE 3001

# Passer a l'utilisateur non-root AVANT le CMD
USER expressjs

# Healthcheck : Docker verifie automatiquement que l'app repond
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Demarrer l'application (pas nodemon, pas npm run dev)
CMD ["node", "server.js"]
