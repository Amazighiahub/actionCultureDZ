# Démarrer le projet avec Docker

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/install/)

## Lancer toute la stack (frontEnd + backend + MySQL + Redis)

À la racine du projet :

```bash
docker compose up -d
```

Ou en mode attaché (logs dans le terminal) :

```bash
docker compose up --build
```

- **Page web (frontend)** : http://localhost:8080  
- **API backend** : http://localhost:3001  
- **Documentation API** : http://localhost:3001/api  
- **Santé** : http://localhost:3001/health  

MySQL est exposé sur le port **3306** et Redis sur **6379** (pour des outils externes si besoin).

## Migrations et seeds (première fois)

Après le premier démarrage, appliquer les migrations et les seeds dans le conteneur backend :

```bash
# Migrations
docker compose exec backend npx sequelize db:migrate

# Seeds (optionnel)
docker compose exec backend npx sequelize db:seed:all
```

## Variables d'environnement

Les valeurs par défaut sont définies dans `docker-compose.yml` (MySQL, Redis, JWT_SECRET de dev).  
Pour surcharger (ex. en production), créez un fichier `backend/.env` à partir de `backend/.env.example` et décommentez la section `env_file` dans `docker-compose.yml`.

Pour un **JWT_SECRET** sécurisé en production :

```bash
docker compose exec backend node scripts/generateSecret.js
```

Puis définissez la variable `JWT_SECRET` dans votre `.env` ou dans l’environnement du service.

## Arrêter les conteneurs

```bash
docker compose down
```

Pour supprimer aussi les données MySQL :

```bash
docker compose down -v
```

## Build seul (sans compose)

Pour construire uniquement l’image du backend (sans MySQL/Redis) :

```bash
cd backend
docker build -t action-culture-backend .
docker run --rm -p 3001:3001 \
  -e DB_HOST=votre-mysql \
  -e DB_USER=... -e DB_PASSWORD=... -e DB_NAME=actionculture \
  -e JWT_SECRET=votre-secret \
  -e REDIS_HOST=votre-redis \
  action-culture-backend
```
