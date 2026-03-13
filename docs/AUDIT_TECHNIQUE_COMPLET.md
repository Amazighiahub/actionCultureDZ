# Audit technique complet — EventCulture

**Date** : 11 mars 2025  
**Objectif** : Vérifier que l'application est stable, cohérente et prête pour une mise en production.

**Stack** : React/Vite (frontend), Node.js/Express (backend), MySQL/Sequelize, Docker.

---

## 1. Architecture globale

### 1.1 Structure du projet

| Dossier | Rôle |
|---------|------|
| `backend/` | API Node.js (controllers, services, repositories, models) |
| `frontEnd/` | SPA React (components, pages, hooks, services) |
| `nginx/` | Configuration Nginx production |
| `docs/` | Documentation |

### 1.2 Architecture backend

- **Pattern** : Controller → Service → Repository
- **Auth** : JWT (cookies httpOnly en priorité)
- **i18n** : messages backend en 5 langues (fr, ar, en, tz-ltn, tz-tfng)

### 1.3 Architecture frontend

- **State** : TanStack Query, React hooks
- **Routing** : React Router 6, lazy loading
- **i18n** : react-i18next, 5 locales

### 1.4 Cohérence globale

✅ **Points forts** : Architecture claire, séparation des responsabilités, pattern Service/Repository cohérent.

⚠️ **Point d’attention** : Certaines routes V2 n’utilisent pas express-validator ; validation partiellement dans les services.

---

## 2. Routes et redirections — PROBLÈMES CRITIQUES

### 2.1 Routes inexistantes (→ 404)

| Path utilisé | Source | Impact |
|--------------|--------|--------|
| `/unauthorized` | PermissionGuard.tsx | Redirection 404 |
| `/login` | PermissionGuard.tsx | Doit être `/auth` |
| `/403` | utils/Permissions.tsx | Redirection 404 |
| `/verification-email-envoyee` | useAuth.ts | Page non créée |
| `/admin/settings` | DashboardAdmin.tsx | Bouton vers 404 |
| `/profil/modifier` | DashboardUser.tsx | Lien profil cassé |
| `/admin/patrimoine/:id` | AjouterPatrimoine (post-create) | Redirect cassé |

### 2.2 Chemins incorrects

| Utilisé | Correct | Fichier |
|---------|---------|---------|
| `/admin?tab=...` | `/admin/dashboard?tab=...` | AdminOverview.tsx |
| `/events`, `/events/:id` | `/evenements`, `/evenements/:id` | CreateProgrammePage, ViewProgrammePage, EditProgrammePage |

### 2.3 Pages programmes non montées

Les pages `CreateProgrammePage`, `ViewProgrammePage`, `EditProgrammePage` utilisent `/events/*` mais ne sont **pas montées** dans `App.tsx`. Les routes `/evenements/:id/programmes/create`, etc. n’existent pas.

### 2.4 Route articles

`Create.tsx` redirige vers `/articles` après création, mais seule la route `/articles/:id` existe (pas de liste d’articles).

---

## 3. Protection des routes

### 3.1 Frontend

- `ProtectedRoute` : auth requise, support `requireAdmin`, `requireProfessional`, `requireValidated`
- `AdminRoute` : Admin uniquement
- `ProfessionalRoute` : Professionnel validé (`statut === 'actif'`)

### 3.2 Backend

- `authenticate` : JWT requis
- `requireRole(['Admin','Moderateur'])` : contrôle par rôle
- `requireValidatedProfessional` : pro validé ou admin

✅ Alignement correct entre frontend et backend.

---

## 4. Chargement des pages

### 4.1 Lazy loading

- Pages principales en `React.lazy`
- `Suspense` avec fallback
- `ErrorBoundary` sur certains blocs

### 4.2 Requêtes au chargement

**Dashboard Admin** : **12 appels API** au montage (useEffect sans dépendances) — risque de lenteur et surcharge.

**Dashboard Pro** : 5–6 requêtes en parallèle (stats, œuvres, événements, artisanats, services, patrimoine) — acceptable.

### 4.3 Recommandations

- Charger les onglets Admin à la demande (load on tab focus)
- Réduire les requêtes initiales du dashboard admin

---

## 5. Actualisation des données

### 5.1 TanStack Query

- `staleTime` 5 min sur les listes
- `invalidateQueries` après create/update/delete
- `refetch` manuel via boutons "Actualiser"

### 5.2 Points d’attention

