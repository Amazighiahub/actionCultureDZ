# Analyse de l'existant — EventCulture (Production & Docker)

**Date** : 12 mars 2026  
**Objectif** : Inventorier ce qui existe avant de proposer un plan d'action pour la mise en production.

---

## 1. Architecture Docker

### 1.1 Fichiers présents

| Fichier | Rôle | État |
|---------|------|------|
| `docker-compose.yml` | Développement local | ✅ Complet |
| `docker-compose.prod.yml` | Production | ✅ Complet |
| `backend/Dockerfile` | Image backend | ✅ Multi-stage (deps → production) |
| `frontEnd/Dockerfile` | Image frontend | ✅ Multi-stage (deps → builder → nginx) |
| `.env.example` | Modèle de configuration | ✅ Documenté |
| `Makefile` | Commandes setup/seed | ✅ Bash uniquement (pas Windows natif) |

### 1.2 Docker — Développement (`docker-compose.yml`)

**Services :**
- **backend** : Node 20, port 3001, `env_file: .env`, `DB_HOST=mysql`, `REDIS_HOST=redis`
- **frontend** : Build Vite → Nginx, port 3000, `VITE_API_URL` en build-arg
- **mysql** : MySQL 8.0, port 3306 (127.0.0.1), healthcheck
- **redis** : Redis 7, non exposé (réseau interne)

**Volumes :** `mysql_data`, `redis_data`, `backend_uploads`, `backend_logs`

**Dépendances :** mysql et redis doivent être healthy avant le backend.

### 1.3 Docker — Production (`docker-compose.prod.yml`)

**Services :**
- **nginx** : Reverse proxy, ports 80/443, SSL, rate limiting
- **backend** : `target: production`, expose 3001 (pas de port public)
- **frontend** : Build → volume `frontend_build` servi par nginx
- **mysql** : Port non exposé (sécurité)
- **redis** : Port non exposé
- **certbot** : Renouvellement SSL Let's Encrypt

**Variables requises :** `JWT_SECRET`, `DB_*`, `FRONTEND_URL`, `VITE_API_URL`, `API_URL`, etc.

---

## 2. Configuration Nginx

### 2.1 Fichiers

| Fichier | Usage | État |
|---------|-------|------|
| `nginx/prod.conf` | Production (SSL, 2 blocs serveur) | ✅ actionculture.dz / api.actionculture.dz |
| `nginx/initial.conf` | HTTP temporaire (premier déploiement) | ✅ Référencé par deploy.sh |
| `frontEnd/nginx.conf` | Nginx **dans** le conteneur frontend | ✅ SPA fallback, gzip, headers |

### 2.2 Points d'attention

- `prod.conf` suppose un certificat déjà présent dans `/etc/letsencrypt/`.
- Domaine figé : `actionculture.dz` (à adapter selon l’hébergement).
- Rate limit login : regex `^/api/(auth|login|register)` ne matche pas `/api/users/login` (chemin réel).

---

## 3. Base de données

### 3.1 Création des tables

- **Dev (Makefile)** : `DB_SYNC=true` → Sequelize crée les tables au démarrage.
- **Production** : Aucune migration automatique dans `deploy.sh` ni dans les Dockerfiles.

### 3.2 Migrations

**Présentes :**
- `20241126-correction-incoherences-patrimoine.js`
- `20250116-add-type-patrimoine.js`
- `20250119-add-performance-indexes.js`
- `20260119-add-soumission-config.js`
- `20260121-add-services-professional-fields.js`
- `20260220-add-event-virtual-fields.js`
- `20260312-merge-statut-validation.js`

**Commande backend :** `npm run db:migrate` (Sequelize)

### 3.3 Données de référence

**Deux mécanismes :**

| Méthode | Fichier / script | Usage |
|---------|------------------|--------|
| SQL | `backend/database/seeds/seed-reference-data.sql` | Makefile / `run-seeds-mysql.sh` |
| Node | `scripts/seed-geography.js`, `seed-data-reference.js`, `seed-all-data.js` | `deploy.sh --seed` |

Risque de doublons ou d’incohérences entre les deux approches.

### 3.4 Users pour Cypress

Les E2E Cypress supposent :
- `admin@actionculture.dz` / `AdminTest123!@#`
- `m.benali@test.dz` / `ProTest123!@#`
- `f.saidi@test.com` / `VisitorTest123!@#`

**Source :** `seed-reference-data.sql` crée ces utilisateurs (lignes 1318-1321), mais avec des mots de passe différents :
- Docs / seed-data-reference.js : `admin123`, `password123`
- Cypress : `AdminTest123!@#`, `ProTest123!@#`, `VisitorTest123!@#`

**Incohérence critique :** Les hash bcrypt dans seed-reference-data.sql correspondent à `admin123` / `password123`, pas aux mots de passe Cypress. Les tests E2E échoueront à la connexion sauf alignement.

---

## 4. Tests

### 4.1 Backend (Jest)

| Élément | Valeur |
|---------|--------|
| Framework | Jest |
| Config | `jest.config.js` |
| Setup | `tests/setup.js` (mock logger, `NODE_ENV=test`, `JWT_SECRET`) |
| DB | `DB_NAME=actionculture_test` — les tests unitaires mockent, pas de MySQL requis |
| Fichiers | `authMiddleware`, `errorMiddleware`, `validationMiddleware`, `rateLimitMiddleware`, `userRepository`, `oeuvreController`, `oeuvre` model |
| Commande | `npm test` / `npm test -- --passWithNoTests` |

