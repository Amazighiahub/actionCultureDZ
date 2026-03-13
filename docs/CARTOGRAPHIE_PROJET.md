# Cartographie Complète — EventCulture (Action Culture)

> Photographie exhaustive de l'état actuel du projet.
> Générée le 13 mars 2026.

---

## Table des matières

1. [Arborescence du projet](#1-arborescence-du-projet)
2. [Stack technique exacte](#2-stack-technique-exacte)
3. [Schéma d'architecture](#3-schéma-darchitecture)
4. [Entités / Modèles et relations](#4-liste-complète-des-entités--modèles-et-relations)
5. [Routes API](#5-liste-complète-des-routes-api)
6. [Middlewares](#6-middlewares--chaîne-et-usage)
7. [Variables d'environnement](#7-variables-denvironnement)

---

## 1. Arborescence du projet

```
EventCulture/
├── .env.example                    # Variables d'environnement racine (Docker)
├── .github/workflows/deploy.yml    # CI/CD GitHub Actions
├── .gitlab-ci.yml                  # CI/CD GitLab (secondaire)
├── Makefile                        # Commandes de gestion (setup, up, down, seed, reset)
├── docker-compose.yml              # Stack Docker développement (4 services)
├── docker-compose.prod.yml         # Stack Docker production (6 services + Certbot)
├── nginx/
│   ├── prod.conf                   # Config Nginx reverse proxy + SSL
│   └── ssl/                        # Certificats SSL (non commités)
├── scripts/
│   ├── deploy.sh                   # Script de déploiement (init, update, backup, SSL)
│   └── backup-uploads.sh           # Backup des fichiers uploadés
├── init-db/                        # Scripts d'initialisation DB
├── docs/                           # Documentation (RUNBOOK, ROLLBACK, guides, audits)
│
├── backend/                        # ── API Node.js/Express ──
│   ├── .env.example                # Variables backend
│   ├── Dockerfile                  # Multi-stage (dev/production)
│   ├── package.json                # Dépendances backend
│   ├── server.js                   # Point d'entrée (HTTP + Socket.IO)
│   ├── app.js                      # Classe App (middlewares, routes, upload handlers)
│   ├── config/
│   │   ├── config.js               # Config Sequelize par environnement
│   │   ├── config.json             # Config Sequelize (format JSON legacy)
│   │   ├── database.js             # Connexion DB + création auto
│   │   ├── envAdapter.js           # Normalisation des variables d'env
│   │   └── envValidator.js         # Validation des variables au démarrage
│   ├── models/                     # 50+ modèles Sequelize
│   │   ├── index.js                # Loader + export db
│   │   ├── index-original.js       # Chargement, associations, seeds
│   │   ├── users/                  # User, TypeUser, Role, UserRole
│   │   ├── events/                 # Evenement, TypeEvenement, Programme
│   │   ├── oeuvres/                # Oeuvre, TypeOeuvre, Livre, Film, AlbumMusical,
│   │   │                           #   Article, ArticleScientifique, ArticleBlock,
│   │   │                           #   Artisanat, OeuvreArt
│   │   ├── places/                 # Lieu, DetailLieu, Monument, Vestige, Service,
│   │   │                           #   LieuMedia, QRCode, QRScan
│   │   ├── geography/             # Wilaya, Daira, Commune, Localite
│   │   ├── organisations/         # Organisation, TypeOrganisation, Editeur
│   │   ├── classifications/       # Genre, Categorie, Langue, Materiau, Technique,
│   │   │                           #   TagMotCle, Specialite
│   │   ├── misc/                  # Commentaire, CritiqueEvaluation, Favori,
│   │   │                           #   Notification, Signalement, Vue, AuditLog,
│   │   │                           #   Media, Parcours
│   │   └── associations/         # 14 tables de jonction
│   ├── controllers/               # 20 controllers
│   │   ├── dashboard/             # Dashboard refactoré en 4 modules
│   │   │   ├── analyticsMethods.js
│   │   │   ├── moderationMethods.js
│   │   │   ├── usersMethods.js
│   │   │   ├── monitoringMethods.js
│   │   │   └── index.js
│   │   ├── dashboardController.js  # Controller principal (mixin des 4 modules)
│   │   ├── userController.js
│   │   ├── oeuvreController.js
│   │   ├── evenementController.js
│   │   ├── patrimoineController.js
│   │   ├── artisanatController.js
│   │   ├── lieuController.js
│   │   ├── serviceController.js
│   │   ├── commentaireController.js
│   │   ├── favoriController.js
│   │   ├── notificationController.js
│   │   ├── uploadController.js
│   │   ├── metadataController.js
│   │   ├── intervenantController.js
│   │   ├── programmeController.js
│   │   ├── parcoursController.js
│   │   ├── signalementController.js
│   │   ├── vueController.js
│   │   ├── professionnelController.js
│   │   ├── articleBlockController.js
│   │   ├── multilingualController.js
│   │   ├── emailVerificationController.js
│   │   └── userRoleController.js
│   ├── routes/                    # 22 fichiers de routes
│   ├── middlewares/               # 13 middlewares
│   │   ├── authMiddleware.js      # JWT auth (cookies httpOnly)
│   │   ├── cacheMiddleware.js     # Redis + LRU fallback
│   │   ├── corsMiddleware.js      # CORS
│   │   ├── errorMiddleware.js     # 404 + error handler global
│   │   ├── rateLimitMiddleware.js # Multi-tier rate limiting
│   │   ├── securityMiddleware.js  # XSS, sanitization
│   │   ├── validationMiddleware.js# express-validator
│   │   ├── auditMiddleware.js     # Audit logging
│   │   ├── requestContext.js      # Correlation ID + timing
│   │   ├── timeoutMiddleware.js   # Request timeout (30s)
│   │   ├── language.js            # i18n detection (5 langues)
│   │   ├── parseFormData.js       # FormData JSON parsing
│   │   └── httpsRedirect.js       # HTTPS redirect + HSTS
│   ├── services/                  # Services métier
│   │   ├── serviceContainer.js    # DI container (singleton)
│   │   ├── user/userService.js
│   │   ├── oeuvre/oeuvreService.js
│   │   ├── evenement/evenementService.js
│   │   ├── patrimoine/patrimoineService.js
│   │   ├── artisanat/artisanatService.js
│   │   ├── service/serviceService.js
│   │   ├── parcours/parcoursService.js
│   │   ├── dashboard/             # analytics, moderation, stats, userManagement
│   │   ├── uploadService.js
│   │   └── cloudinaryService.js   # Upload cloud
│   ├── repositories/              # Data access layer
│   │   ├── baseRepository.js
│   │   ├── userRepository.js
│   │   ├── oeuvreRepository.js
│   │   ├── evenementRepository.js
│   │   └── patrimoineRepository.js
│   ├── dto/                       # Data Transfer Objects
│   ├── utils/                     # Utilitaires
│   │   ├── appError.js            # Classe erreur centralisée
│   │   ├── logger.js              # Winston logger
│   │   ├── fileValidator.js       # Validation magic numbers
│   │   ├── asyncHandler.js        # Wrapper async/await
│   │   └── circuitBreaker.js      # Circuit breaker pattern
│   ├── helpers/
│   │   ├── i18n.js                # Constantes i18n
│   │   └── messages.js            # Messages traduits (middleware i18n)
│   ├── i18n/messages/             # Fichiers de traduction backend
│   ├── templates/emails/          # 4 templates email HTML (Handlebars)
│   ├── tests/                     # Tests unitaires et intégration
│   ├── migrations/                # Migrations Sequelize
│   ├── seeders/                   # Seeders Sequelize
│   └── database/seeds/            # Seeds SQL (données de référence)
│
└── frontEnd/                      # ── SPA React/Vite/TypeScript ──
    ├── Dockerfile                 # Multi-stage (build + Nginx)
    ├── package.json               # Dépendances frontend
    ├── vite.config.ts             # Config Vite (proxy, chunks, SPA fallback)
    ├── cypress.config.ts          # Config Cypress E2E
    ├── i18n/
    │   ├── config.ts              # Config i18next
    │   └── locales/               # 5 langues (fr, ar, en, tz-ltn, tz-tfng)
    └── src/
        ├── main.tsx               # Point d'entrée React
        ├── App.tsx                # Routes, providers, lazy loading
        ├── components/            # 130+ composants
        │   ├── ui/                # 60+ composants Shadcn/Radix
        │   ├── shared/            # ErrorBoundary, DataTable, Pagination…
        │   ├── forms/             # Formulaires métier
        │   ├── home/              # Sections page d'accueil
        │   ├── event/             # Gestion événements
        │   ├── oeuvre/            # Gestion œuvres
        │   ├── article/           # Éditeur d'articles
        │   ├── dashboard/         # Charts, filtres
        │   ├── patrimoine/        # Planificateur de visites
        │   ├── auth/              # ProtectedRoute, forms
        │   ├── modals/            # Modales métier
        │   ├── layouts/           # AppLayout
        │   └── permissions/       # PermissionGuard
        ├── pages/                 # 68 pages (lazy-loaded)
        │   ├── admin/             # Dashboard admin (7 tabs)
        │   ├── articles/          # Création/édition articles
        │   ├── event/             # Détails événement (7 sous-composants)
        │   ├── oeuvreDetail/      # Détails œuvre (8 sous-composants)
        │   ├── notifications/     # Liste + préférences
        │   └── auth/              # Login, Register
        ├── hooks/                 # 30 hooks custom
        ├── services/              # 28 services API
        ├── config/api.ts          # Configuration API (975 lignes, 200+ endpoints)
        ├── types/                 # 35 fichiers TypeScript
        ├── providers/             # PermissionsProvider
        ├── lib/validation/        # Schémas Zod
        ├── utils/                 # Utilitaires frontend
        ├── styles/                # CSS/Tailwind
        └── test/                  # Setup tests
```

---

## 2. Stack technique exacte

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Runtime** | Node.js | ≥14 (image Docker : 20-alpine) |
| **Framework backend** | Express.js | 4.21.0 |
| **ORM** | Sequelize | 6.37.8 |
| **Base de données** | MySQL | 8.0 |
| **Cache** | Redis (ioredis) | 7-alpine / ioredis 5.6.1 |
| **Framework frontend** | React | 18.3.1 |
| **Build tool** | Vite (SWC) | 7.3.1 |
| **Langage frontend** | TypeScript | 5.5.3 |
| **CSS** | TailwindCSS | 3.4.11 |
| **UI Components** | Shadcn/ui + Radix UI | 40+ composants |
| **State management** | React Query | 5.90.12 |
| **State local** | Zustand | 4.4.7 |
| **Routing** | React Router DOM | 6.30.1 |
| **Formulaires** | React Hook Form + Zod | 7.53.0 / 3.23.8 |
| **Internationalisation** | i18next + react-i18next | 25.3.0 / 15.5.3 |
| **Cartes** | Leaflet + React-Leaflet | 1.9.4 / 4.2.1 |
| **Charts** | Recharts | 2.12.7 |
| **Icons** | Lucide React | 0.462.0 |
| **HTTP Client** | Axios | 1.9.0 |
| **WebSocket** | Socket.IO | 4.8.1 |
| **Auth** | JWT (jsonwebtoken) | 9.0.2 |
| **Hash** | bcrypt | 6.0.0 |
| **Upload local** | Multer | 1.4.5 |
| **Upload cloud** | Cloudinary | 1.41.3 |
| **Image processing** | Sharp | 0.34.2 |
| **PDF** | PDFKit / jsPDF | 0.17.1 / 4.0.0 |
| **QR Code** | qrcode | 1.5.4 |
| **Email** | Nodemailer | 7.0.11 |
| **Templates email** | Handlebars | 4.7.8 |
| **Job queue** | Bull | 4.16.5 |
| **Cron** | node-cron | 3.0.3 |
| **Logging** | Winston | 3.19.0 |
| **Sécurité** | Helmet | 7.0.0 |
| **Rate limiting** | express-rate-limit | 6.11.2 |
| **Validation backend** | express-validator | 7.0.1 |
| **Validation frontend** | Joi + Zod | 17.11.0 / 3.23.8 |
| **Sanitization** | DOMPurify (front) | 3.0.8 |
| **Reverse proxy** | Nginx | alpine |
| **SSL** | Certbot (Let's Encrypt) | auto-renewal |
| **Containerisation** | Docker + Docker Compose | — |
| **CI/CD** | GitHub Actions (primaire) + GitLab CI | — |
| **Tests backend** | Jest + Supertest | 29.7.0 / 6.3.3 |
| **Tests frontend** | Vitest | 4.0.17 |
| **Tests E2E** | Cypress | 15.11.0 |
| **Monitoring** | Sentry (optionnel) | @sentry/node |

---

## 3. Schéma d'architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NAVIGATEUR CLIENT                             │
│  React SPA (Vite build) ──► Axios httpClient ──► WebSocket (socket.io) │
└───────────────────────┬─────────────────────────┬───────────────────────┘
                        │ HTTPS (443)             │ WSS
                        ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy + SSL)                       │
│  ┌─── /              → Frontend (static files)                         │
│  ├─── /api/*          → Backend (port 3001)                            │
│  ├─── /uploads/*      → Backend (fichiers statiques)                   │
│  ├─── /health         → Backend (health check)                         │
│  └─── /sitemap.xml    → Backend (SEO dynamique)                        │
│  Rate limiting : 10 req/s global, 3 req/s auth                         │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   BACKEND EXPRESS (Node.js 20)                          │
│                                                                         │
│  Middleware Chain :                                                      │
│  requestContext → helmet(CSP nonce) → CORS → compression → morgan      │
│  → cookieParser → languageMiddleware → i18nMiddleware                   │
│  → express.json → securityMiddleware.sanitizeInput                      │
│  → auditMiddleware → rateLimiters → timeoutMiddleware(30s)              │
│  → routes → errorMiddleware.notFound → errorMiddleware.errorHandler     │
│                                                                         │
│  Auth : JWT httpOnly cookies (+ Authorization header fallback)          │
│  Rôles : Visiteur │ Professionnel (validé) │ Admin │ Moderateur         │
│                                                                         │
│  Architecture : Controller → Service → Repository → Sequelize Model    │
│  DI : ServiceContainer (singleton, lazy-loaded)                         │
│  Résilience : CircuitBreaker (Cloudinary 3 fails/60s, Email 3/120s)    │
│                                                                         │
│  WebSocket : Socket.IO (rooms par user_id, notifications temps réel)    │
│  Cron : Nettoyage audit logs (3h), fichiers temp (6h)                   │
└────────┬──────────────────────┬──────────────────┬──────────────────────┘
         │                      │                  │
         ▼                      ▼                  ▼
┌────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐
│  MySQL 8.0     │  │  Redis 7-alpine   │  │  Services Externes        │
│  (InnoDB)      │  │                   │  │                           │
│  UTF-8mb4      │  │  Cache primaire   │  │  • Cloudinary (images)    │
│  50+ tables    │  │  TTL : 1min → 7j  │  │  • SMTP/Gmail (emails)   │
│  Pool : 10-20  │  │  LRU fallback     │  │  • Sentry (monitoring)   │
│  256MB buffer  │  │  128-256MB max    │  │  • Let's Encrypt (SSL)   │
└────────────────┘  └───────────────────┘  └───────────────────────────┘
```

### Communication Frontend → Backend

- **HTTP** : Axios via `httpClient.ts` avec intercepteurs (auth token, language header `X-Language`, error handling, request queuing avec rate limiting adaptatif)
- **WebSocket** : Socket.IO client pour notifications temps réel (rooms par `user_${userId}`)
- **Proxy dev** : Vite proxy sur port 8080 → backend:3001

### Communication Backend → Base de données

- **ORM** : Sequelize 6 avec MySQL2 driver
- **Pool** : 10 connexions max (dev), 20 (prod), acquire timeout 30s
- **Migrations** : Sequelize CLI (`npx sequelize-cli db:migrate`)
- **Seeds** : SQL brut (`seed-reference-data.sql`) + Sequelize seeders

### Services externes

| Service | Usage | Circuit Breaker |
|---------|-------|-----------------|
| **Cloudinary** | Stockage images/vidéos cloud (resize, WebP, face-detect) | 3 échecs → OPEN 60s |
| **SMTP (Gmail)** | Emails transactionnels (vérification, reset password, inscription événement) | 3 échecs → OPEN 120s |
| **Sentry** | Error monitoring 5xx (optionnel, si `SENTRY_DSN` configuré) | Non |
| **Let's Encrypt** | Certificats SSL auto-renouvelés (Certbot, cycle 12h) | Non |

---

## 4. Liste complète des entités / modèles et relations

### 50+ modèles organisés en 8 domaines

#### Utilisateurs (4 modèles)

| Modèle | Table | PK | Champs clés |
|--------|-------|----|-------------|
| **User** | `user` | `id_user` | email, password (bcrypt), nom/prenom (JSON i18n), statut (6 valeurs), photo_url, specialites, refresh_token, 10+ notification prefs |
| **TypeUser** | `type_user` | `id_type_user` | nom_type (JSON i18n) — Visiteur (1), Professionnel, Admin, Moderateur |
| **Role** | `role` | `id_role` | nom_role, description |
| **UserRole** | `userroles` | `id` | id_user FK, id_role FK (paire unique) |

#### Événements (3 modèles)

| Modèle | Table | PK | Champs clés |
|--------|-------|----|-------------|
| **Evenement** | `evenement` | `id_evenement` | nom (JSON i18n), description (JSON i18n), date_debut/fin, statut (7 valeurs), capacite_max, tarif (DECIMAL), inscription_requise, lieu FK, organisateur FK |
| **TypeEvenement** | `type_evenement` | `id_type_evenement` | nom_type (JSON i18n), accepte_soumissions, config_soumission |
| **Programme** | `programme` | `id_programme` | titre (JSON i18n), evenement FK, date, heure_debut/fin, type_activite (13 valeurs), statut |

#### Œuvres (9 modèles)

| Modèle | Table | PK | Champs clés |
|--------|-------|----|-------------|
| **Oeuvre** | `oeuvre` | `id_oeuvre` | titre (JSON i18n), description (JSON i18n), type FK, langue FK, statut (6 valeurs), prix (DECIMAL), nb_vues, oeuvre_originale FK (self-ref traductions) |
| **Livre** | `livre` | `id_livre` | oeuvre FK, isbn, nb_pages, genre FK |
| **Film** | `film` | `id_film` | oeuvre FK, duree_minutes, realisateur, genre FK |
| **AlbumMusical** | `albummusical` | `id_album` | oeuvre FK, duree, genre FK, label |
| **Article** | `article` | `id_article` | oeuvre FK, contenu_complet (TEXT), nb_vues, nb_partages, note_qualite, fact_checked |
| **ArticleScientifique** | `articlescientifique` | `id_article_scientifique` | oeuvre FK, journal, doi (unique), peer_reviewed, impact_factor |
| **ArticleBlock** | `article_block` | `id_block` | article FK (polymorphique), type_block (10 valeurs), contenu, ordre, metadata (JSON) |
| **Artisanat** | `artisanat` | `id_artisanat` | oeuvre FK, materiau FK, technique FK, dimensions, poids, prix |
| **OeuvreArt** | `oeuvre_art` | `id_oeuvre_art` | oeuvre FK, technique, dimensions, support |

#### Lieux & Patrimoine (7 modèles)

| Modèle | Table | PK | Champs clés |
|--------|-------|----|-------------|
| **Lieu** | `lieu` | `id_lieu` | nom (JSON i18n), typeLieu (3 valeurs), typePatrimoine (8 valeurs), latitude, longitude, commune FK |
| **DetailLieu** | `detail_lieux` | `id_detailLieu` | lieu FK (unique), description/histoire/horaires (JSON i18n), noteMoyenne |
| **Monument** | `monuments` | `id` | detail_lieu FK, nom (JSON i18n), type (5 valeurs) |
| **Vestige** | `vestiges` | `id` | detail_lieu FK, nom (JSON i18n), type (3 valeurs) |
| **Service** | `services` | `id` | lieu FK, user FK (professionnel), nom (JSON i18n), type_service (7 valeurs), statut (3 valeurs), tarif_min/max (DECIMAL) |
| **LieuMedia** | `lieu_medias` | `id` | lieu FK, type, url, description (JSON i18n) |
| **QRCode** | `qr_codes` | `id_qr_code` | lieu FK, code_unique, url_destination, actif |

#### Géographie (4 modèles)

| Modèle | Table | PK | Relations |
|--------|-------|----|----------|
| **Wilaya** | `wilayas` | `id_wilaya` | → hasMany Daira |
| **Daira** | `dairas` | `id_daira` | → belongsTo Wilaya, hasMany Commune |
| **Commune** | `communes` | `id_commune` | → belongsTo Daira, hasMany Localite, hasMany Lieu |
| **Localite** | `localite` | `id_localite` | → belongsTo Commune, hasMany Lieu |

#### Classifications (6 modèles)

| Modèle | Table | PK |
|--------|-------|----|
| **Genre** | `genre` | `id_genre` |
| **Categorie** | `categorie` | `id_categorie` |
| **Langue** | `langue` | `id_langue` |
| **Materiau** | `materiau` | `id_materiau` |
| **Technique** | `technique` | `id_technique` |
| **TagMotCle** | `tagmotcle` | `id_tag` |

#### Organisations (3 modèles)

| Modèle | Table | PK |
|--------|-------|----|
| **Organisation** | `organisation` | `id_organisation` |
| **TypeOrganisation** | `typeorganisation` | `id_type_organisation` |
| **Editeur** | `editeur` | `id_editeur` |

#### Interactions & Divers (8 modèles)

| Modèle | Table | PK | Usage |
|--------|-------|----|-------|
| **Commentaire** | `commentaire` | `id_commentaire` | Commentaires sur œuvres/événements |
| **CritiqueEvaluation** | `critiqueevaluation` | `id_critique` | Notes/évaluations |
| **Favori** | `favoris` | `id_favori` | Favoris polymorphiques (oeuvre/evenement/lieu) |
| **Notification** | `notifications` | `id_notification` | Notifications in-app |
| **Signalement** | `signalements` | `id_signalement` | Signalements de contenu |
| **Vue** | `vues` | `id_vue` | Tracking des vues |
| **AuditLog** | `audit_logs` | `id` | Logs d'actions admin |
| **Media** | `medias` | `id_media` | Fichiers médias (images, vidéos, docs) |

#### Tables de jonction (14 tables)

| Table | Relie | Champs supplémentaires |
|-------|-------|------------------------|
| `oeuvre_user` | Oeuvre ↔ User | role (auteur, contributeur…) |
| `oeuvre_editeur` | Oeuvre ↔ Editeur | — |
| `oeuvre_categorie` | Oeuvre ↔ Categorie | — |
| `oeuvre_tag` | Oeuvre ↔ TagMotCle | — |
| `oeuvre_intervenants` | Oeuvre ↔ User | role, description (JSON i18n) |
| `evenement_user` | Evenement ↔ User | statut_participation (6 valeurs), role_participation (5 valeurs), oeuvres_soumises (JSON), statut_soumission |
| `evenement_oeuvre` | Evenement ↔ Oeuvre | ordre, statut_soumission |
| `evenement_organisation` | Evenement ↔ Organisation | role |
| `user_organisation` | User ↔ Organisation | role, date_adhesion |
| `genre_categorie` | Genre ↔ Categorie | — |
| `type_oeuvre_genre` | TypeOeuvre ↔ Genre | — |
| `parcours_lieu` | Parcours ↔ Lieu | ordre, duree_visite, description (JSON i18n) |
| `programme_intervenant` | Programme ↔ User | role |
| `specialite_user` | Specialite ↔ User | — |

### Diagramme des relations principales

```
User ──1:N──► Oeuvre (saisi_par)
User ──1:N──► Evenement (organisateur)
User ──M:N──► Role (through UserRole)
User ──M:N──► Organisation (through UserOrganisation)
User ──M:N──► Oeuvre (through OeuvreUser — rôles)
User ──M:N──► Evenement (through EvenementUser — participants)
User ──1:N──► Commentaire
User ──1:N──► Favori
User ──1:N──► Notification
User ──1:N──► Service (professionnel)
User ──→────► Wilaya (résidence)

Oeuvre ──→────► TypeOeuvre
Oeuvre ──→────► Langue (originale)
Oeuvre ──→────► Oeuvre (traduction, self-ref)
Oeuvre ──1:1──► Livre | Film | AlbumMusical | Article | Artisanat | OeuvreArt
Oeuvre ──M:N──► Editeur, Categorie, TagMotCle, Evenement
Oeuvre ──1:N──► Media, CritiqueEvaluation, OeuvreIntervenant

Evenement ──→────► TypeEvenement
Evenement ──→────► Lieu
Evenement ──1:N──► Programme
Evenement ──M:N──► Organisation, Oeuvre

Lieu ──→────► Commune ──→──► Daira ──→──► Wilaya
Lieu ──1:1──► DetailLieu ──1:N──► Monument, Vestige
Lieu ──1:N──► Service, LieuMedia, QRCode, Evenement
Lieu ──M:N──► Parcours (through ParcoursLieu)

Genre ──M:N──► TypeOeuvre, Categorie
```

---

## 5. Liste complète des routes API

### Résumé par module

| Module | Préfixe | Public | Auth | Admin | Total |
|--------|---------|--------|------|-------|-------|
| **Users** | `/api/users` | 7 | 11 | 12 | 30 |
| **Oeuvres** | `/api/oeuvres` | 10 | 9 | 9 | 28 |
| **Evenements** | `/api/evenements` | 9 | 14 | 4 | 27 |
| **Patrimoine** | `/api/patrimoine` | 14 | 6 | 4 | 24 |
| **Artisanat** | `/api/artisanat` | 5 | 5 | 1 | 11 |
| **Lieux** | `/api/lieux` | 8 | 9 | 0 | 17 |
| **Services** | `/api/services` | 4 | 4 | 4 | 12 |
| **Commentaires** | `/api/commentaires` | 2 | 4 | 1 | 7 |
| **Favoris** | `/api/favoris` | 0 | 7 | 0 | 7 |
| **Notifications** | `/api/notifications` | 0 | 13 | 0 | 13 |
| **Upload** | `/api/upload` | 3 | 6 | 0 | 9 |
| **Metadata** | `/api/metadata` | 18 | 0 | 18 | 36 |
| **Dashboard** | `/api/dashboard` | 0 | 0 | 25+ | 25+ |
| **Programmes** | `/api/programmes` | 2 | 5 | 0 | 7 |
| **Parcours** | `/api/parcours` | 3 | 3 | 0 | 6 |
| **Intervenants** | `/api/intervenants` | 2 | 3 | 0 | 5 |
| **Professionnel** | `/api/professionnel` | 0 | 8 | 0 | 8 |
| **Tracking** | `/api/tracking` | 0 | 3 | 0 | 3 |
| **Signalements** | `/api/signalements` | 0 | 3 | 3 | 6 |
| **Email Verif** | `/api/email-verification` | 4 | 2 | 0 | 6 |
| **Article Blocks** | `/api/article-blocks` | 1 | 5 | 0 | 6 |
| **Organisations** | `/api/organisations` | 2 | 3 | 2 | 7 |
| **Multilingual** | `/api/multilingual` | 0 | 3 | 0 | 3 |
| **Système** | `/`, `/health`, `/api` | 5 | 0 | 1 | 6 |
| **i18n** | `/api/languages`, `/api/set-language` | 2 | 0 | 0 | 2 |
| **TOTAL** | | **~100** | **~140** | **~85** | **~325+** |

### Détail par module

#### Users (`/api/users`)

**Routes publiques :**

| Méthode | Path | Handler |
|---------|------|---------|
| POST | `/users/register` | userController.register |
| POST | `/users/login` | userController.login |
| POST | `/users/refresh-token` | userController.refreshToken |
| POST | `/users/check-email` | userController.checkEmail |
| POST | `/users/verify-email/:token` | userController.verifyEmail |
| GET | `/users/types` | userController.getTypes |
| GET | `/users/professionals` | userController.getProfessionals |

**Routes authentifiées :**

| Méthode | Path | Handler |
|---------|------|---------|
| POST | `/users/logout` | userController.logout |
| GET | `/users/profile` | userController.getProfile |
| PUT | `/users/profile` | userController.updateProfile |
| PATCH | `/users/profile/photo` | userController.updateProfilePhoto |
| DELETE | `/users/profile/photo` | userController.removeProfilePhoto |
| POST | `/users/change-password` | userController.changePassword |
| GET | `/users/search` | userController.search |
| POST | `/users/professional/submit` | userController.submitProfessional |
| GET | `/users/professional/status` | userController.getProfessionalStatus |
| PUT | `/users/preferences` | userController.updatePreferences |
| PUT | `/users/privacy` | userController.updatePrivacy |

**Routes admin (requireRole Admin/Moderateur) :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/users/` | userController.list |
| GET | `/users/stats` | userController.getStats |
| GET | `/users/pending` | userController.getPending |
| GET | `/users/:id` | userController.getById |
| PUT | `/users/:id` | userController.update |
| DELETE | `/users/:id` | userController.delete |
| POST | `/users/:id/validate` | userController.validate |
| POST | `/users/:id/reject` | userController.reject |
| POST | `/users/:id/suspend` | userController.suspend |
| POST | `/users/:id/reactivate` | userController.reactivate |
| GET | `/users/:id/translations` | userController.getUserTranslations |
| PATCH | `/users/:id/translation/:lang` | userController.updateUserTranslation |

#### Oeuvres (`/api/oeuvres`)

**Routes publiques :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/oeuvres/` | oeuvreController.list |
| GET | `/oeuvres/recent` | oeuvreController.getRecent |
| GET | `/oeuvres/popular` | oeuvreController.getPopular |
| GET | `/oeuvres/statistics` | oeuvreController.getStatistics |
| GET | `/oeuvres/search` | oeuvreController.search |
| GET | `/oeuvres/search/intervenants` | oeuvreController.searchIntervenants |
| GET | `/oeuvres/:id` | oeuvreController.getById |
| GET | `/oeuvres/:id/similar` | oeuvreController.getSimilar |
| GET | `/oeuvres/:id/share-links` | oeuvreController.getShareLinks |
| GET | `/oeuvres/:id/medias` | oeuvreController.getMedias |

**Routes authentifiées :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/oeuvres/my/list` | oeuvreController.getMyOeuvres |
| GET | `/oeuvres/my/statistics` | oeuvreController.getMyStatistics |
| POST | `/oeuvres/` | oeuvreController.create |
| PUT | `/oeuvres/:id` | oeuvreController.update |
| DELETE | `/oeuvres/:id` | oeuvreController.delete |
| POST | `/oeuvres/:id/submit` | oeuvreController.submit |
| POST | `/oeuvres/:id/medias/upload` | oeuvreController.uploadMedia |
| PUT | `/oeuvres/:id/medias/reorder` | oeuvreController.reorderMedias |
| DELETE | `/oeuvres/:id/medias/:mediaId` | oeuvreController.deleteMedia |

**Routes admin :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/oeuvres/admin/all` | oeuvreController.listAll |
| GET | `/oeuvres/admin/pending` | oeuvreController.getPending |
| GET | `/oeuvres/admin/rejected` | oeuvreController.getRejected |
| GET | `/oeuvres/admin/stats` | oeuvreController.getStats |
| POST | `/oeuvres/:id/validate` | oeuvreController.validate |
| POST | `/oeuvres/:id/reject` | oeuvreController.reject |
| POST | `/oeuvres/:id/feature` | oeuvreController.setFeatured |
| GET | `/oeuvres/:id/translations` | oeuvreController.getTranslations |
| PATCH | `/oeuvres/:id/translation/:lang` | oeuvreController.updateTranslation |

#### Evenements (`/api/evenements`)

**Routes publiques :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/evenements/` | evenementController.list |
| GET | `/evenements/upcoming` | evenementController.list |
| GET | `/evenements/statistics` | evenementController.getStats |
| GET | `/evenements/search` | evenementController.search |
| GET | `/evenements/wilaya/:wilayaId` | evenementController.getByWilaya |
| GET | `/evenements/oeuvre/:oeuvreId` | evenementController.getByOeuvre |
| GET | `/evenements/:id/medias` | evenementController.getMedias |
| GET | `/evenements/:id/share-data` | evenementController.getShareData |
| GET | `/evenements/:id` | evenementController.getById |

**Routes authentifiées :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/evenements/my/list` | evenementController.getMyEvenements |
| GET | `/evenements/:id/participants` | evenementController.getParticipants |
| GET | `/evenements/:id/mes-oeuvres` | evenementController.getMesOeuvres |
| GET | `/evenements/:id/mon-inscription` | evenementController.getMyRegistration |
| GET | `/evenements/:id/export` | evenementController.exportEvent |
| POST | `/evenements/` | evenementController.create |
| PUT | `/evenements/:id` | evenementController.update |
| DELETE | `/evenements/:id` | evenementController.delete |
| POST | `/evenements/:id/register` | evenementController.register |
| DELETE | `/evenements/:id/register` | evenementController.unregister |
| POST | `/evenements/:id/oeuvres` | evenementController.addOeuvre |
| PUT | `/evenements/:id/oeuvres/:oeuvreId` | evenementController.updateOeuvre |
| DELETE | `/evenements/:id/oeuvres/:oeuvreId` | evenementController.removeOeuvre |
| POST | `/evenements/:id/cancel` | evenementController.cancel |

**Routes admin :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/evenements/admin/all` | evenementController.listAll |
| GET | `/evenements/admin/pending` | evenementController.getPending |
| GET | `/evenements/admin/stats` | evenementController.getStats |
| POST | `/evenements/:id/publish` | evenementController.publish |

#### Patrimoine (`/api/patrimoine`)

**Routes publiques :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/patrimoine/` | patrimoineController.list |
| GET | `/patrimoine/popular` | patrimoineController.popular |
| GET | `/patrimoine/search` | patrimoineController.search |
| GET | `/patrimoine/types` | patrimoineController.getTypes |
| GET | `/patrimoine/map` | patrimoineController.getMap |
| GET | `/patrimoine/monuments/:type` | patrimoineController.getByType |
| GET | `/patrimoine/vestiges/:type` | patrimoineController.getByType |
| GET | `/patrimoine/mobile/nearby` | patrimoineController.getMobileNearby |
| POST | `/patrimoine/mobile/qr-scan` | patrimoineController.scanQRCode |
| GET | `/patrimoine/mobile/offline/:wilayaId` | patrimoineController.getMobileOffline |
| GET | `/patrimoine/:id` | patrimoineController.getById |
| GET | `/patrimoine/:id/galerie` | patrimoineController.getGalerie |
| GET | `/patrimoine/:id/carte-visite` | patrimoineController.getCarteVisite |
| GET | `/patrimoine/:id/qrcode` | patrimoineController.getQRCode |

**Routes authentifiées :**

| Méthode | Path | Handler |
|---------|------|---------|
| POST | `/patrimoine/:id/noter` | patrimoineController.noter |
| POST | `/patrimoine/:id/favoris` | patrimoineController.ajouterFavoris |
| DELETE | `/patrimoine/:id/favoris` | patrimoineController.retirerFavoris |
| POST | `/patrimoine/:id/medias` | patrimoineController.uploadMedias |
| DELETE | `/patrimoine/:id/medias/:mediaId` | patrimoineController.deleteMedia |
| PUT | `/patrimoine/:id/horaires` | patrimoineController.updateHoraires |

**Routes admin :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/patrimoine/admin/stats` | patrimoineController.getStats |
| POST | `/patrimoine/` | patrimoineController.create |
| PUT | `/patrimoine/:id` | patrimoineController.update |
| DELETE | `/patrimoine/:id` | patrimoineController.delete |

#### Metadata (`/api/metadata`)

**Routes publiques (GET) :**

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/metadata/` | getAllMetadata |
| GET | `/metadata/types-oeuvres` | getTypesOeuvres |
| GET | `/metadata/genres/:typeId` | getGenresParType |
| GET | `/metadata/categories/:genreId` | getCategoriesParGenre |
| GET | `/metadata/hierarchie` | getHierarchieComplete |
| GET | `/metadata/tags` | getTags |
| GET | `/metadata/materiaux` | getMateriaux |
| GET | `/metadata/techniques` | getTechniques |
| GET | `/metadata/langues` | getLangues |
| GET | `/metadata/wilayas` | getWilayas |
| GET | `/metadata/wilayas/:wilayaId/dairas` | getDairasParWilaya |
| GET | `/metadata/dairas/:dairaId/communes` | getCommunesParDaira |
| GET | `/metadata/types-evenements` | getTypesEvenements |
| GET | `/metadata/genres` | getGenres |
| GET | `/metadata/types-users` | getTypesUsers |
| GET | `/metadata/types-organisations` | getTypesOrganisations |
| GET | `/metadata/editeurs` | getEditeurs |
| GET | `/metadata/statistics` | getUsageStatistics |

**Routes admin (traductions + création) :** 18 routes CRUD pour types, genres, catégories, tags, matériaux, techniques.

#### Dashboard (`/api/dashboard`) — Toutes admin

| Méthode | Path | Handler |
|---------|------|---------|
| GET | `/dashboard/overview` | getOverview |
| GET | `/dashboard/stats` | getDetailedStats |
| GET | `/dashboard/patrimoine` | getPatrimoineDashboard |
| GET | `/dashboard/qr-stats` | getQRStats |
| GET | `/dashboard/analytics` | getAdvancedAnalytics |
| GET | `/dashboard/audit` | getAuditLogs |
| GET | `/dashboard/report` | generateActivityReport |
| GET | `/dashboard/pending/oeuvres` | getPendingOeuvres |
| GET | `/dashboard/moderation/queue` | getModerationQueue |
| GET | `/dashboard/moderation/reports` | getReportedContent |
| POST | `/dashboard/actions/validate-user` | validateUserAction |
| POST | `/dashboard/actions/validate-oeuvre` | validateOeuvre |
| POST | `/dashboard/actions/moderate-signalement` | moderateSignalementAction |
| POST | `/dashboard/actions/suspend-user` | suspendUserAction |
| POST | `/dashboard/actions/bulk-moderate` | bulkModerateAction |
| GET | `/dashboard/users` | getAllUsers |
| GET | `/dashboard/users/pending` | getPendingUsers |
| GET | `/dashboard/users/:id` | getUserDetails |
| PUT | `/dashboard/users/:id` | updateUser |
| DELETE | `/dashboard/users/:id` | deleteUser |
| POST | `/dashboard/users/:id/reactivate` | reactivateUser |
| POST | `/dashboard/users/:id/role` | changeUserRole |
| GET | `/dashboard/alerts` | getAlerts |
| GET | `/dashboard/notifications` | getNotifications |
| POST | `/dashboard/notifications/broadcast` | broadcastNotification |
| POST | `/dashboard/cache/clear` | clearCache |

#### Autres modules (résumé)

| Module | Endpoints clés |
|--------|---------------|
| **Artisanat** | CRUD + search + stats + medias + par région |
| **Lieux** | CRUD + search + proximité + services + details + traductions |
| **Services** | CRUD + search + validation admin |
| **Commentaires** | CRUD oeuvre/evenement + modération admin |
| **Favoris** | add/remove + check + stats + popular |
| **Notifications** | list + read/unread + preferences + broadcast + test email |
| **Upload** | image/video/audio/document + multiple + public + profile photo |
| **Programmes** | CRUD par événement + intervenants |
| **Parcours** | list + personnalisé + par événement |
| **Intervenants** | search + CRUD par oeuvre |
| **Professionnel** | dashboard + analytics + stats + export |
| **Tracking** | enregistrer vue + stats par entité |
| **Signalements** | créer + mes signalements + admin modération |
| **Email Verif** | request verify + verify + request reset + reset password |
| **Article Blocks** | CRUD + reorder par article |
| **Organisations** | CRUD + types + admin |
| **Multilingual** | traductions par entité |

---

## 6. Middlewares — Chaîne et usage

### Chaîne globale (ordre d'exécution dans `app.js`)

```
 1. requestContext          — Correlation ID (X-Request-Id) + timing
 2. helmet (CSP nonce)      — Security headers, Content-Security-Policy
 3. corsMiddleware          — CORS validation (origines autorisées)
 4. compression             — Gzip (level 6)
 5. morgan                  — HTTP request logging
 6. cookieParser            — Parse cookies JWT
 7. languageMiddleware      — Détection langue (query > header > cookie > Accept-Language)
 8. i18nMiddleware          — Attach req.t() translation function
 9. express.json (5mb)      — Parse JSON body
10. JSON error handler      — Catch invalid JSON (400)
11. express.urlencoded      — Parse form data
12. securityMiddleware      — XSS sanitization
13. express.static          — Servir /uploads et /public
14. auditMiddleware         — Log unauthorized access (401/403)
```

### Middlewares par route

| Middleware | Routes appliquées |
|------------|-------------------|
| **rateLimitMiddleware.auth** | `/api/users/login`, `/api/users/register`, `/api/email-verification/request-password-reset`, `/api/email-verification/reset-password` |
| **rateLimitMiddleware.creation** | `/api/oeuvres`, `/api/evenements`, `/api/artisanat`, `/api/patrimoine/sites` |
| **rateLimitMiddleware.sensitiveActions** | `/api/dashboard/actions`, `/api/users/change-password`, `/api/professionnel/export` |
| **rateLimitMiddleware.general** | `/api/*` (tout l'API) |
| **accountRateLimiter** | `/api/users/login` (brute force par email) |
| **timeoutMiddleware (30s)** | `/api/*` (sauf uploads) |
| **authenticate** | Toutes les routes protégées (~140) |
| **requireRole(['Admin'])** | Routes dashboard, admin CRUD |
| **requireValidatedProfessional** | Création œuvres, services, patrimoine |
| **cacheStrategy** | GET routes dashboard (short/medium/long/veryLong) |
| **invalidateOnChange** | POST/PUT/DELETE sur entités cachées |
| **validateId** | Routes avec paramètre `:id` |
| **validatePagination** | Routes de listing |
| **handleValidationErrors** | Routes avec validation express-validator |
| **auditMiddleware.logAction** | Uploads, actions admin, modifications |

### Détail des 13 middlewares

| Middleware | Fichier | Rôle | Configuration clé |
|------------|---------|------|-------------------|
| **requestContext** | `requestContext.js` | Correlation ID + mesure durée | Seuil slow request : 2000ms |
| **helmet** | Inline dans `app.js` | CSP avec nonce, HSTS, X-Frame | Nonce crypto par requête |
| **corsMiddleware** | `corsMiddleware.js` | Validation origines | Dev : localhost:3000/5173/8080, Prod : FRONTEND_URL |
| **authMiddleware** | `authMiddleware.js` | JWT cookies httpOnly | Sources : cookie > Authorization > X-Access-Token |
| **cacheMiddleware** | `cacheMiddleware.js` | Redis + LRU fallback | TTL : short(1min), medium(5min), long(1h), veryLong(24h), metadata(7j) |
| **rateLimitMiddleware** | `rateLimitMiddleware.js` | Multi-tier rate limiting | Global 100/15min, Auth 10/15min, Lockout 5 fails/15min |
| **securityMiddleware** | `securityMiddleware.js` | Sanitization XSS | Strip HTML tags, path traversal prevention |
| **validationMiddleware** | `validationMiddleware.js` | express-validator | Max lengths, pagination 1-100, event capacity 1-100k |
| **errorMiddleware** | `errorMiddleware.js` | 404 + error handler | AppError.fromError() normalization, Sentry 5xx |
| **auditMiddleware** | `auditMiddleware.js` | Audit logging | 24 types d'actions, rétention 90 jours |
| **timeoutMiddleware** | `timeoutMiddleware.js` | Timeout requêtes | 30s défaut, skip uploads |
| **language** | `language.js` | Détection i18n | 5 langues, aliases Tamazight, cookie 1 an |
| **httpsRedirect** | `httpsRedirect.js` | HTTPS + HSTS | HSTS 1 an, includeSubDomains, preload |

---

## 7. Variables d'environnement

### Variables requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_NAME` | Nom de la base MySQL | `actionculture` |
| `DB_USER` | Utilisateur MySQL | `actionculture_user` |
| `DB_PASSWORD` | Mot de passe MySQL (≥16 chars en prod) | — |
| `DB_HOST` | Hôte MySQL | `mysql` (Docker) / `localhost` |
| `JWT_SECRET` | Secret JWT (≥32 chars) | Généré via `scripts/generateSecret.js` |
| `FRONTEND_URL` | URL frontend (HTTPS en prod) | `https://actionculture.dz` |
| `API_URL` / `BASE_URL` | URL backend | `https://api.actionculture.dz` |
| `MYSQL_ROOT_PASSWORD` | Mot de passe root MySQL (Docker) | — |

### Variables optionnelles (avec défauts)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `NODE_ENV` | `development` | Environnement |
| `PORT` | `3001` | Port backend |
| `HOST` | `0.0.0.0` | Adresse d'écoute |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_DIALECT` | `mysql` | Dialecte Sequelize |
| `DB_POOL_MAX` | `10` | Connexions max |
| `DB_POOL_MIN` | `0` | Connexions min |
| `DB_POOL_ACQUIRE` | `30000` | Timeout acquisition (ms) |
| `DB_POOL_IDLE` | `10000` | Timeout idle (ms) |
| `DB_SYNC` | `false` | Sync automatique des modèles |
| `JWT_EXPIRES_IN` | `24h` | Durée du token |
| `REDIS_HOST` | `localhost` | Hôte Redis |
| `REDIS_PORT` | `6379` | Port Redis |
| `REDIS_PASSWORD` | *(vide)* | Mot de passe Redis |
| `REDIS_URL` | `redis://localhost:6379` | URL complète Redis |
| `USE_REDIS_MEMORY` | `true` | Fallback mémoire si Redis indisponible |
| `CLOUDINARY_CLOUD_NAME` | — | Nom cloud Cloudinary |
| `CLOUDINARY_API_KEY` | — | Clé API Cloudinary |
| `CLOUDINARY_API_SECRET` | — | Secret API Cloudinary |
| `EMAIL_HOST` | `smtp.gmail.com` | Serveur SMTP |
| `EMAIL_PORT` | `587` | Port SMTP |
| `EMAIL_USER` | — | Utilisateur SMTP |
| `EMAIL_PASSWORD` | — | Mot de passe SMTP |
| `EMAIL_FROM` | — | Adresse expéditeur |
| `EMAIL_PAUSED` | `false` | Mettre en pause l'envoi d'emails |
| `EMAIL_QUEUE_ENABLED` | `true` | File d'attente emails |
| `EMAIL_RETRY_ATTEMPTS` | `3` | Tentatives de renvoi |
| `EMAIL_RETRY_DELAY` | `5000` | Délai entre tentatives (ms) |
| `UPLOAD_DIR` | `uploads` | Répertoire uploads |
| `UPLOAD_MAX_SIZE` | `10485760` | Taille max upload (10 MB) |
| `UPLOAD_IMAGE_MAX_SIZE` | `5242880` | Max image (5 MB) |
| `UPLOAD_DOCUMENT_MAX_SIZE` | `10485760` | Max document (10 MB) |
| `UPLOAD_VIDEO_MAX_SIZE` | `524288000` | Max vidéo (500 MB) |
| `BCRYPT_ROUNDS` | `12` | Tours de hash bcrypt |
| `DEFAULT_LANGUAGE` | `fr` | Langue par défaut |
| `SUPPORTED_LANGUAGES` | `fr,ar,en,tz-ltn,tz-tfng` | Langues supportées |
| `DEFAULT_TIMEZONE` | `Africa/Algiers` | Fuseau horaire |
| `DEFAULT_PAGE_SIZE` | `10` | Pagination par défaut |
| `MAX_PAGE_SIZE` | `100` | Pagination max |
| `MIN_SEARCH_LENGTH` | `2` | Longueur min recherche |
| `MAX_SEARCH_RESULTS` | `50` | Résultats max recherche |
| `RATE_LIMIT_WINDOW` | `900000` | Fenêtre rate limit (15 min) |
| `RATE_LIMIT_MAX` | `1000` | Max requêtes par fenêtre |
| `ENABLE_SCHEDULED_TASKS` | `true` | Activer les tâches cron |
| `ENABLE_AUDIT_LOGS` | `true` | Activer les logs d'audit |
| `AUDIT_LOG_RETENTION_DAYS` | `90` | Rétention logs (jours) |
| `NOTIFICATION_RETENTION_DAYS` | `90` | Rétention notifications (jours) |
| `ENABLE_NEWSLETTER` | `true` | Activer newsletter |
| `ENABLE_METRICS` | `false` | Activer endpoint /metrics |
| `WEBSOCKET_ENABLED` | `true` | Activer Socket.IO |
| `SENTRY_DSN` | *(vide)* | DSN Sentry (optionnel) |
| `VITE_API_URL` | `http://localhost:3001/api` | URL API pour le frontend |
| `VITE_PROXY_TARGET` | `http://127.0.0.1:3001` | Target proxy Vite dev |
| `CORS_ALLOWED_ORIGINS` | — | Origines CORS supplémentaires (virgules) |
| `SESSION_TIMEOUT` | `86400` | Timeout session (secondes) |
| `TEMP_FILES_RETENTION_HOURS` | `24` | Rétention fichiers temp (heures) |

---

## Résumé chiffré

| Métrique | Valeur |
|----------|--------|
| Modèles Sequelize | 50+ |
| Tables de jonction | 14 |
| Endpoints API | 325+ |
| Routes publiques | ~100 |
| Routes authentifiées | ~140 |
| Routes admin | ~85 |
| Middlewares | 13 |
| Controllers | 20 |
| Services backend | 12 |
| Repositories | 5 |
| Composants React | 130+ |
| Pages React | 68 |
| Hooks custom | 30 |
| Services frontend | 28 |
| Types TypeScript | 35 fichiers |
| Langues supportées | 5 (fr, ar, en, tz-ltn, tz-tfng) |
| Services Docker (prod) | 6 |
| Variables d'environnement | 45+ |
| Templates email | 4 |