- Après validation d’un utilisateur ou d’une œuvre, invalidation correcte
- Suppression : `httpClient.clearCache()` + invalidation des queries pertinentes

✅ Gestion globalement correcte.

---

## 6. Formulaires et validations

### 6.1 Schémas Zod non utilisés

- Schémas présents dans `lib/validation/schemas.ts`
- **Pas de `zodResolver`** connecté aux formulaires
- Validations manuelles dans `handleSubmit` avec `validateForm()` locales

### 6.2 Validations backend partielles

| Module | express-validator | Commentaire |
|--------|-------------------|-------------|
| oeuvres (V2) | ❌ Non | Validation dans service/DTO |
| evenements (V2) | ❌ Non | Idem |
| patrimoine (V2) | ❌ Non | Idem |
| artisanat (V2) | ❌ Non | Idem |
| users (register) | ❌ Non | Vérification doublon email dans service |
| lieu, programme, dashboard | ✅ Oui | Body/query validés |

### 6.3 Incohérences frontend/DB

| Entité | Champ | Schéma Zod | Modèle DB |
|--------|-------|------------|-----------|
| Oeuvre | id_langue | optionnel | allowNull: false |
| Oeuvre | description | - | allowNull: true |

### 6.4 Associations

- **Oeuvre** : Pas de vérification d’existence des éditeurs/intervenants avant création
- **Evenement** : Lieu et type d’événement vérifiés dans le service
- **Patrimoine** : Lieu créé en premier, puis monuments/vestiges/services — ordre correct
- **User** : Doublon email géré (findByEmail + contrainte unique)

---

## 7. Images et médias

### 7.1 Helpers d’URL

- `getAssetUrl()` : construction d’URL à partir de chemins relatifs
- `getImageUrl()` : fallback vers `/images/placeholder.jpg`
- `LazyImage` : composant avec fallback et lazy loading

### 7.2 Chemins

- Backend : `/uploads/images/`, `/uploads/documents/`, etc.
- Frontend : `API_BASE_URL` + chemin relatif
- Placeholder : `/images/placeholder-media.png`, `/images/placeholder.jpg`

### 7.3 Points d’attention

- `upload.service.ts` : `console.log` à retirer en production
- Cohérence des chemins entre backend et frontend à vérifier en prod (BASE_URL)

---

## 8. Uploads de fichiers

### 8.1 Backend

- **FileValidator** : validation MIME réelle (pas uniquement extension)
- **Multer** : tailles max par type (image, document, vidéo, audio)
- **Limites** : 10MB images/docs, 100MB vidéo, etc.
- **Sécurité** : validation type + taille côté serveur

### 8.2 Routes upload

| Endpoint | Auth | Validation |
|----------|------|------------|
| POST /api/upload/image/public | Non (rate limit) | FileValidator |
| POST /api/upload/image | Oui | FileValidator |
| POST /api/upload/document | Oui | FileValidator |
| POST /api/upload/video | Oui | FileValidator |
| POST /api/upload/audio | Oui | FileValidator |
| POST /api/upload/oeuvre/media | Pro validé | Batch FileValidator |

### 8.3 Sécurité upload

✅ Types MIME validés, tailles limitées, nettoyage des fichiers invalides.

---

## 9. Carte et patrimoine

- Composants : `CartePatrimoine`, `PatrimoineDetail`, `VisitePlanner`
- Lieux, monuments, vestiges, services : relations cohérentes
- Formulaire `AjouterPatrimoine` : Lieu créé avant les sous-entités

⚠️ Post-create redirect vers `/admin/patrimoine/:id` alors que la route est `/admin/patrimoine/modifier/:id`.

---

## 10. Système multilingue

### 10.1 Langues supportées

- fr, ar, en, tz-ltn, tz-tfng
- Champs JSON : `{ fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' }`

### 10.2 Traductions

- Frontend : `i18n/locales/{lang}/translation.json`
- Backend : `i18n/messages/{lang}.json`
- Certaines clés tz-ltn en `[TODO TZ-LTN]`

### 10.3 RTL

- Composant `RtlManager` pour arabe
- Direction gérée via i18n

⚠️ Compléter les traductions tz-ltn et vérifier la cohérence des clés.

---

## 11. Performance

### 11.1 Composants lourds

- `ArticleEditor` : éditeur riche, potentiellement coûteux
- `DashboardAdmin` : 12 requêtes au montage
- `Index` (page d’accueil) : plusieurs sections, wilayas, stats, notifications

