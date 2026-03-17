# EventCulture

Plateforme web de valorisation du patrimoine culturel algerien : sites patrimoniaux, evenements, oeuvres, artisanat, parcours intelligents et services professionnels. Support multilingue complet (Francais, Arabe, Anglais, Tamazight Latin, Tifinagh).

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Node.js 20, Express, Sequelize, MySQL 8, Redis, JWT, Bull, Socket.IO |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query, i18next |
| Infra | Docker, Nginx, GitHub Actions, GitLab CI |

## Prerequis

- **Node.js** 20+ (LTS)
- **MySQL** 8+
- **Redis** (optionnel en dev, requis en prod)
- **Docker** + Docker Compose (optionnel mais recommande)

---

## Installation

### Option A : Docker (recommande)

```bash
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ
cp .env.example .env         # editer : DB_PASSWORD, JWT_SECRET
docker compose up -d --build
docker exec -it eventculture-backend npx sequelize db:migrate
docker exec -it eventculture-backend node scripts/seed-geography.js
docker exec -it eventculture-backend node scripts/seed-all-data.js
```

Frontend : http://localhost:3000 | API : http://localhost:3001/api | Health : http://localhost:3001/health

### Option B : Local (sans Docker)

```bash
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ

# Backend
cd backend && npm install && cp .env.example .env
node scripts/generateSecret.js   # copier le JWT_SECRET dans .env
npm run db:migrate
npm run dev

# Frontend (autre terminal)
cd frontEnd && npm install
npm run dev
```

Frontend : http://localhost:8080 | API : http://localhost:3001/api

---

## Variables d'environnement

Le fichier `.env.example` a la racine contient toutes les variables. Voici les principales :

| Variable | Description | Defaut dev |
|----------|-------------|------------|
| `NODE_ENV` | Environnement (development/production) | `development` |
| `PORT` | Port du serveur backend | `3001` |
| `DB_NAME` | Nom de la base MySQL | `actionculture` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL (min 16 chars en prod) | `root` |
| `DB_HOST` | Hote MySQL | `localhost` |
| `JWT_SECRET` | Cle secrete JWT (min 32 chars en prod) | generer avec `node scripts/generateSecret.js` |
| `JWT_EXPIRES_IN` | Duree de vie du token | `24h` |
| `FRONTEND_URL` | URL du frontend (CORS) | `http://localhost:8080` |
| `API_URL` | URL publique de l'API | `http://localhost:3001` |
| `REDIS_HOST` | Hote Redis | `localhost` |
| `REDIS_PASSWORD` | Mot de passe Redis | _(vide en dev)_ |
| `CLOUDINARY_CLOUD_NAME` | Nom du cloud Cloudinary | _(requis en prod)_ |
| `CLOUDINARY_API_KEY` | Cle API Cloudinary | _(requis en prod)_ |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary | _(requis en prod)_ |
| `EMAIL_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `EMAIL_USER` | Email expediteur | _(requis en prod)_ |
| `EMAIL_PASSWORD` | Mot de passe SMTP | _(requis en prod)_ |
| `SENTRY_DSN` | DSN Sentry (optionnel) | _(vide = desactive)_ |
| `BCRYPT_ROUNDS` | Nombre de rounds bcrypt | `12` |
| `DEFAULT_LANGUAGE` | Langue par defaut | `fr` |

Voir `.env.example` et `backend/.env.example` pour la liste exhaustive avec commentaires.

---

## Commandes utiles

### Backend (`cd backend`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Demarrer en mode dev (nodemon) |
| `npm run start:safe` | Demarrer avec validation des variables d'env |
| `npm test` | Lancer les 298 tests unitaires |
| `npm run lint` | Verifier le code (ESLint) |
| `npm run db:migrate` | Executer les migrations |
| `npm run db:seed` | Charger les donnees de reference |
| `npm run db:reset` | Reinitialiser la base |

### Frontend (`cd frontEnd`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Demarrer Vite en mode dev |
| `npm run build` | Build production |
| `npm test` | Tests unitaires (Vitest) |
| `npm run e2e` | Tests E2E (Cypress) |
| `npm run lint` | Verifier le code (ESLint) |

### Docker (racine)

| Commande | Description |
|----------|-------------|
| `make up` | Demarrer tous les services |
| `make down` | Arreter tous les services |
| `make logs` | Voir les logs en temps reel |
| `make migrate` | Executer les migrations |
| `make seed` | Charger les donnees |
| `make reset` | Tout supprimer et recommencer |
| `make prod-up` | Demarrer en mode production |

---

## Structure du projet

```
EventCulture/
├── backend/                  # API Node.js/Express
│   ├── app.js                # Configuration Express (Helmet, CORS, rate limiting)
│   ├── server.js             # Point d'entree + Socket.IO + graceful shutdown
│   ├── config/               # database.js, envValidator.js
│   ├── controllers/          # 23 controllers (pattern Controller -> Service -> Repository)
│   ├── services/             # 43 services (logique metier)
│   ├── repositories/         # 11 repositories (acces donnees, anti-N+1)
│   ├── models/               # 67 modeles Sequelize (users, oeuvres, events, places...)
│   ├── routes/               # 25 fichiers de routes (~400 endpoints)
│   ├── middlewares/           # Auth JWT, rate limiting, CORS, security, cache, audit
│   ├── migrations/           # 10 migrations versionees
│   ├── i18n/                 # Messages backend FR/AR/EN
│   ├── tests/                # 298 tests Jest (unit + integration)
│   └── scripts/              # Seeds, generation de secrets, init DB
├── frontEnd/                 # SPA React/TypeScript
│   ├── src/
│   │   ├── components/       # Composants reutilisables (UI, shared, layout)
│   │   ├── pages/            # Pages de l'application
│   │   ├── services/         # Appels API (httpClient centralise)
│   │   ├── hooks/            # Hooks custom (useOnlineStatus, useTranslateData...)
│   │   ├── i18n/             # Traductions FR/AR/EN/TZ-LTN/TZ-TFNG
│   │   └── lib/              # Utilitaires
│   ├── cypress/              # 17 suites de tests E2E
│   └── vite.config.ts        # Build config (code splitting, source maps, minification)
├── nginx/                    # Configuration Nginx (dev + prod)
├── docker-compose.yml        # Stack de developpement
├── docker-compose.prod.yml   # Stack de production (resource limits, SSL, healthchecks)
├── Makefile                  # Raccourcis Docker
├── scripts/                  # deploy.sh, backup, SSL
├── docs/                     # Documentation technique
└── .env.example              # Template de configuration
```

---

## Architecture backend

```
Request -> Nginx -> Express -> Middleware (auth, rate limit, sanitize)
                                    |
                              Controller (validation, formatting)
                                    |
                               Service (logique metier)
                                    |
                              Repository (requetes DB, includes, pagination)
                                    |
                               Sequelize ORM -> MySQL
