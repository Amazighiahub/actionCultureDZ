# Frontend Action Culture - Vite + React (mode développement)
# Dossier frontEnd (camelCase)
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* bun.lockb* ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev"]