### 11.2 Requêtes SQL

- Utilisation de `include` Sequelize, risque de N+1 sur certaines listes
- Cache backend sur dashboard (TTL 5–10 min)

### 11.3 Cache

- TanStack Query : staleTime 5 min
- Backend : Map en mémoire pour dashboard
- Redis : rate limiting, sessions

---

## 12. Sécurité

### 12.1 Authentification

- JWT avec cookies httpOnly (priorité)
- Fallback Authorization header
- Refresh token

### 12.2 Protection des routes

- Middlewares `authenticate`, `requireRole`, `requireValidatedProfessional`
- Vérification `statut` (actif, en_attente_validation, etc.)

### 12.3 Validation des entrées

- express-validator sur certaines routes
- Sanitization via `securityMiddleware`
- Validation des uploads côté serveur

### 12.4 Points de vigilance

- Vérifier qu’aucune route sensible n’échappe aux middlewares
- Logs contenant des données sensibles à limiter en production

---

## 13. Documentation

### 13.1 Fichiers disponibles

- `README.md`, `ARCHITECTURE.md`, `API.md`
- `README-DOCKER.md`, `README_LOCAL_DEV.md`
- `SECURITY.md`, `SECURITY_GUIDELINES.md`
- Docs métier : `EVENEMENTS.md`, `PATRIMOINE.md`, `OEUVRES.md`, etc.

### 13.2 Qualité

✅ Documentation riche.  
⚠️ Mettre à jour après les dernières modifications (merge statut, séparation Services/Artisanat).

---

## 14. Docker

### 14.1 Configuration

- `docker-compose.yml` : dev (backend, frontend, mysql, redis)
- `docker-compose.prod.yml` : production
- Healthchecks configurés
- Volumes pour uploads et logs

### 14.2 Variables d’environnement

- `.env.example` fourni
- Variables critiques : `DB_*`, `JWT_SECRET`, `VITE_API_URL`, `FRONTEND_URL`, `UPLOAD_*`

⚠️ Vérifier que `.env` n’est pas commité (présent dans `.gitignore`).

---

# Synthèse des problèmes

## Critiques (bloquant production)

1. **Routes 404** : `/unauthorized`, `/403`, `/verification-email-envoyee`, `/admin/settings`, `/profil/modifier` — corriger ou créer les pages
2. **Redirect admin** : `/admin?tab=...` → utiliser `/admin/dashboard?tab=...`
3. **Pages programmes** : Routes `/evenements/:id/programmes/*` non montées — ajouter ou supprimer les composants
4. **Redirect post-create patrimoine** : utiliser `/admin/patrimoine/modifier/:id`

## Bugs potentiels

1. **PermissionGuard** : utilise `/login` au lieu de `/auth`
2. **Create.tsx** : redirect vers `/articles` (route inexistante)
3. **Schémas Zod** : non utilisés, risque de divergence avec la logique réelle
4. **Oeuvre id_langue** : requis en DB, optionnel dans le schéma Zod

## Incohérences

1. **Validations** : express-validator absent sur plusieurs routes V2
2. **Oeuvre** : pas de vérification d’existence des éditeurs/intervenants
3. **Traductions** : clés tz-ltn en TODO

## Performance

1. **Dashboard Admin** : 12 appels API au chargement — charger à la demande par onglet
2. **console.log** : encore présents dans upload.service et éventuellement d’autres fichiers

## Sécurité

- Authentification et protection des routes globalement correctes
- Validation des uploads correcte

---

# Recommandations prioritaires

### Avant mise en production

1. Créer ou rediriger les routes manquantes (`/unauthorized`, `/403`, `/verification-email-envoyee`, `/admin/settings`, `/profil/modifier`)
2. Corriger toutes les redirections incorrectes
3. Monter ou retirer les routes de gestion des programmes
4. Retirer les `console.log` de production
5. Vérifier les variables d’environnement et la configuration upload en prod

### Court terme

1. Brancher les schémas Zod aux formulaires (useForm + zodResolver)
2. Ajouter express-validator sur les routes V2
3. Implémenter le chargement à la demande du dashboard admin
4. Compléter les traductions manquantes (tz-ltn)

### Moyen terme

1. Vérifier l’existence des éditeurs/intervenants avant création d’œuvres
2. Harmoniser les règles multilingues (fr obligatoire, autres optionnels)
3. Auditer les requêtes SQL pour limiter les N+1
4. Mettre à jour la documentation après chaque évolution majeure
