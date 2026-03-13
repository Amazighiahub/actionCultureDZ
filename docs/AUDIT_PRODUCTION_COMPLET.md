# Audit Technique Complet — EventCulture
## Évaluation de Production

**Date** : 12 mars 2026  
**Objectif** : Évaluer si l'application peut être déployée en production et supporter de vrais utilisateurs.  
**Stack** : React/Vite (frontend), Node.js/Express (backend), MySQL/Sequelize, Docker, Redis, Nginx.

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Scalabilité](#2-scalabilité)
3. [Performance](#3-performance)
4. [Routes et navigation](#4-routes-et-navigation)
5. [Formulaires et associations](#5-formulaires-et-associations)
6. [Images et uploads](#6-images-et-uploads)
7. [Sécurité](#7-sécurité)
8. [Carte interactive et patrimoine](#8-carte-interactive-et-patrimoine)
9. [Multi-langues](#9-multi-langues)
10. [Docker et déploiement](#10-docker-et-déploiement)
11. [Documentation](#11-documentation)
12. [Simulation d'utilisation réelle](#12-simulation-dutilisation-réelle)
13. [Rapport final — Synthèse](#13-rapport-final--synthèse)

---

## 1. Architecture globale

### 1.1 Structure du projet

```
EventCulture/
├── backend/          → API Node.js/Express (controllers, services, repositories, models)
├── frontEnd/         → SPA React/Vite (components, pages, hooks, services, i18n)
├── nginx/            → Configuration Nginx (prod.conf, initial.conf)
├── docs/             → Documentation technique et métier
├── scripts/          → Scripts de déploiement (setup-server.sh, deploy.sh)
├── .github/          → CI/CD (deploy.yml)
├── docker-compose.yml       → Développement
└── docker-compose.prod.yml  → Production
```

### 1.2 Diagramme d'architecture

```
┌────────────────────────────────────────────────┐
│                 UTILISATEURS                    │
└──────────────────────┬─────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│  NGINX (reverse proxy)                            │
│  - SSL/TLS 1.2+1.3 (Let's Encrypt)              │
│  - Rate limiting (10r/s API, 3r/s login)         │
│  - Gzip, sécurité headers, assets cache          │
└──────────┬──────────────────────┬────────────────┘
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────┐
│  FRONTEND        │   │  BACKEND (Express)        │
│  React SPA       │   │  Port 3001                │
│  (Nginx serve)   │   │  - REST API               │
└──────────────────┘   │  - Socket.IO (real-time)   │
                       │  - Bull (job queues)       │
                       └──────┬──────────┬─────────┘
                              ▼          ▼
                     ┌────────────┐  ┌────────┐
                     │ MySQL 8.0  │  │ Redis 7│
                     │ Port 3306  │  │Port 6379│
                     └────────────┘  └────────┘
```

### 1.3 Pattern backend

**Controller → Service → Repository → Model (Sequelize)**

- Séparation claire des responsabilités
- DTOs pour validation des données entrantes
- Middlewares d'authentification, autorisation, validation, rate limiting

### 1.4 Pattern frontend

- **State** : TanStack Query (cache/fetch), React Context (auth), Zustand (partiel)
- **Routing** : React Router 6 avec lazy loading
- **i18n** : react-i18next (5 langues : fr, ar, en, tz-ltn, tz-tfng)
- **UI** : Radix UI + Tailwind CSS + Shadcn/ui

### 1.5 Évaluation

| Aspect | Note | Commentaire |
|--------|------|-------------|
| Séparation front/back | ✅ Bon | API REST + SPA séparés |
| Pattern Controller/Service/Repository | ✅ Bon | Bien structuré |
| Code splitting | ✅ Bon | Toutes les pages en React.lazy |
| Gestion des erreurs | ⚠️ Moyen | ErrorBoundary partiel, pas au root |
| Cohérence des conventions | ⚠️ Moyen | Mélange de patterns (useState vs TanStack Query) |

---

## 2. Scalabilité

### 2.1 Gestion des requêtes concurrentes

| Composant | Capacité | Risque |
|-----------|----------|--------|
| Express | Mono-thread (event loop) | Moyen — suffisant pour charge modérée |
| MySQL | Pooling via Sequelize | ✅ Configuré |
| Redis | Cache et sessions | ✅ Configuré |
| Socket.IO | WebSockets | Moyen — pas de Redis adapter pour multi-instance |

### 2.2 Goulots d'étranglement identifiés

| Problème | Sévérité | Localisation |
|----------|----------|--------------|
| **Dashboard Admin : 12 appels API au montage** | 🔴 Critique | `useDashboardAdmin.ts` — charge tout sans lazy loading par onglet |
| **Dashboard Pro : N+1 sur programmes** | 🟠 Élevé | `useDashboardPro.ts` — 1 appel par événement pour `getProgrammes()` |
| **Pas de clustering Node.js** | 🟠 Élevé | Mono-process, pas de PM2 cluster ou Kubernetes |
| **Socket.IO sans Redis adapter** | 🟡 Moyen | Limite à une seule instance backend |
| **Pas de CDN pour les assets statiques** | 🟡 Moyen | Images servies directement par Nginx |

### 2.3 Limites de mise à l'échelle

| Type | Supporté | Action requise |
|------|----------|----------------|
| Scaling vertical | ✅ Oui | Augmenter RAM/CPU Docker |
| Scaling horizontal backend | ⚠️ Partiel | Nécessite Redis adapter pour Socket.IO + sessions partagées |
| Scaling horizontal DB | ❌ Non | Pas de read replicas, pas de sharding |

### 2.4 Estimation de charge

En l'état actuel, l'application peut raisonnablement supporter **50-100 utilisateurs simultanés**. Au-delà, les 12 appels API du dashboard admin et l'absence de clustering deviennent des problèmes.

---

## 3. Performance

### 3.1 Frontend

#### Bundle

| Aspect | Statut | Détail |
|--------|--------|--------|
| Minification | ✅ | Terser avec `drop_console`, `drop_debugger` |
| Code splitting | ✅ | `manualChunks` (react, UI, data, utils, i18n, maps, charts) |
| Tree-shaking | ✅ | Vite + Rollup, ES modules |
| Source maps prod | ✅ | Désactivées |
| Gzip | ✅ | Nginx configuré |

#### Problèmes identifiés

| Problème | Sévérité | Détail |
|----------|----------|--------|
| **moment + date-fns** en double | 🟡 Moyen | `moment` est lourd (~300KB) ; `date-fns` suffit |
| **react-toastify + sonner** en double | 🟡 Moyen | Deux systèmes de toast |
| **react-intl + react-i18next** en double | 🟡 Moyen | Consolider sur un seul |
| **jimp + sharp** en double (backend) | 🟡 Moyen | Garder uniquement `sharp` |
| **recharts** non lazy-loaded | 🟡 Moyen | Librairie lourde importée dans les dashboards |

#### Requêtes API inutiles

| Composant | Problème |
|-----------|----------|
| `useDashboardAdmin` | 12 appels simultanés, même pour les onglets non visibles |
| `useDashboardPro` | N+1 : un appel `getProgrammes()` par événement |
| `httpClient.invalidateCache` | Supprime du `localStorage` au lieu du cache mémoire réel |

### 3.2 Backend

| Aspect | Statut | Détail |
|--------|--------|--------|
| Compression | ✅ | Middleware `compression` |
| Cache dashboard | ✅ | TTL 5-10 min en mémoire |
| Rate limiting | ✅ | Express-rate-limit + Redis |
| Timeout | ✅ | 30s par défaut |

#### Problèmes identifiés

| Problème | Sévérité | Localisation |
|----------|----------|--------------|
| **Evenement virtuals N+1** | 🟠 Élevé | `nombre_participants`, `nombre_inscrits`, `note_moyenne` — chaque champ fait une requête par événement dans une liste |
| **Recherche avec SQL brut interpolé** | 🟠 Élevé | `oeuvreRepository.searchAdvanced` — `LIKE '%${safeQuery}%'` dans `literal()` |
| **Pas de pagination sur certains endpoints** | 🟡 Moyen | `findPopular`, `findByOeuvre` (événements) |

### 3.3 Base de données

#### Index manquants

| Table | Colonnes | Impact |
|-------|----------|--------|
| **services** | `id_lieu`, `id_user`, `statut`, `type_service` | Aucun index défini — performances dégradées |
| **artisanat** | `id_oeuvre`, `id_materiau`, `id_technique` | Clés étrangères sans index |
| **commentaire** | `id_user`, `id_oeuvre`, `id_evenement`, `statut` | Filtres fréquents sans index |
| **lieu** | `typePatrimoine` | Utilisé dans `findPopular` |
| **oeuvre** | `statut`, `saisi_par`, `date_creation` | Listings et filtres |
| **user** | `email_verifie`, `(statut, id_type_user)` | Auth et modération |
| **media** | `(id_oeuvre, id_evenement)` | Lookups composites |

---

## 4. Routes et navigation

### 4.1 Routes frontend — Couverture complète

✅ Toutes les routes sont définies et protégées (voir tableau section Architecture).

#### Protections par rôle

| Route | Protection |
|-------|-----------|
| Pages publiques | Aucune (patrimoine, événements, œuvres, artisanat, articles) |
| Dashboards | `ProtectedRoute` (user), `ProfessionalRoute` (pro), `AdminRoute` (admin) |
| Création/modification | `ProfessionalRoute` (pro validé) |
| Admin patrimoine | `AdminRoute` |
| Notifications | `ProtectedRoute` |

### 4.2 Problèmes corrigés lors de cet audit

| Problème | Correction |
|----------|-----------|
| `/unauthorized` → 404 | Redirigé vers `/auth` |
| `/403` → 404 | Redirigé vers `/auth` |
| `/login` → 404 | Redirigé vers `/auth` |
| `/admin?tab=` → 404 | Corrigé en `/admin/dashboard?tab=` |
| `/admin/settings` → 404 | Redirigé vers `/admin/dashboard?tab=overview` |
| `/profil/modifier` → 404 | Redirigé vers `/dashboard-user` |
| `/verification-email-envoyee` → 404 | Page créée |
| `/admin/patrimoine/:id` redirect cassé | Corrigé en `/admin/patrimoine/modifier/:id` |
| Pages Programme non montées | Routes ajoutées dans App.tsx |
| `/events/` dans Programme pages | Corrigé en `/evenements/` |
| `Create.tsx` → `/articles` | Corrigé en `/oeuvres` |

### 4.3 Problèmes restants

| Problème | Sévérité |
|----------|----------|
| Pas de route `/articles` (liste d'articles) | 🟡 Moyen — seul `/articles/:id` existe |

---

## 5. Formulaires et associations

### 5.1 Validations

| Couche | Statut | Détail |
|--------|--------|--------|
| Frontend (Zod) | ⚠️ Défini mais non connecté | Schémas dans `lib/validation/schemas.ts` mais pas de `zodResolver` |
| Frontend (manuel) | ✅ | `validateForm()` dans les `handleSubmit` |
| Backend (express-validator) | ⚠️ Partiel | Ajouté aux routes V2 lors de cet audit, mais encore minimal |
| Backend (Service/DTO) | ✅ | DTOs avec validation pour les principales entités |

### 5.2 Associations vérifiées

#### Œuvres
| Vérification | Statut |
|-------------|--------|
| TypeOeuvre existe | ✅ Vérifié dans le service |
| Éditeur existe | ⚠️ Non vérifié avant création |
| Intervenant existe | ⚠️ Non vérifié avant création |

#### Événements
| Vérification | Statut |
|-------------|--------|
| Lieu existe | ✅ Vérifié dans le service |
| TypeEvenement existe | ✅ Vérifié |
| Participant déjà inscrit | ✅ Unique constraint + vérification |

#### Patrimoine
| Vérification | Statut |
|-------------|--------|
| Lieu créé avant monuments/vestiges | ✅ Ordre correct |
| Commune existe | ✅ Vérifié dans le service |

#### Utilisateurs
| Vérification | Statut |
|-------------|--------|
| Doublon email | ✅ Contrainte unique + vérification |
| Password hashé | ⚠️ **Pas de hook beforeCreate** — hashé dans service uniquement |

### 5.3 Incohérences critiques

| Problème | Sévérité | Détail |
|----------|----------|--------|
| **`statut_validation` encore utilisé dans 20+ fichiers** | 🔴 Critique | La migration fusionne en `statut`, mais le backend référence encore `statut_validation` dans repositories, services, controllers, DTOs |
| **`oeuvreRepository` utilise `valide_par` au lieu de `validateur_id`** | 🔴 Critique | Le modèle Oeuvre définit `validateur_id`, mais le repository écrit dans `valide_par` |
| **`oeuvreRepository` utilise `motif_refus` au lieu de `raison_rejet`** | 🔴 Critique | Même problème : nom de colonne incorrect |
| **`oeuvreRepository` utilise `refuse` au lieu de `rejete`** | 🟠 Élevé | Valeur ENUM incorrecte pour le statut de rejet |
| **`nb_vues` absent du modèle Oeuvre** | 🟠 Élevé | `oeuvreRepository.incrementViews()` incrémente `nb_vues` qui n'existe que sur Article |
| **OeuvreIntervenant : `hasMany(Oeuvre)` au lieu de `belongsTo(Oeuvre)`** | 🟠 Élevé | Association incorrecte sur une table de jonction |
| **Commentaire sans cible obligatoire** | 🟡 Moyen | `id_oeuvre` et `id_evenement` tous deux nullable — commentaire sans entité possible |

---

## 6. Images et uploads

### 6.1 Configuration

| Aspect | Valeur | Statut |
|--------|--------|--------|
| Taille max images | 10 MB | ✅ |
| Taille max vidéos | 500 MB | ✅ |
| Taille max audio | 100 MB | ✅ |
| Taille max documents | 50 MB | ✅ |
| Validation MIME | Magic numbers + extension | ✅ Excellente |
| Protection path traversal | `_securePath()` + filenames générés | ✅ |
| Formats autorisés | jpg, png, gif, webp, mp4, mp3, pdf, docx... | ✅ |

### 6.2 Chemins de stockage

- Backend : `/uploads/images/`, `/uploads/documents/`, `/uploads/videos/`, `/uploads/audio/`
- Frontend : `API_BASE_URL` + chemin relatif
- Placeholder : `/images/placeholder-media.png`, `/images/placeholder.jpg`
- Volumes Docker : `backend_uploads` persisté

### 6.3 Problèmes

| Problème | Sévérité |
|----------|----------|
| **`photo_url` accepte une URL arbitraire** dans `updateProfilePhoto` | 🟠 Élevé — risque SSRF/injection de contenu |
| **Nginx nested location pour bloquer .php** dans `/uploads` peut ne pas fonctionner | 🟡 Moyen |
| **Pas de nettoyage périodique des fichiers orphelins** | 🟡 Moyen |

---

## 7. Sécurité

### 7.1 Bilan global

| Aspect | Note |
|--------|------|
| Authentification JWT | ✅ Bon (cookies httpOnly, secure, sameSite) |
| Autorisation RBAC | ✅ Bon (requireRole, requireAdmin, requireOwnership) |
| Protection XSS | ✅ Bon (Helmet, sanitizeInput, CSP partiel) |
| Protection SQL injection | ✅ Bon (Sequelize paramétré) |
| Rate limiting | ✅ Bon (global + spécifique) |
| CORS | ✅ Bon (configurable, credentials) |
| Validation uploads | ✅ Excellent (magic numbers, MIME, extension, taille) |
| SSL/TLS | ✅ Excellent (TLS 1.2+1.3, HSTS, OCSP) |

### 7.2 Vulnérabilités identifiées

| Problème | Sévérité | Détail |
|----------|----------|--------|
| **Refresh token = access token expiré avec `ignoreExpiration: true`** | 🔴 Critique | Pas de token de refresh séparé, pas de rotation, pas de révocation. Un token volé permet un accès indéfini. |
| **Account lockout non appliqué** | 🔴 Critique | `accountRateLimiter.checkAccountLock` existe mais n'est JAMAIS appliqué sur la route login. Brute-force possible. |
| **Packages avec CVE connues** | 🔴 Critique | sequelize < 6.37.8 (CVE-2026-30951), express < 4.22.0 (CVE-2024-51999), mysql2 < 3.9.3 (CVE-2024-21507) |
| **Rate limiters sur mauvais chemins** | 🟠 Élevé | `/api/users/forgot-password` et `/api/users/reset-password` n'existent pas ; les vraies routes sont `/api/email-verification/request-password-reset` |
| **`checkEmail` permet l'énumération d'utilisateurs** | 🟠 Élevé | Réponse différente selon que l'email existe ou non |
| **Erreurs Sequelize exposent les valeurs de champs** | 🟡 Moyen | `value: err.value` dans les erreurs de validation retournées au client |
| **CSP avec `'unsafe-inline'`** | 🟡 Moyen | Réduit l'efficacité de la CSP |
| **Password hashé dans le service, pas dans le model** | 🟡 Moyen | `User.create()` direct pourrait stocker un mot de passe en clair |

### 7.3 IDOR (Insecure Direct Object Reference)

✅ Les routes sensibles vérifient la propriété des ressources via `requireOwnership` ou `requireRole`. Pas de faille IDOR majeure détectée.

---

## 8. Carte interactive et patrimoine

### 8.1 Relations

```
Lieu (latitude, longitude, commune)
 ├── DetailLieu (1:1)
 │    ├── Monument[] (hasMany)
 │    └── Vestige[] (hasMany)
 ├── Service[] (hasMany)
 ├── LieuMedia[] (hasMany)
 └── Evenement[] (hasMany, via id_lieu)
```

✅ Les relations sont correctement définies et la hiérarchie Lieu → DetailLieu → Monuments/Vestiges est respectée.

### 8.2 Composants carte

- `CartePatrimoine` : Leaflet + React Leaflet
- `PatrimoineDetail` : Affichage détaillé avec galerie, QR code, carte de visite
- `VisitePlanner` : Planificateur de visites

### 8.3 Problèmes

| Problème | Sévérité |
|----------|----------|
| **Données statiques hardcodées** dans `CartePatrimoine.tsx` (ex: "Casbah d'Alger") | 🟡 Moyen |
| **Pas de validation latitude/longitude** côté route pour `getMobileNearby` | 🟡 Moyen — validation dans le controller uniquement |
| **QR Code : `scanQRCode` vérifie le format mais pas de rate limiting spécifique** | 🟢 Faible |

---

## 9. Multi-langues

### 9.1 Configuration

| Aspect | Valeur |
|--------|--------|
| Langues | fr, ar, en, tz-ltn (Tamazight latin), tz-tfng (Tamazight Tifinagh) |
| Fallback | fr |
| Backend | `backend/i18n/messages/{lang}.json` |
| Frontend | `frontEnd/i18n/locales/{lang}/translation.json` |
| RTL | `RtlManager` pour arabe |
| Persistance | Cookie + API `/set-language` |

### 9.2 Couverture

| Aspect | Statut |
|--------|--------|
| Pages publiques | ✅ Internationalisées |
| Dashboards | ✅ Internationalisés |
| Formulaires | ⚠️ Partiellement — strings hardcodées dans `ProgrammeForm`, `MultiLangInput` |
| Messages d'erreur backend | ✅ Via `req.t()` |
| Messages d'erreur frontend | ⚠️ Partiellement |

### 9.3 Problèmes

| Problème | Sévérité |
|----------|----------|
| **Clés tz-ltn en `[TODO TZ-LTN]`** | 🟡 Moyen — langue incomplète |
| **Strings hardcodées** dans `PageLoader` ("Chargement..."), `ProgrammeForm`, `MultiLangInput`, `ArticleEditor` | 🟡 Moyen |
| **react-intl + react-i18next** en double | 🟡 Moyen — consolider |

---

## 10. Docker et déploiement

### 10.1 Configuration

| Fichier | Rôle | Statut |
|---------|------|--------|
| `docker-compose.yml` | Développement | ✅ |
| `docker-compose.prod.yml` | Production | ✅ |
| `backend/Dockerfile` | Multi-stage, user non-root | ✅ |
| `frontEnd/Dockerfile` | Multi-stage, build + Nginx | ✅ |

### 10.2 Healthchecks

| Service | Check | Intervalle |
|---------|-------|-----------|
| Backend | `wget http://localhost:3001/health` | 30s |
| Frontend | `wget http://localhost:80` | 30s |
| MySQL | `mysqladmin ping` | 10s |
| Redis | `redis-cli ping` | 10s |
| Nginx | `wget http://localhost:80/health` | 30s |

### 10.3 Limites de ressources

| Service | Mémoire |
|---------|---------|
| Backend | 512 MB |
| MySQL | 512 MB |
| Redis | 192 MB |

### 10.4 Problèmes

| Problème | Sévérité |
|----------|----------|
| **`VITE_API_URL` non défini par défaut** — le frontend peut ne pas trouver l'API | 🟠 Élevé |
| **Pas de `env_file`** en production — variables à injecter manuellement | 🟡 Moyen |
| **`REDIS_PASSWORD` optionnel** — recommandé en production | 🟡 Moyen |
| **Pas de fichier `.env.example` frontend** | 🟡 Moyen |

### 10.5 Reproductibilité

Pour lancer l'application sur une nouvelle machine :

```bash
# Développement
cp .env.example .env
# Remplir les variables
docker-compose up -d

# Production
# Configurer les variables d'environnement
docker-compose -f docker-compose.prod.yml up -d
```

✅ Le processus est relativement simple, bien que la configuration des variables d'environnement en production nécessite de la documentation.

---

## 11. Documentation

### 11.1 Fichiers disponibles

| Fichier | Contenu |
|---------|---------|
| `README.md` | Vue d'ensemble |
| `ARCHITECTURE.md` | Architecture technique |
| `API.md` | Documentation API |
| `README-DOCKER.md` | Instructions Docker |
| `README_LOCAL_DEV.md` | Développement local |
| `SECURITY.md`, `SECURITY_GUIDELINES.md` | Sécurité |
| `EVENEMENTS.md`, `PATRIMOINE.md`, `OEUVRES.md` | Documentation métier |

### 11.2 Évaluation

| Aspect | Statut |
|--------|--------|
| Clarté des instructions | ✅ Bonne |
| Couverture | ✅ Bonne |
| Duplication | ⚠️ Quelques duplications (SECURITY.md + SECURITY_GUIDELINES.md) |
| À jour | ⚠️ À mettre à jour après les modifications (merge statut, séparation Services/Artisanat) |
| Reprise par un développeur | ✅ Possible avec la documentation existante |

---

## 12. Simulation d'utilisation réelle

### 12.1 Scénario Visiteur

| Action | Résultat attendu | Risque |
|--------|-------------------|--------|
| Inscription | ✅ Création + email vérification | Pas de rate limiting sur l'inscription |
| Parcourir patrimoine | ✅ Liste paginée + carte | OK |
| Détail d'un site | ✅ Infos + galerie + QR | OK |
| Parcourir événements | ✅ Liste paginée | OK |
| S'inscrire à un événement | ✅ Via EvenementUser | Unique constraint protège les doublons |
| Ajouter aux favoris | ✅ Via Favori polymorphique | Unique constraint |
| Commenter | ✅ Via Commentaire | Commentaire sans cible possible (bug) |

### 12.2 Scénario Professionnel

| Action | Résultat attendu | Risque |
|--------|-------------------|--------|
| Inscription pro | ✅ En attente validation admin | OK |
| Accès dashboard pro | ✅ Bloqué tant que `statut ≠ actif` | OK |
| Créer une œuvre | ✅ Avec médias, intervenants | Éditeur non vérifié avant création |
| Créer un événement | ✅ Avec lieu, type | OK |
| Créer un service | ✅ | OK |
| Modifier ses contenus | ✅ | OK |
| Supprimer ses contenus | ✅ | Pas de soft delete |
| Voir ses statistiques | ✅ | `nb_vues` absent sur Oeuvre |

### 12.3 Scénario Administrateur

| Action | Résultat attendu | Risque |
|--------|-------------------|--------|
| Voir dashboard | ⚠️ 12 appels API simultanés | Lenteur si beaucoup de données |
| Valider un professionnel | ⚠️ **Utilise encore `statut_validation`** dans certains fichiers | **Bug bloquant** |
| Valider une œuvre | ⚠️ **`valide_par` au lieu de `validateur_id`** | **Bug bloquant** |
| Gérer les signalements | ⚠️ `Signalement.process` appelle des méthodes non implémentées | **Bug bloquant** |
| Modérer les commentaires | ✅ | OK |
| Voir les statistiques | ✅ | OK |

---

## 13. Rapport final — Synthèse

### 🔴 Problèmes critiques (bloquant production)

| # | Problème | Impact | Fichiers |
|---|----------|--------|----------|
| 1 | **`statut_validation` encore utilisé dans 20+ fichiers backend** | Validation/rejet de professionnels cassé après migration | repositories, services, controllers, DTOs |
| 2 | **`oeuvreRepository` utilise des noms de colonnes incorrects** (`valide_par`, `motif_refus`, `refuse`) | Validation/rejet d'œuvres échoue silencieusement | `oeuvreRepository.js` L305-318 |
| 3 | **Refresh token = access token expiré** avec `ignoreExpiration: true` | Token volé = accès permanent, pas de révocation | `userService.js` L133 |
| 4 | **Account lockout non appliqué** sur la route login | Brute-force illimité sur les mots de passe | `app.js`, `rateLimitMiddleware.js` |
| 5 | **Packages avec CVE connues** | Vulnérabilités exploitables | sequelize, express, mysql2 |
| 6 | **`nb_vues` absent du modèle Oeuvre** | `incrementViews()` échoue silencieusement | `oeuvre.js`, `oeuvreRepository.js` |
| 7 | **`Signalement.process` appelle des méthodes non implémentées** | Crash lors de la modération de signalements | `signalement.js` L212-239 |

### 🟠 Risques de scalabilité

| # | Problème | Impact |
|---|----------|--------|
| 1 | Dashboard Admin : 12 appels API au montage | Lenteur, surcharge serveur |
| 2 | Dashboard Pro : N+1 sur programmes | Dégradation avec nombre d'événements |
| 3 | Pas de clustering Node.js | Limité à 1 cœur CPU |
| 4 | Champs virtuels Evenement (compteurs) | N+1 en liste |
| 5 | Pas de CDN pour les uploads | Bande passante serveur |

### 🟡 Problèmes de performance

| # | Problème | Impact |
|---|----------|--------|
| 1 | Index manquants sur 7+ tables | Requêtes lentes sur données volumineuses |
| 2 | Dépendances dupliquées (moment+date-fns, 2 toasts, 2 i18n, jimp+sharp) | Bundle plus lourd |
| 3 | `httpClient.invalidateCache` ne vide pas le bon cache | Cache incohérent |
| 4 | Pas de pagination sur certains endpoints backend | OOM possible |

### 🔒 Failles de sécurité

| # | Problème | Sévérité |
|---|----------|----------|
| 1 | Refresh token non sécurisé | 🔴 Critique |
| 2 | Account lockout non appliqué | 🔴 Critique |
| 3 | CVE sur sequelize, express, mysql2 | 🔴 Critique |
| 4 | Rate limiters sur mauvais chemins (password reset) | 🟠 Élevé |
| 5 | `checkEmail` permet énumération d'utilisateurs | 🟠 Élevé |
| 6 | `photo_url` accepte URL arbitraire | 🟠 Élevé |
| 7 | Password non hashé dans le model (hook manquant) | 🟡 Moyen |
| 8 | CSP avec `unsafe-inline` | 🟡 Moyen |

### ⚡ Incohérences frontend/backend/base de données

| # | Problème |
|---|----------|
| 1 | `statut_validation` (backend) vs `statut` (model après migration) |
| 2 | `valide_par` / `motif_refus` (repository) vs `validateur_id` / `raison_rejet` (model) |
| 3 | `OeuvreIntervenant.hasMany(Oeuvre)` au lieu de `belongsTo(Oeuvre)` |
| 4 | `httpClient.showToast` appelle `window.showToast` jamais initialisé — erreurs API invisibles |
| 5 | `EvenementUser.id_evenement` et `id_user` nullable sur une table de participation |
| 6 | Pas de `onDelete` explicite sur la majorité des associations |
| 7 | Relations polymorphiques (Favori, Vue, Signalement) sans intégrité référentielle |

---

### Recommandations — Plan d'action

#### Avant mise en production (P0)

1. ✅ ~~Corriger les routes frontend cassées~~ (fait)
2. ✅ ~~Ajouter express-validator aux routes V2~~ (fait)
3. ✅ ~~Supprimer les console.log~~ (fait)
4. **Remplacer tous les `statut_validation` par `statut`** dans le backend
5. **Corriger `oeuvreRepository`** : `validateur_id`, `raison_rejet`, `rejete`
6. **Implémenter un vrai refresh token** (stockage DB, rotation, révocation)
7. **Appliquer `accountRateLimiter`** sur la route login
8. **Mettre à jour** sequelize (≥6.37.8), express (≥4.22.0), mysql2 (≥3.9.3)
9. **Ajouter `nb_vues`** au modèle Oeuvre
10. **Câbler `httpClient.showToast`** au système de toast global

#### Court terme (P1 — 1-2 semaines)

1. Ajouter les index manquants sur les tables identifiées
2. Implémenter le chargement par onglet du dashboard admin
3. Ajouter un hook `beforeCreate` pour le hashage du password dans le modèle User
4. Corriger les rate limiters sur les bons chemins (password reset)
5. Implémenter `Signalement.process` (deleteContent, suspendUser, warnUser)
6. Ajouter `onDelete` sur les associations critiques
7. Consolider les dépendances dupliquées (moment, toasts, i18n, image processing)
8. Ajouter un ErrorBoundary au root de l'application

#### Moyen terme (P2 — 1 mois)

1. Connecter les schémas Zod aux formulaires (zodResolver)
2. Vérifier existence des éditeurs/intervenants avant création d'œuvres
3. Implémenter le soft delete pour les entités clés
4. Ajouter un Redis adapter pour Socket.IO (scaling horizontal)
5. Optimiser les champs virtuels Evenement (compteurs calculés en SQL)
6. Compléter les traductions tz-ltn
7. Remplacer le SQL brut interpolé par des requêtes paramétrées
8. Mettre en place le nettoyage des fichiers orphelins
9. Mettre à jour la documentation

---

### Verdict final

**L'application N'EST PAS prête pour la production** en l'état actuel.

Les 7 problèmes critiques identifiés (notamment `statut_validation` non migré dans le backend, les noms de colonnes incorrects dans le repository, et les failles de sécurité sur le refresh token et le brute-force) doivent être corrigés avant tout déploiement.

L'architecture est solide et bien structurée. Avec les corrections P0 appliquées (estimées à 2-3 jours de travail), l'application pourra supporter une mise en production pour **50-100 utilisateurs simultanés** avec une charge modérée. Les optimisations P1 et P2 permettront de monter en charge progressivement.
