# Audit Technique Complet — EventCulture (Action Culture)

**Date :** 2025-03-11  
**Objectif :** Préparation à la mise en production  
**Stack :** React (Vite) / Node.js (Express) / Sequelize / MySQL  

---

## 1. CARTOGRAPHIE DU PROJET

### 1.1 Structure des dossiers

```
EventCulture/
├── frontEnd/                 # React + Vite
│   ├── src/
│   │   ├── components/       # UI, shared, layouts, dashboards, auth, etc.
│   │   ├── pages/            # 40+ pages
│   │   ├── services/         # 25+ services API
│   │   ├── hooks/            # 25+ hooks
│   │   ├── config/           # API, env
│   │   ├── providers/
│   │   ├── i18n/             # 5 langues (fr, en, ar, tz-ltn, tz-tfng)
│   │   └── utils/
│   ├── vite.config.ts
│   └── package.json
├── backend/
│   ├── routes/               # 24+ routeurs
│   ├── controllers/         # 20+ contrôleurs
│   ├── middlewares/          # auth, CORS, rateLimit, validation, etc.
│   ├── services/             # User, Oeuvre, Evenement, Patrimoine, etc.
│   ├── models/               # Sequelize (users, oeuvres, events, places, etc.)
│   ├── app.js                # Express principal
│   └── server.js
├── nginx/                    # prod.conf, initial.conf
├── scripts/                   # deploy.sh, setup-server.sh
├── docker-compose.yml         # Backend, Frontend, MySQL, Redis
└── .env.example
```

### 1.2 Architecture Frontend

- **Routing :** React Router v6 avec lazy loading
- **État :** TanStack React Query + Zustand
- **Auth :** Cookies httpOnly (JWT) + `ProtectedRoute`, `AdminRoute`, `ProfessionalRoute`
- **API :** `httpClient` (axios) centralisé avec intercepteurs
- **i18n :** i18next (5 langues)

### 1.3 Architecture Backend

- **Pattern :** Controller → Service → Repository (pour User, Oeuvre, Patrimoine)
- **Auth :** JWT via cookie `access_token` ou header `Authorization`
- **Middleware :** Helmet, CORS, rate limiting, sanitization, validation
- **Base :** Sequelize + MySQL, Redis (cache/sessions)

### 1.4 Relations principales (Sequelize)

```
User ↔ Role (N:N via UserRole)
User ↔ Organisation (N:N)
User ↔ Oeuvre (saisi_par, validateur_id, OeuvreUser)
User ↔ Evenement (organisateur, EvenementUser)
Oeuvre ↔ Evenement (N:N via EvenementOeuvre)
Oeuvre ↔ Categorie, Genre, Editeur, Tag (N:N)
Lieu ↔ Evenement, Programme, Parcours
Evenement ↔ Programme → ProgrammeIntervenant → Intervenant/User
```

---

## 2. ANALYSE DU ROUTING

### 2.1 Routes Frontend (App.tsx)

| Type | Paths | Guard |
|------|-------|-------|
| Public | `/`, `/patrimoine`, `/evenements`, `/oeuvres`, `/artisanat`, `/a-propos`, `/auth`, `/forgot-password`, `/reset-password/:token`, `/articles/:id`, `/verify-email/:token`, `/confirm-email-change/:token` | Aucun |
| Protected | `/dashboard`, `/dashboard-user`, `/notifications`, `/notifications/preferences` | ProtectedRoute |
| Admin | `/admin/dashboard`, `/admin/patrimoine/ajouter`, `/admin/patrimoine/modifier/:id`, `/admin/users`, `/admin/metadata`, `/admin/validation` | AdminRoute |
| Pro | `/dashboard-pro`, `/ajouter-oeuvre`, `/editer-article/:id`, `/ajouter-evenement`, `/ajouter-service`, `/ajouter-mon-service`, `/ajouter-patrimoine`, `/ajouter-artisanat`, `/ajouter-organisation`, `/modifier-*` | ProfessionalRoute |

**Redirections :** `/Patrimoine`→`/patrimoine`, `/profile`→`/dashboard-user`, `/mes-favoris`→`/dashboard-user`

**Placeholders :** `/admin/users`, `/admin/metadata`, `/admin/validation` → div vide

### 2.2 Routes Backend (préfixe `/api`)

| Router | Endpoints principaux |
|--------|---------------------|
| `/users` | register, login, refresh-token, profile, professional/submit, professional/status, preferences, privacy, validate, suspend, reactivate |
| `/oeuvres` | CRUD, search, similar, admin/all, admin/pending, validate, reject |
| `/evenements` | CRUD, register, participants, oeuvres, admin/all |
| `/patrimoine` | list, popular, search, types, map, monuments, vestiges, galerie, noter, favoris, admin/stats |
| `/lieux` | CRUD, wilaya, proximite, search, details |
| `/commentaires` | oeuvre/:id, evenement/:id, moderate |
| `/favoris` | CRUD, check, stats |
| `/parcours` | list, search, personnalise, etapes |
| `/tracking` | view, stats/:type/:id |
| `/signalements` | CRUD, moderation/queue, traiter |
| `/upload` | image/public, image, document, profile-photo |
| `/metadata` | types-oeuvres, genres, wilayas, dairas, communes |
| `/dashboard` | overview, stats, users, patrimoine, content, moderation |
| `/professionnel` | dashboard, oeuvres, evenements, calendar, export |