```

Chaque couche a une responsabilite unique. Les controllers ne touchent jamais la DB directement.

---

## API — Endpoints principaux

Base URL : `/api/v2`

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/users/register` | Non | Inscription |
| POST | `/users/login` | Non | Connexion (retourne JWT) |
| GET | `/users/profile` | Oui | Profil utilisateur |
| DELETE | `/users/profile` | Oui | Supprimer mon compte (RGPD Art.17) |
| GET | `/users/profile/export` | Oui | Exporter mes donnees (RGPD Art.20) |
| GET | `/evenements` | Non | Liste des evenements |
| GET | `/evenements/:id` | Non | Detail d'un evenement |
| POST | `/evenements` | Pro | Creer un evenement |
| GET | `/oeuvres` | Non | Liste des oeuvres |
| GET | `/oeuvres/:id` | Non | Detail d'une oeuvre |
| GET | `/patrimoine` | Non | Sites patrimoniaux |
| GET | `/patrimoine/:id` | Non | Detail d'un site |
| GET | `/artisanat` | Non | Artisanat |
| GET | `/parcours` | Non | Parcours intelligents |
| GET | `/favoris` | Oui | Mes favoris |
| POST | `/favoris` | Oui | Ajouter un favori |
| GET | `/commentaires/:type/:id` | Non | Commentaires |
| POST | `/commentaires` | Oui | Ajouter un commentaire |
| POST | `/upload/image` | Oui | Upload image (Cloudinary) |
| GET | `/dashboard/overview` | Admin | Tableau de bord |
| GET | `/health` | Non | Healthcheck (DB + Redis) |

Documentation API complete : [docs/API.md](docs/API.md)

---

## Comptes de test (apres seed)

| Email | Mot de passe | Role |
|-------|-------------|------|
| `admin@actionculture.dz` | `admin123` | Admin |
| `m.benali@test.dz` | `password123` | Professionnel |
| `f.saidi@test.com` | `password123` | Visiteur |

> Ne pas utiliser en production.

---

## Documentation

| Document | Contenu |
|----------|---------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Conventions, workflow Git, comment contribuer |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique detaillee (backend + frontend) |
| [docs/API.md](docs/API.md) | Documentation complete de l'API REST |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Guide de deploiement (Docker, SSL, backup, rollback) |
| [docs/DOCUMENTATION_FONCTIONNELLE.md](docs/DOCUMENTATION_FONCTIONNELLE.md) | Specifications fonctionnelles |
| [docs/CTO_ASSESSMENT.md](docs/CTO_ASSESSMENT.md) | Audit de production-readiness (79/100) |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Historique des versions |
| [docs/modules/](docs/modules/) | Documentation par module (evenements, oeuvres, patrimoine, parcours, services) |

---

## Langues supportees

Francais (fr) - Arabe (ar) - English (en) - Tamazight Latin (tz-ltn) - Tifinagh (tz-tfng)

Le frontend supporte le RTL automatiquement pour l'arabe et le tifinagh.

---

## Licence

Proprietaire — Tous droits reserves.
