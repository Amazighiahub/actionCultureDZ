# ============================================
# Dockerfile - EventCulture Frontend
# ============================================
# Multi-stage : deps -> build -> nginx (production)
# ============================================

FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============================================
# Stage: Dependencies
# ============================================
FROM base AS deps

RUN apk add --no-cache python3 make g++ vips-dev
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ============================================
# Stage: Builder
# ============================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:3001/api}

RUN npm run build

# ============================================
# Stage: Production (Nginx)
# ============================================
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build dans un dossier temporaire (pas le volume)
COPY --from=builder /app/dist /app/dist

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Au démarrage : copier les fichiers frais dans le volume, puis lancer nginx
CMD ["sh", "-c", "cp -r /app/dist/* /usr/share/nginx/html/ && nginx -g 'daemon off;'"]