---

## 3. CORRESPONDANCE FRONTEND ↔ BACKEND

### 3.1 Endpoints Frontend inexistants ou mal alignés

| Appel Frontend | Route Backend réelle | Problème |
|----------------|----------------------|----------|
| `GET /patrimoine/mobile/nearby` | N'existe pas | **404** |
| `POST /patrimoine/mobile/qr-scan` | N'existe pas | **404** |
| `GET /patrimoine/mobile/offline/:wilaya` | N'existe pas | **404** |
| `GET /lieux/:id/detail-lieux` | Backend a `/lieux/:id/details` | Nom différent |
| `GET /geography/wilayas/:id/communes` | Backend a `/metadata/wilayas/:id/dairas` | Hiérarchie différente |
| `POST /users/:id/suspend` (PUT) | Backend attend POST | Méthode différente |
| `PUT /users/:id/activate` | Backend a POST `/users/:id/reactivate` | Endpoint différent |

### 3.2 Endpoints Backend non utilisés par le frontend

- `GET /oeuvres/popular`
- `GET /oeuvres/:id/share-links`
- `POST /oeuvres/:id/submit`
- `GET /evenements/:id/share-data`
- `GET /evenements/:id/export`
- `POST /evenements/:id/publish`
- `POST /lieux/check-duplicate`
- `GET /patrimoine/map`
- Routes `languageRoutes`, `multilingualRoutes` non montées

---

## 4. FONCTIONNALITÉS

### 4.1 Complètes et connectées

- Auth (login, register, forgot/reset password)
- Profil utilisateur, photo, changement de mot de passe
- Oeuvres (CRUD, recherche, similar, admin)
- Événements (CRUD, inscription, participants)
- Patrimoine (liste, détail, noter, favoris)
- Artisanat (liste, détail, gestion)
- Commentaires, Favoris
- Notifications
- Dashboards Admin / Pro / User
- Parcours personnalisé
- Tracking des vues

### 4.2 Incomplètes ou à risques

| Fonctionnalité | Problème |
|----------------|----------|
| Admin Users / Metadata / Validation | Pages placeholder (div vide) |
| Patrimoine mobile (nearby, qr-scan, offline) | Backend non implémenté |
| Export utilisateurs dashboard | Route possiblement manquante |
| Professionnel : benchmark, recommendations, support/ticket | Routes 501 |

---

## 5. DASHBOARDS ET RÔLES

| Rôle | Route | Guard Frontend | Guard Backend |
|------|-------|----------------|---------------|
| Admin | `/admin/dashboard` | AdminRoute | authenticate + requireAdmin |
| Pro | `/dashboard-pro` | ProfessionalRoute | authenticate + requireValidatedProfessional |
| User | `/dashboard-user` | ProtectedRoute | authenticate |

**Logique :** `/dashboard` redirige vers le dashboard adapté selon le rôle.

**Risques :** `AdminRoute` vérifie `isAdmin` côté client ; si le token est modifié ou expiré, le backend rejettera les appels API. Cohérence correcte.

---

## 6. ANALYSE BACKEND

### 6.1 Points positifs

- Séparation Controller / Service / Repository (modules récents)
- Validation express-validator sur les routes critiques
- Sanitisation des entrées (securityMiddleware)
- Rate limiting par endpoint
- Gestion centralisée des erreurs
- Helmet, CORS, HSTS

### 6.2 Points à améliorer

| Problème | Fichier(s) | Recommandation |
|----------|------------|----------------|
| Console.log en prod | Controllers, services | Remplacer par Winston |
| Doublon bcrypt/bcryptjs | package.json | Supprimer bcryptjs |
| Routes 501 | dashboard, professionnel | Implémenter ou supprimer |
| userService.update pour preferences/privacy | userController | Vérifier schéma User (champs preferences, privacy_settings) |

---

## 7. SEQUELIZE ET BASE DE DONNÉES

### 7.1 Modèles

- **User** : champs `preferences`, `privacy_settings` à vérifier (JSON ?)
- **Oeuvre**, **Evenement**, **Lieu** : associations cohérentes
- **Index** : présents sur les champs fréquemment interrogés

### 7.2 Risques potentiels

- Champs multilingues (JSON) : cohérence fr/ar/en à vérifier
- `N+1` : plusieurs controllers utilisent `findAll` avec `include` ; surveiller les performances

---

## 8. SÉCURITÉ

### 8.1 En place

- JWT en cookie httpOnly (ou Bearer)
- Validation JWT stricte en production
- Sanitisation XSS
- CORS restrictif
- Helmet (CSP, HSTS)
- Rate limiting global et par endpoint
- Validation des entrées

### 8.2 Points d’attention

