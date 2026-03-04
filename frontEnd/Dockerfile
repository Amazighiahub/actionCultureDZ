# ============================================
# Dockerfile - EventCulture Frontend
# ============================================
# Multi-stage : deps -> build -> nginx (production)
# Le build React genere des fichiers statiques servis par Nginx
# ============================================

FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============================================
# Stage: Dependencies
# ============================================
FROM base AS deps

COPY package*.json ./
RUN npm ci && npm cache clean --force

# ============================================
# Stage: Builder
# ============================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# L'URL de l'API est injectee au moment du build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:3001/api}

# Build de l'application React -> genere le dossier dist/
RUN npm run build

# ============================================
# Stage: Production (Nginx sert les fichiers statiques)
# ============================================
FROM nginx:alpine AS production

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers buildes depuis le stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
