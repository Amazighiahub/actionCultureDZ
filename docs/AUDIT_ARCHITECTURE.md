# Audit Architecture — EventCulture

Date : 2026-03-13

---

## Synthese

**Pattern backend** : Controller → Service → Repository → DB (3-tier)
**Pattern frontend** : Pages → Components → Hooks → Services → API
**Tests** : 155/155 OK | **Modules** : 188/188 OK | **TypeScript** : 0 erreur

---

## Backend

### Architecture

| Severite | Probleme | Fichier |
|----------|----------|---------|
| CRITIQUE | evenementController accede directement aux models (13 endroits) — bypass le service layer | controllers/evenementController.js |
| CRITIQUE | parcoursController.personnalise() — 207 lignes de logique metier (Haversine, routing, filtrage) dans le controller | controllers/parcoursController.js:268-474 |
| MAJEUR | signalementController — aucun service, import direct des models | controllers/signalementController.js |
| MAJEUR | dashboardController — "god controller" avec queries directes, cache LRU maison, permissions hardcodees | controllers/dashboardController.js |
| MAJEUR | artisanatController — melange service + acces direct models dans le meme fichier | controllers/artisanatController.js |
| MAJEUR | NotificationService instancie manuellement au lieu d'etre injecte via le container | evenementController.js:244,668 |
| MINEUR | Services trop grands : notificationService (826 lignes), emailService (684), cronService (638) | services/ |
| MINEUR | Pas de BaseController — duplication du pattern _handleError(), pagination, DTO mapping | controllers/*.js |

### Points positifs

- BaseService / BaseRepository solides
- Models propres (pas de logique metier)
- Error handling centralise (AppError + errorMiddleware)
- Pas de dependances circulaires
- DTO pattern bien applique
- Middlewares focuses et single-responsibility

---

## Frontend

### Architecture

| Severite | Probleme | Fichier |
|----------|----------|---------|
| CRITIQUE | Zustand installe mais jamais utilise — pas de state management centralise | package.json |
| CRITIQUE | ArticleEditor.tsx — 2176 lignes dans un seul composant | components/articles/ArticleEditor.tsx |
| CRITIQUE | LanguageSelector.tsx ET LanguageSwitcher.tsx — doublon fonctionnel | components/ |
| MAJEUR | 2 appels fetch() bruts au lieu d'utiliser les services | MultiLangInput.tsx, VisitePlanner.tsx |
| MAJEUR | joi ET zod dans les dependances frontend — redondant | package.json |
| MAJEUR | Pas d'Error Boundary global | src/ |
| MINEUR | 99 interfaces Props — prop drilling modere | Composants divers |
| MINEUR | Routes en camelCase (/shareData, /mesOeuvres) au lieu de kebab-case | routes/ |

### Points positifs

- Services API bien centralises (30+ fichiers)
- 32 hooks custom propres
- TypeScript partout
- httpClient sophistique avec retry/queue
- Radix UI + shadcn/ui bien structure
- i18n complet (5 langues)

---

## Dependances

| Severite | Probleme | Package | Stack |
|----------|----------|---------|-------|
| CRITIQUE | zustand installe, jamais importe | zustand ^4.4.7 | Frontend |
| MAJEUR | moment.js deprecie (maintenance arretee) | moment ^2.30.1 | Backend |
| MAJEUR | joi + zod doublon de validation | joi ^17.11.0 + zod ^3.23.8 | Frontend |
| MINEUR | lovable-tagger non utilise | lovable-tagger ^1.1.7 | Frontend devDep |
| MINEUR | lodash 70KB — remplacable par built-in Node.js | lodash ^4.17.21 | Backend |
| SUGGESTION | Toutes les versions en ^ (floating) | * | Les deux |

---

## Architecture cible

```
FRONTEND
  Pages -> Components -> Hooks -> Services -> API
  Zustand Store (auth, user, notifications)
  Error Boundary global
  zod validation (supprimer joi)

                    HTTP (axios)

BACKEND
  Routes -> Middlewares -> Controllers (delegation seulement)
                             |
                          Services (logique metier)
                             |
                         Repositories (acces donnees)
                             |
                        Models (Sequelize)

  Transversaux: AppError, DTOs, ServiceContainer
```

---

## Refactoring prioritaire

| Priorite | Action | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Extraire la logique metier de evenementController vers service | Coherence archi | 3h |
| 2 | Extraire parcoursController.personnalise() vers service | SRP, testabilite | 3h |
| 3 | Creer SignalementService | Completer l'archi | 2h |
| 4 | Implementer Zustand stores (auth, user) ou supprimer la dependance | State management | 4h |
| 5 | Splitter ArticleEditor (2176 lignes) en 4-5 composants | Maintenabilite | 3h |
| 6 | Fusionner LanguageSelector + LanguageSwitcher | Supprimer doublon | 1h |
| 7 | Migrer moment vers date-fns (backend) | Supprimer deprecie | 2h |
| 8 | Supprimer joi du frontend (garder zod) | Reduire bundle | 1h |
| 9 | Creer BaseController avec methodes communes | Reduire duplication | 2h |
| 10 | Refactorer DashboardController vers service | God controller | 5h |

**Effort total estime : ~26h**

---

## Gestion des erreurs

### Backend

- AppError class avec factory methods (bien)
- errorMiddleware normalise toutes les erreurs (bien)
- Integration Sentry pour production (bien)
- Logging avec contexte (bien)
- Codes HTTP appropries (bien)

### Frontend

- Toast notifications via useToast() (bien)
- API errors types avec ApiError interface (bien)
- Try-catch dans les operations async (bien)
- Pas d'Error Boundary global (a ajouter)
- Pas de service de logging centralise (a ajouter)

---

## Conventions de nommage

| Element | Convention | Respectee |
|---------|-----------|-----------|
| Composants React | PascalCase | Oui |
| Services frontend | camelCase.service.ts | Oui |
| Hooks | useXxx.ts | Oui |
| Variables/fonctions | camelCase | Oui |
| Constantes | UPPER_SNAKE_CASE | Oui |
| Colonnes DB | snake_case | Oui |
| Tables DB | snake_case singulier | Oui |
| Routes API | kebab-case | Partiellement (quelques camelCase) |
| Types TypeScript | PascalCase | Oui |

---

## Structure des dossiers recommandee

```
backend/
  config/          (configuration)
  controllers/     (routing + delegation seulement)
    base/          BaseController.js
  services/        (logique metier)
    notifications/ (split du NotificationService)
    utils/         (Haversine, etc.)
  repositories/    (acces donnees)
  models/          (schema Sequelize)
  dto/             (transformation donnees)
  middlewares/     (auth, validation, errors)
  routes/          (definition des routes)
  migrations/      (schema changes)
  database/seeds/  (donnees de reference)
  tests/           (tests unitaires + integration)

frontEnd/src/
  components/      (UI composants)
  pages/           (pages/routes)
  hooks/           (logique reutilisable)
  services/        (appels API)
  stores/          (Zustand stores)
  providers/       (Context providers)
  types/           (TypeScript definitions)
  lib/             (utilitaires)
  config/          (configuration)
  i18n/            (traductions)
```
