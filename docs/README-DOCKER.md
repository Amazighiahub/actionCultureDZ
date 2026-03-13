# Guide Docker — EventCulture

Guide complet pour exécuter le projet EventCulture via Docker. Permet de démarrer l'application en quelques minutes, reproductible sur toute machine.

---

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- Le fichier `.env` à la racine du projet (copier depuis `.env.example`)

## Architecture des services

| Service | Conteneur | Port | Description |
|---------|-----------|------|-------------|
| Frontend | eventculture-frontend | 3000 | React + Nginx |
| Backend | eventculture-backend | 3001 | Node.js / Express |
| MySQL | eventculture-mysql | 3306 (localhost) | Base de données |
| Redis | eventculture-redis | 6379 (localhost) | Cache / Rate limiting |

## Lancer toute la stack

À la racine du projet :

```bash
# Mode détaché (en arrière-plan)
docker compose up -d

# Mode attaché (logs dans le terminal)
docker compose up --build
```

> **Important** : avant le premier lancement, vérifiez qu'aucun autre conteneur n'utilise les ports 3000 ou 3001. Vérifiez avec `docker ps` et arrêtez les conteneurs conflictuels avec `docker stop <nom>`.

### URLs

- **Page web (frontend)** : http://localhost:3000
- **API backend** : http://localhost:3001/api
- **Base backend** : http://localhost:3001
- **Santé** : http://localhost:3001/health

## Initialisation de la base de données (première fois)

Les commandes suivantes doivent être exécutées dans un **second terminal** pendant que `docker compose up` tourne.

### Étape 1 — Créer les tables

```bash
docker exec -it eventculture-backend node -e "
const db = require('./models');
(async () => {
  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.sequelize.sync({ force: true });
  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Tables créées');
  process.exit(0);
})();
"
```

### Étape 2 — Charger la géographie (wilayas, daïras, communes)

```bash
docker exec -it eventculture-backend node scripts/seed-geography.js
```

### Étape 3 — Charger les données de test

```bash
docker exec -it eventculture-backend node scripts/seed-all-data.js
```

### Comptes de test

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@actionculture.dz` | `admin123` | Administrateur |
| `m.benali@test.dz` | `password123` | Professionnel |
| `f.saidi@test.com` | `password123` | Utilisateur |

> **Note** : ne pas utiliser ces identifiants en production.

## Variables d'environnement

Le fichier `.env` à la racine est chargé par `docker-compose` via `env_file`. Créer le fichier avec :

```bash
cp .env.example .env
```

### Variables obligatoires

| Variable | Exemple | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `VotreMotDePasse123` | Mot de passe MySQL (utilisateur `actionculture_user`) |
| `JWT_SECRET` | (générer ci-dessous) | Secret JWT (min. 32 caractères) |
| `FRONTEND_URL` | `http://localhost:3000` | URL du frontend (pour CORS) |
| `VITE_API_URL` | `http://localhost:3001/api` | URL API pour le build frontend |

### Variables surchargées par Docker

| Variable | Valeur Docker | Raison |
|----------|---------------|--------|
| `NODE_ENV` | `development` | Environnement dev local |
| `SKIP_PRODUCTION_CHECKS` | `true` | Désactive les checks stricts (dev) |
| `DB_HOST` | `mysql` | Nom du service MySQL |
| `REDIS_HOST` | `redis` | Nom du service Redis |

### Autres variables utiles (optionnel)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MYSQL_ROOT_PASSWORD` | `root` | Mot de passe root MySQL |
| `DB_NAME` | `actionculture` | Nom de la base |
| `DB_USER` | `actionculture_user` | Utilisateur MySQL |
| `EMAIL_PAUSED` | `true` | Ne pas envoyer d'emails en dev |

> **Important** : `FRONTEND_URL` doit être `http://localhost:3000` (Docker) ou `http://localhost:8080` (local Vite), sinon CORS bloque les requêtes.

Pour générer un **JWT_SECRET** sécurisé (production) :

```bash
docker exec -it eventculture-backend node scripts/generateSecret.js
```

## Dépannage

### Port déjà utilisé

```
Bind for 0.0.0.0:3001 failed: port is already allocated
```

Trouver et arrêter le conteneur qui occupe le port :

```bash
docker ps --format '{{.Names}} {{.Ports}}' | grep 3001
docker stop <nom-du-conteneur>
```

### Erreur CORS dans le navigateur

Vérifier que `FRONTEND_URL` dans `.env` correspond à l'URL du frontend :

```
FRONTEND_URL=http://localhost:3000
```

Puis redémarrer le backend : `docker compose restart backend`

### Tables inexistantes (erreur seed)

Si le seed échoue avec "Table doesn't exist", relancer l'étape 1 (création des tables).

### Réinitialiser complètement la base

```bash
docker compose down -v
docker compose up -d
# Puis refaire les étapes 1, 2 et 3 d'initialisation
```

## Arrêter les conteneurs

```bash
# Arrêter sans supprimer les données
docker compose down

# Arrêter et supprimer les volumes (données MySQL, Redis, uploads)
docker compose down -v
```

## Commandes de build et test

### Reconstruire après modification du code

```bash
docker compose up -d --build
```

### Reconstruire un seul service

```bash
docker compose up -d --build --no-deps backend
```

### Voir les logs

```bash
docker compose logs -f              # Tous les services
docker compose logs backend -f     # Backend uniquement
docker compose logs mysql --tail 50
```

### Vérifier l'état des conteneurs

```bash
docker compose ps
```

### Exécuter des commandes dans un conteneur

```bash
# Shell dans le backend
docker exec -it eventculture-backend sh

# Exécuter un script
docker exec -it eventculture-backend node scripts/seed-geography.js
```

---

## Build seul (sans compose)

Pour construire uniquement l'image du backend :

```bash
cd backend
docker build -t action-culture-backend --target production .
docker run --rm -p 3001:3001 \
  -e DB_HOST=votre-mysql \
  -e DB_USER=... -e DB_PASSWORD=... -e DB_NAME=actionculture \
  -e JWT_SECRET=votre-secret \
  -e REDIS_HOST=votre-redis \
  -e SKIP_PRODUCTION_CHECKS=true \
  action-culture-backend
```
