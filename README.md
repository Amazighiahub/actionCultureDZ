# EventCulture — Plateforme de Patrimoine Culturel Algérien

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)
[![MySQL](https://img.shields.io/badge/MySQL-8+-orange.svg)](https://www.mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com)

**EventCulture** (Action Culture DZ) est une plateforme web complète de valorisation du patrimoine culturel algérien : sites patrimoniaux, événements, œuvres, artisanat, services et parcours intelligents, avec support multilingue (Français, Arabe, Anglais, Tamazight Latin et Tifinagh).

---

## 🚀 Démarrage rapide

### Option A : Docker (recommandé)

```bash
# 1. Cloner et configurer
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ
cp .env.example .env
# Éditer .env : DB_PASSWORD, JWT_SECRET, FRONTEND_URL=http://localhost:3000

# 2. Lancer toute la stack
docker compose up -d --build

# 3. Initialiser la base (première fois)
docker exec -it eventculture-backend node scripts/seed-geography.js
docker exec -it eventculture-backend node scripts/seed-all-data.js
```

**URLs** : Frontend http://localhost:3000 | API http://localhost:3001/api | Santé http://localhost:3001/health

➡️ **Guide Docker détaillé** : [docs/README-DOCKER.md](docs/README-DOCKER.md)

---

### Option B : Installation locale (sans Docker)

```bash
# 1. Prérequis : Node.js 18+, MySQL 8+, Redis (optionnel)
# 2. Cloner et installer
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ

# Backend
cd backend && npm install && cp .env.example .env
node scripts/generateSecret.js  # copier le secret dans .env

# Frontend
cd ../frontEnd && npm install && cp .env.example .env

# 3. Créer la base MySQL
mysql -u root -p -e "CREATE DATABASE actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Démarrer (2 terminaux)
# Terminal 1 : cd backend && npm run dev
# Terminal 2 : cd frontEnd && npm run dev
```

**URLs** : Frontend http://localhost:8080 | API http://localhost:3001/api

➡️ **Guide local détaillé** : [docs/README_LOCAL_DEV.md](docs/README_LOCAL_DEV.md)

---

## 📋 Architecture des services

| Service    | Port | Description                    |
|------------|------|--------------------------------|
| Frontend   | 3000 (Docker) / 8080 (local) | React + Vite / Nginx |
| Backend API| 3001 | Node.js + Express              |
| MySQL      | 3306 | Base de données                |
| Redis      | 6379 | Cache et rate limiting         |

---

## 🛠 Technologies

| Couche    | Stack                                           |
|-----------|--------------------------------------------------|
| Backend   | Node.js, Express, Sequelize, MySQL, JWT, Redis   |
| Frontend  | React 18, TypeScript, Vite, Tailwind, React Query, i18next |
| DevOps    | Docker, Docker Compose                          |

---

## 📁 Structure du projet

```
EventCulture/
├── backend/          # API Node.js
│   ├── controllers/  # Logique métier
│   ├── services/     # Services métier (pattern Service/Repository)
│   ├── routes/       # Routes API
│   ├── models/       # Modèles Sequelize
│   └── scripts/     # Seeds, migrations
├── frontEnd/         # Application React
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── services/
├── docs/             # Documentation
├── docker-compose.yml
└── .env.example
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [docs/README-DOCKER.md](docs/README-DOCKER.md) | **Docker** — Setup, variables d'environnement, dépannage |
| [docs/README_LOCAL_DEV.md](docs/README_LOCAL_DEV.md) | **Local** — Installation sans Docker |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | **Onboarding stagiaire** — Lire en premier |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique détaillée |
| [docs/API.md](docs/API.md) | Documentation de l'API REST |
| [docs/DOCUMENTATION_FONCTIONNELLE.md](docs/DOCUMENTATION_FONCTIONNELLE.md) | Fonctionnalités et parcours utilisateurs |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Guide de contribution |
| [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) | Checklist production |

---

## 🔐 Comptes de test (après seed)

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@actionculture.dz` | `admin123` | Administrateur |
| `m.benali@test.dz` | `password123` | Professionnel |
| `f.saidi@test.com` | `password123` | Utilisateur |

> Ne pas utiliser en production.

---

## 🌍 Langues supportées

Français (fr) · العربية (ar) · English (en) · Tamazight Latin (tz-ltn) · ⵜⴰⵎⴰⵣⵉⵖⵜ (tz-tfng)

---

## Licence

Propriétaire — Tous droits réservés.
