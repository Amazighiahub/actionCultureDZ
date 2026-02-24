# Backend Action Culture - Node.js API
# Image de base Node.js LTS
FROM node:20-alpine

# Répertoire de travail
WORKDIR /app

# Dépendances système (bcrypt, sharp, etc.) + wget + su-exec pour l'entrypoint
RUN apk add --no-cache python3 make g++ wget su-exec

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installation des dépendances (sans dev pour une image plus légère)
RUN npm ci --omit=dev

# Copier le code source
COPY . .

# Script d'entrée : crée les sous-dossiers uploads et fixe les permissions (volume mount)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Port exposé (doit correspondre à PORT dans .env)
EXPOSE 3001

# Entrypoint en root pour chown, puis CMD exécuté via su-exec node
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
