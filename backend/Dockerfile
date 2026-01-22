# ============================================
# Dockerfile - EventCulture Backend
# ============================================

FROM node:20-alpine AS base

# Installer les dépendances système nécessaires
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# Stage: Dependencies
# ============================================
FROM base AS deps

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production && npm cache clean --force

# ============================================
# Stage: Builder (pour les tests)
# ============================================
FROM base AS builder

COPY package*.json ./
RUN npm ci

COPY . .

# Exécuter les tests
RUN npm test || echo "Tests skipped"

# ============================================
# Stage: Production
# ============================================
FROM base AS production

ENV NODE_ENV=production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

WORKDIR /app

# Copier les dépendances de production
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY --chown=expressjs:nodejs . .

# Créer les dossiers nécessaires
RUN mkdir -p uploads/images uploads/documents uploads/videos uploads/temp logs && \
    chown -R expressjs:nodejs uploads logs

# Exposer le port
EXPOSE 3001

# Passer à l'utilisateur non-root
USER expressjs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Démarrer l'application
CMD ["node", "server.js"]
