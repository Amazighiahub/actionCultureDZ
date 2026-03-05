# Démarrer le projet avec Docker

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/install/)
- Le fichier `.env` à la racine du projet (fourni hors Git par l'équipe)

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

Le fichier `.env` à la racine du projet est chargé automatiquement par Docker Compose via la directive `env_file`.

Les variables suivantes sont **surchargées** dans `docker-compose.yml` pour pointer vers les noms des services Docker :

| Variable | Valeur dans Docker | Raison |
|----------|-------------------|--------|
| `NODE_ENV` | `development` | Environnement de dev local |
| `SKIP_PRODUCTION_CHECKS` | `true` | Désactive les checks stricts de sécurité (dev local) |
| `DB_HOST` | `mysql` | Nom du service MySQL dans Docker |
| `REDIS_HOST` | `redis` | Nom du service Redis dans Docker |

> **Attention** : `FRONTEND_URL` dans le `.env` doit correspondre à l'URL réelle du frontend (`http://localhost:3000` et non `https://...`), sinon les requêtes seront bloquées par le CORS.

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
