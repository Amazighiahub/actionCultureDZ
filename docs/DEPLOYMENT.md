# Guide de Déploiement — EventCulture

## Table des matières

1. [Prérequis](#prérequis)
2. [Configuration de l'environnement (.env)](#configuration-de-lenvironnement)
3. [Développement local (Docker)](#développement-local)
4. [Déploiement production](#déploiement-production)
5. [Configuration SSL (HTTPS)](#configuration-ssl)
6. [Base de données](#base-de-données)
7. [Redis](#redis)
8. [Commandes utiles](#commandes-utiles)
9. [Monitoring et santé](#monitoring-et-santé)
10. [Rollback et récupération](#rollback-et-récupération)

---

## Prérequis

```bash
# Docker (20.10+)
curl -fsSL https://get.docker.com | sh

# Docker Compose (v2)
docker compose version

# Git
git --version

# Node.js 20+ (pour le dev local sans Docker)
node --version
```

---

## Configuration de l'environnement

### Étape 1 : Créer le fichier .env

```bash
cp .env.example .env
```

### Étape 2 : Générer les secrets

```bash
# Générer JWT_SECRET (64 bytes hex = 128 caractères)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer MYSQL_ROOT_PASSWORD (32 caractères)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Générer DB_PASSWORD (32 caractères)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Générer REDIS_PASSWORD (32 caractères)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Étape 3 : Remplir le .env

| Variable | Dev (local) | Production | Description |
|----------|------------|------------|-------------|
| `NODE_ENV` | `development` | `production` | Environnement |
| `MYSQL_ROOT_PASSWORD` | `root` | **Généré (32 chars)** | Mot de passe root MySQL |
| `DB_NAME` | `actionculture` | `actionculture` | Nom de la base |
| `DB_USER` | `actionculture_user` | `actionculture_user` | Utilisateur MySQL |
| `DB_PASSWORD` | `root` | **Généré (32 chars)** | Mot de passe utilisateur |
| `DB_HOST` | `localhost` ou `mysql` | `mysql` | Host (Docker = nom du service) |
| `JWT_SECRET` | n'importe quoi (32+ chars) | **Généré (128 chars)** | Clé de signature JWT |
| `REDIS_PASSWORD` | *(vide ou `redis_dev_password`)* | **Généré (32 chars)** | Mot de passe Redis |
| `FRONTEND_URL` | `http://localhost:8080` | `https://votredomaine.com` | URL du frontend |
| `API_URL` | `http://localhost:3001` | `https://api.votredomaine.com` | URL du backend |
| `VITE_API_URL` | `http://localhost:3001/api` | `https://api.votredomaine.com/api` | URL API pour le frontend |
| `EMAIL_HOST` | `smtp.gmail.com` | Votre SMTP | Serveur email |
| `EMAIL_USER` | *(votre email)* | *(email prod)* | Expéditeur |
| `EMAIL_PASSWORD` | *(app password)* | *(app password)* | Mot de passe SMTP |
| `EMAIL_PAUSED` | `true` | `false` | Désactive l'envoi en dev |

### Différences Dev vs Docker vs Production

```bash
# DEV LOCAL (npm run dev, sans Docker)
DB_HOST=localhost
REDIS_HOST=localhost
FRONTEND_URL=http://localhost:8080
USE_REDIS_MEMORY=true

# DEV DOCKER (docker compose up)
DB_HOST=mysql
REDIS_HOST=redis
FRONTEND_URL=http://localhost:3000
USE_REDIS_MEMORY=false

# PRODUCTION (docker compose -f docker-compose.prod.yml up)
DB_HOST=mysql
REDIS_HOST=redis
FRONTEND_URL=https://votredomaine.com
USE_REDIS_MEMORY=false
NODE_ENV=production
```

---

## Développement local

### Option A : Avec Docker (recommandé)

```bash
# 1. Cloner le repo
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env : DB_HOST=mysql, REDIS_HOST=redis

# 3. Lancer tous les services
docker compose up -d

# 4. Vérifier que tout tourne
docker compose ps

# 5. Peupler la base de données
make seed
# ou : docker compose exec backend node scripts/seed-data-reference.js

# 6. Accéder à l'application
# Frontend : http://localhost:3000
# Backend  : http://localhost:3001
# Health   : http://localhost:3001/health
```

### Option B : Sans Docker

```bash
# 1. Installer MySQL 8.0 et le lancer
# 2. Créer la base de données
mysql -u root -p -e "CREATE DATABASE actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Backend
cd backend
cp ../.env.example .env   # Configurer DB_HOST=localhost
npm install
npm run db:migrate
npm run dev                # Lance Redis in-memory + nodemon

# 4. Frontend (dans un autre terminal)
cd frontEnd
npm install
npm run dev                # Vite sur http://localhost:8080
```

---

## Déploiement production

### Premier déploiement

```bash
# 1. Se connecter au serveur
ssh user@votre-serveur

# 2. Cloner le repo
git clone https://github.com/Amazighiahub/actionCultureDZ.git /home/EventCulture
cd /home/EventCulture

# 3. Configurer l'environnement PRODUCTION
cp .env.example .env
nano .env
# → NODE_ENV=production
# → Générer et remplir TOUS les secrets (voir section ci-dessus)
# → Configurer FRONTEND_URL, API_URL, VITE_API_URL avec votre domaine
# → EMAIL_PAUSED=false + configurer SMTP

# 4. Lancer le déploiement initial
chmod +x scripts/deploy.sh
./scripts/deploy.sh --init

# 5. Peupler la base de données
./scripts/deploy.sh --seed

# 6. Configurer SSL (après avoir pointé le DNS vers le serveur)
./scripts/deploy.sh --ssl votredomaine.com
```

### Mise à jour (déploiements suivants)

```bash
# Une seule commande — fait automatiquement :
# backup DB → git pull → rebuild → restart → migrations → health check
./scripts/deploy.sh
```

### Déploiement via CI/CD (automatique)

Le pipeline GitHub Actions se déclenche automatiquement :

| Branche | Action |
|---------|--------|
| Push sur `develop` | → Deploy staging |
| Push sur `main` | → Deploy production (après tests) |
| Pull Request | → Tests uniquement (lint + test + build) |

Le pipeline exécute : lint → tests → build → backup DB → deploy → health check.

---

## Configuration SSL

```bash
# Prérequis : DNS A record pointant vers l'IP du serveur
# Le script obtient un certificat Let's Encrypt et configure Nginx automatiquement

./scripts/deploy.sh --ssl votredomaine.com

# Vérifie que ça marche :
curl -I https://votredomaine.com
curl https://api.votredomaine.com/health
```

Le renouvellement SSL est **automatique** via le conteneur Certbot (toutes les 12h).

---

## Base de données

### Migrations

```bash
# Via Docker
docker compose exec backend npm run db:migrate

# Via deploy.sh (fait automatiquement à chaque déploiement)
./scripts/deploy.sh
```

### Backup

```bash
# Backup manuel
./scripts/deploy.sh --backup

# Le fichier est sauvé dans : backups/db_YYYY-MM-DD_HH-MM-SS.sql.gz
# Les 30 derniers backups sont conservés automatiquement
```

### Restauration

```bash
# 1. Décompresser le backup
gunzip backups/db_2026-03-14_10-30-00.sql.gz

# 2. Restaurer dans MySQL
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" actionculture < backups/db_2026-03-14_10-30-00.sql
```

### Reset complet (dev uniquement)

```bash
make reset
# Équivalent à : docker compose down -v && make setup
# ⚠️ SUPPRIME toutes les données
```

---

## Redis

### Configuration

| Paramètre | Dev | Production |
|-----------|-----|------------|
| Image | `redis:7-alpine` | `redis:7-alpine` |
| Mémoire max | 256 MB | 128 MB |
| Persistence | AOF (`appendonly yes`) | AOF |
| Password | Optionnel | **Obligatoire** |
| Port exposé | Non (réseau Docker) | Non |
| Eviction policy | `allkeys-lru` | `allkeys-lru` |

### Accéder à Redis

```bash
# CLI Redis via Docker
docker compose exec redis redis-cli -a "$REDIS_PASSWORD"

# Commandes utiles
> PING                      # Test connexion → PONG
> INFO memory               # Utilisation mémoire
> DBSIZE                    # Nombre de clés
> KEYS cache:*              # Voir les clés de cache
> FLUSHDB                   # Vider toutes les clés (dev uniquement !)
> MONITOR                   # Voir les commandes en temps réel
```

### Utilisation dans l'application

| Composant | Usage | Fallback si Redis tombe |
|-----------|-------|------------------------|
| Rate Limiting | Compteurs distribués par IP | In-memory automatique |
| Cache HTTP | Réponses API mises en cache (TTL 60s-7j) | LRU in-memory automatique |
| Job Queue (Bull) | Files d'attente email/notifications | Envoi direct sans queue |
| Health Check | `redis.ping()` dans `/health` | Retourne `not_configured` |

---

## Commandes utiles

### Makefile (dev)

```bash
make setup          # Installation complète (build + seed)
make up             # Démarrer les services
make down           # Arrêter les services
make build          # Reconstruire les images
make logs           # Voir les logs (temps réel)
make seed           # Peupler la base de données
make reset          # Reset complet (⚠️ supprime les données)
make shell-backend  # Shell dans le conteneur backend
make shell-mysql    # Client MySQL interactif
make migrate        # Lancer les migrations
```

### deploy.sh (production)

```bash
./scripts/deploy.sh --init        # Premier déploiement
./scripts/deploy.sh               # Mise à jour
./scripts/deploy.sh --ssl DOMAIN  # Configurer SSL
./scripts/deploy.sh --seed        # Peupler la DB
./scripts/deploy.sh --backup      # Sauvegarder la DB
./scripts/deploy.sh --logs        # Voir les logs
./scripts/deploy.sh --status      # Vérifier la santé
./scripts/deploy.sh --down        # Tout arrêter
```

### Docker direct

```bash
# Voir l'état des services
docker compose ps

# Logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f mysql

# Reconstruire un seul service
docker compose build backend
docker compose up -d backend

# Entrer dans un conteneur
docker compose exec backend sh
docker compose exec mysql mysql -u root -p
```

---

## Monitoring et santé

### Endpoint /health

```bash
curl http://localhost:3001/health | jq
```

Réponse :
```json
{
  "status": "healthy",
  "timestamp": "2026-03-14T12:00:00.000Z",
  "responseTimeMs": 45,
  "checks": {
    "database": true,
    "redis": true
  },
  "uptime": 86400,
  "memory": {
    "rss": "85 MB",
    "heapUsed": "52 MB"
  }
}
```

| Status | Code HTTP | Signification |
|--------|-----------|---------------|
| `healthy` | 200 | Tout fonctionne |
| `degraded` | 503 | DB ou Redis indisponible |

### Docker healthchecks

```bash
# Voir l'état de santé de chaque conteneur
docker compose ps
# La colonne STATUS montre (healthy), (unhealthy), ou (starting)
```

---

## Rollback et récupération

### Rollback du code

```bash
# Voir les derniers déploiements
git log --oneline -10

# Revenir à un commit précis
git checkout <commit-hash>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Restaurer la base de données

```bash
# Lister les backups disponibles
ls -la backups/

# Restaurer
gunzip backups/db_YYYY-MM-DD_HH-MM-SS.sql.gz
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" actionculture < backups/db_YYYY-MM-DD_HH-MM-SS.sql
```

### En cas d'urgence

```bash
# 1. Vérifier ce qui ne va pas
./scripts/deploy.sh --status
docker compose logs --tail=50 backend

# 2. Redémarrer un service spécifique
docker compose restart backend

# 3. Redémarrer tout
docker compose down && docker compose up -d

# 4. Rollback complet (code + DB)
git checkout <dernier-commit-stable>
# Restaurer le backup DB correspondant
./scripts/deploy.sh --init
```