| Risque | Détail |
|--------|--------|
| CSP `unsafe-inline` | Réduit la protection XSS |
| Route `/api/debug/routes` | 404 en prod, mais à confirmer |
| Redis sans mot de passe | Optionnel ; à configurer en prod |
| Logs sensibles | Limiter les logs en production |

---

## 9. PERFORMANCES

- **Code splitting** : OK (lazy loading des pages)
- **React Query** : cache 5 min, gc 10 min
- **httpClient** : file d’attente, cache GET
- **Backend** : compression gzip, Redis pour le cache
- **Requêtes SQL** : `include` Sequelize ; audits N+1 conseillés sur les listes volumineuses

---

## 10. QUALITÉ DU CODE

- **Conventions** : TypeScript côté frontend, ESLint/Prettier
- **Modularité** : services, hooks, composants réutilisables
- **i18n** : 5 langues, fallback fr
- **Duplication** : quelques patterns répétés (gestion erreurs, toasts)

---

## 11. PRÉPARATION PRODUCTION

| Élément | Statut |
|---------|--------|
| Variables d’environnement | `.env.example` complet |
| Build frontend | Vite, drop console en prod |
| CORS | Configuré via FRONTEND_URL |
| Docker | docker-compose avec MySQL, Redis |
| Nginx | prod.conf avec SSL, rate limit |
| Logs | Morgan configuré |
| Erreurs | Middleware centralisé |
| Health check | `/api/health` |

---

## 12. PARCOURS UTILISATEURS (SIMULATION)

### Visiteur

- Navigation : Index → Patrimoine → Oeuvres → Événements → Artisanat → OK
- Risques : endpoints mobile patrimoine 404 si utilisés

### Professionnel

- Connexion → Dashboard Pro → Ajouter Oeuvre/Événement/Service → OK
- Risques : routes benchmark/recommendations 501 si appelées

### Administrateur

- Connexion → Dashboard Admin → Gestion users, oeuvres, événements, signalements → OK
- Risques : `/admin/users`, `/admin/metadata`, `/admin/validation` sont des placeholders

---

## 13. RAPPORT FINAL

### 13.1 Problèmes critiques (bloquants)

1. **Routes patrimoine mobile inexistantes** : `nearby`, `qr-scan`, `offline` utilisées dans config frontend → 404
2. **Pages admin placeholders** : `/admin/users`, `/admin/metadata`, `/admin/validation` → expérience dégradée
3. **Incohérence lieux** : `detail-lieux` vs `details` → risque 404

### 13.2 Problèmes importants

4. Routes professionnel 501 (benchmark, recommendations, support/ticket)
5. `useLieuSearch` : endpoint `detail-lieux` vs backend `details`
6. Géographie : `communes` vs `dairas` selon le contexte
7. Doublon bcrypt/bcryptjs
8. Console.log à remplacer par un logger

### 13.3 Bugs potentiels

9. Export utilisateurs : route dashboard à valider
10. Champs `preferences` et `privacy_settings` sur User à confirmer dans le schéma
11. Risk N+1 sur listes avec nombreuses associations

### 13.4 Incohérences architecture

12. `languageRoutes`, `multilingualRoutes` non montés
13. Endpoints mobile patrimoine prévus mais non implémentés

### 13.5 Endpoints inutilisés

- `GET /oeuvres/popular`
- `GET /oeuvres/:id/share-links`
- `POST /oeuvres/:id/submit`
- `GET /evenements/:id/share-data`, `/export`
- `POST /evenements/:id/publish`
- `POST /lieux/check-duplicate`

### 13.6 Routes cassées / à risque

- `GET /patrimoine/mobile/*` → 404
- `GET /lieux/:id/detail-lieux` (si utilisé) → 404 (backend : `details`)
- `GET /geography/wilayas/:id/communes` → 404 (backend : metadata/wilayas/dairas)

### 13.7 Améliorations recommandées

- Implémenter ou désactiver les routes patrimoine mobile
- Remplacer les placeholders admin par de vraies pages
- Aligner `useLieuSearch` sur `/lieux/:id/details`
- Remplacer les console.log par un logger (Winston)
- Supprimer bcryptjs
- Implémenter ou retirer les routes 501
- Monter ou supprimer languageRoutes, multilingualRoutes
- Auditer les requêtes N+1

### 13.8 Checklist préparation production

| Item | Statut |
|------|--------|
| JWT_SECRET robuste (≥32 car) | À vérifier |
| Variables .env complètes | OK si .env.example suivi |
| DB_SYNC=false en prod | À configurer |
| REDIS_PASSWORD en prod | Recommandé |
| Build frontend sans erreur | À tester |
| Health check opérationnel | OK |
| Logs sans données sensibles | À vérifier |
| CORS restrictif | OK |
| Rate limiting actif | OK |
| HTTPS (Nginx) | OK (prod.conf) |
| Backup base de données | Script deploy.sh |
| Tests critiques | À exécuter |
| Documentation déploiement | deploy.sh présent |

---

**Verdict :** L’application est globalement prête pour la production, avec des correctifs à apporter sur les routes patrimoine mobile, les pages admin placeholders et quelques incohérences frontend/backend listées ci-dessus.
