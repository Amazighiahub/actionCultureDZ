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

## Setup complet (première fois)

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Setup complet (conteneurs + tables + seeds)
make setup
```

`make setup` fait tout automatiquement :
1. Active `DB_SYNC=true` pour que Sequelize crée les tables
2. Lance les conteneurs Docker
3. Attend que MySQL et le backend soient prêts
4. Charge les données de référence et de test (`seed-reference-data.sql`)
5. Désactive `DB_SYNC` et redémarre le backend

### URLs

- **Frontend** : http://localhost:3000
- **API backend** : http://localhost:3001/api
- **Santé** : http://localhost:3001/health

### Comptes de test

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@actionculture.dz` | `admin123` | Administrateur |
| `m.benali@test.dz` | `password123` | Professionnel |
| `f.saidi@test.com` | `password123` | Utilisateur |

> **Note** : ces comptes sont créés par les seeds. Ne pas utiliser en production.

## Utilisation quotidienne

```bash
# Démarrer les conteneurs
make up

# Arrêter les conteneurs
make down

# Voir les logs
docker compose logs -f backend
```

## Recharger les seeds (sans recréer les tables)

Si les tables existent déjà mais sont vides :

```bash
make seed
```

## Réinitialiser complètement la base

```bash
docker compose down -v    # Supprime les volumes (données)
make setup                # Recrée tout depuis zéro
```

## Variables d'environnement

Le fichier `.env` à la racine est chargé par `docker-compose` via `env_file`.

### Variables obligatoires

| Variable | Exemple | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `VotreMotDePasse123` | Mot de passe MySQL |
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

### Autres variables utiles

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MYSQL_ROOT_PASSWORD` | `root` | Mot de passe root MySQL |
| `DB_NAME` | `actionculture` | Nom de la base |
| `DB_USER` | `actionculture_user` | Utilisateur MySQL |
| `EMAIL_PAUSED` | `true` | Ne pas envoyer d'emails en dev |

Pour générer un **JWT_SECRET** sécurisé :

```bash
docker exec -it eventculture-backend node scripts/generateSecret.js
```

## Dépannage

### Connexion refusée (login invalide)

Le compte admin n'existe que si les **seeds** ont été exécutés. Vérifiez :

```bash
# Vérifier si l'admin existe en base
docker exec eventculture-mysql mysql -u root -proot actionculture \
  -e "SELECT email, statut FROM user WHERE email='admin@actionculture.dz';"
```

Si aucun résultat : exécutez `make seed`.

### Port déjà utilisé

```bash
docker ps --format '{{.Names}} {{.Ports}}' | grep 3001
docker stop <nom-du-conteneur>
```

### Erreur CORS dans le navigateur

Vérifier que `FRONTEND_URL=http://localhost:3000` dans `.env`, puis :

```bash
docker compose restart backend
```

### Tables inexistantes (erreur seed)

Les tables sont créées par Sequelize au démarrage quand `DB_SYNC=true`. Relancez :

```bash
make setup
```

## Commandes utiles

```bash
make setup       # Setup complet (première fois)
make up          # Démarrer les conteneurs
make down        # Arrêter les conteneurs
make seed        # Recharger les seeds
make build       # Reconstruire les images
make logs        # Voir les logs
make status      # État des conteneurs
```

### Reconstruire un seul service

```bash
docker compose up -d --build --no-deps backend
```

### Shell dans un conteneur

```bash
docker exec -it eventculture-backend sh
```

---

## Build seul (sans compose)

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