### 4.2 Frontend

| Type | Outil | Commande |
|------|-------|----------|
| Unit | Vitest | `npm test` |
| E2E | Cypress | `npm run e2e` |

### 4.3 Cypress E2E

| Paramètre | Valeur |
|-----------|--------|
| Base URL | `http://localhost:3000` |
| API URL | `http://localhost:3001/api` |
| Specs | 17 fichiers (01 à 17-formulaires) |
| Env | Emails / mots de passe pour admin, pro, visiteur |

**Prérequis :** frontend et backend doivent tourner (Docker ou `npm start` / `npm run dev`).

### 4.4 CI/CD

**Fichier :** `.github/workflows/deploy.yml`

**Jobs :**
1. **quality-gates** : lint backend + frontend, tests backend, build frontend, `npm audit`
2. **deploy-production** : sur `main` → SSH + `./scripts/deploy.sh`
3. **deploy-staging** : sur `develop` → SSH + `./scripts/deploy.sh`

**Non couvert par CI :**
- Tests E2E Cypress
- Tests unitaires frontend (Vitest)
- Tests Docker (build / run)

---

## 5. Scripts de déploiement

### 5.1 `scripts/deploy.sh`

| Option | Action |
|--------|--------|
| `--init` | Premier déploiement (build + up) |
| (sans option) | Mise à jour (backup, pull, build, restart) |
| `--ssl DOMAINE` | Certificat Let's Encrypt |
| `--seed` | Exécution des seeds Node (géographie, référence, all) |
| `--backup` | Dump MySQL |
| `--logs` | Logs des services |
| `--status` | Vérifications de santé |
| `--down` | Arrêt des services |

### 5.2 Makefile

| Cible | Action |
|-------|--------|
| `setup` | `.env` + `DB_SYNC=true`, `docker compose up`, seeds SQL, `DB_SYNC=false` |
| `up` | `docker compose up -d` |
| `down` | `docker compose down` |
| `seed` | Exécution de `run-seeds-mysql.sh` |
| `reset` | Down + suppression volumes + setup |

**Limitation :** Bash / Make → pas utilisable directement sur Windows (hors WSL / Git Bash).

---

## 6. Variables d'environnement

### 6.1 Obligatoires (production)

D’après `deploy.sh` et `docker-compose.prod.yml` :
- `MYSQL_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` (≥ 32 caractères)
- `FRONTEND_URL`, `VITE_API_URL`, `API_URL`
- `EMAIL_*` pour l’envoi d’emails

### 6.2 Validation

- `backend/config/database.js` : vérifications strictes en production (mot de passe, complexité).
- `envValidator.js` : validation au démarrage.

---

## 7. Problèmes et lacunes identifiés

### 7.1 Critiques

| # | Problème | Impact |
|---|----------|--------|
| 1 | Pas de migrations dans le déploiement | Schéma DB potentiellement obsolète en prod |
| 2 | Deux systèmes de seeds (SQL vs Node) | Risque de conflits, données incomplètes |
| 3 | Users Cypress non seedés automatiquement | E2E impossibles sans création manuelle |
| 4 | `docker-compose.prod.yml` sans `env_file` | Dépendance implicite à `.env` à la racine |

### 7.2 Moyens

| # | Problème | Impact |
|---|----------|--------|
| 5 | Makefile / scripts Bash | Pas d’équivalent PowerShell pour Windows |
| 6 | Pas d’E2E dans la CI | Régressions non détectées avant déploiement |
| 7 | Rate limit login (Nginx) | Chemins API réels différents du regex |
| 8 | Domaine codé en dur | À adapter pour chaque environnement |

### 7.3 Non vérifiés

| # | Élément | Statut |
|---|---------|--------|
| 9 | Build Docker complet | Jamais exécuté de bout en bout |
| 10 | Seeds Node (`seed-geography.js`, etc.) | Dépendances (ex. `algeria_cities.json`) non validées |
| 11 | Certificats SSL + Certbot | Workflow non testé |
| 12 | Compatibilité `.env` / prod | Chargement et override non vérifiés |

---

## 8. Synthèse

### 8.1 Ce qui est en place

- Docker dev et prod avec services attendus
- Nginx configuré (prod + frontend)
- Scripts de déploiement
- CI/CD (lint, tests backend, build)
- Migrations Sequelize et seeds SQL / Node
- Tests unitaires backend et E2E Cypress
- Documentation (guides, checklists, audits)

### 8.2 Ce qui manque ou pose problème

- Unification des seeds (SQL vs Node) et users de test
- Migrations dans le pipeline de déploiement
- E2E Cypress dans la CI
- Scripts Windows (PowerShell) pour setup / seed
- Vérification du flux complet Docker + seeds + E2E
- Script ou procédure pour créer les users Cypress

### 8.3 Recommandation

Avant de proposer un plan d’action détaillé, il est souhaitable de :

1. **Valider le flux Docker** : `docker compose up -d --build`, healthchecks, accès frontend/API
2. **Clarifier la stratégie de seeds** : SQL uniquement, Node uniquement, ou coexistence documentée
3. **Tester les migrations** : `npm run db:migrate` sur une base vide
4. **Exécuter les tests** : backend (`npm test`), build frontend, E2E avec stack Docker

---

*Document préparatoire à l’élaboration du plan d’action de mise en production.*
