# Architecture du Projet EventCulture

## Vue d'ensemble

EventCulture suit une architecture client-serveur classique avec:
- **Backend**: API REST Node.js/Express
- **Frontend**: SPA React/TypeScript
- **Base de données**: MySQL avec Sequelize ORM
- **Cache**: Redis (optionnel)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Frontend       │────▶│  Backend API    │────▶│  MySQL          │
│  (React/Vite)   │     │  (Express)      │     │  Database       │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Redis Cache    │
                        │  (optionnel)    │
                        └─────────────────┘
```

---

## Backend Architecture

### Structure des dossiers

```
backend/
├── app.js                  # Configuration Express
├── server.js               # Point d'entrée
│
├── config/
│   ├── database.js         # Configuration Sequelize
│   ├── envAdapter.js       # Adaptation des variables d'env
│   └── envValidator.js     # Validation des variables d'env
│
├── models/                 # Modèles Sequelize (67 modèles)
│   ├── index.js            # Agrégateur et associations
│   ├── users/
│   │   ├── User.js
│   │   └── Role.js
│   ├── oeuvres/
│   │   ├── Oeuvre.js
│   │   ├── Livre.js
│   │   ├── Film.js
│   │   └── ...
│   ├── events/
│   │   ├── Evenement.js
│   │   ├── Programme.js
│   │   └── ...
│   ├── places/
│   │   ├── Lieu.js
│   │   ├── Monument.js
│   │   └── ...
│   ├── geography/
│   │   ├── Wilaya.js
│   │   ├── Daira.js
│   │   └── Commune.js
│   └── associations/       # Tables de jointure
│       ├── EvenementUser.js
│       ├── OeuvreCategorie.js
│       └── ...
│
├── controllers/            # Logique métier (22 controllers)
│   ├── UserController.js
│   ├── OeuvreController.js
│   ├── EvenementController.js
│   ├── PatrimoineController.js
│   ├── AdminController.js
│   └── ...
│
├── routes/                 # Définition des routes
│   ├── index.js            # Agrégateur principal
│   ├── userRoutes.js
│   ├── oeuvreRoutes.js
│   ├── evenementRoutes.js
│   └── admin/              # Routes admin
│
├── middlewares/
│   ├── authMiddleware.js       # Authentification JWT
│   ├── corsMiddleware.js       # Configuration CORS
│   ├── rateLimitMiddleware.js  # Rate limiting
│   ├── cacheMiddleware.js      # Stratégies de cache
│   ├── errorMiddleware.js      # Gestion d'erreurs
│   ├── validationMiddleware.js # Validation des entrées
│   ├── securityMiddleware.js   # Sanitization
│   ├── auditMiddleware.js      # Logging des actions
│   └── httpsRedirect.js        # Redirection HTTPS
│
├── services/               # Services métier
│   ├── emailService.js
│   ├── NotificationService.js
│   ├── uploadService.js
│   └── ...
│
├── helpers/
│   └── i18n.js             # Helpers multilingues
│
└── utils/
    ├── AppError.js         # Classe d'erreur custom
    ├── FileValidator.js    # Validation de fichiers
    └── logger.js           # Winston logger
```

### Flux de requête

```
Requête HTTP
    │
    ▼
┌─────────────────┐
│ CORS Middleware │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiter    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth Middleware │ (si route protégée)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validation      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Controller      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service/Model   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Response        │
└─────────────────┘
```

### Modèle de données (Entités principales)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │────▶│    Role      │     │ Organisation │
│              │     │              │     │              │
│ - id_user    │     │ - id_role    │     │ - id_org     │
│ - nom        │     │ - nom_role   │     │ - nom        │
│ - email      │     └──────────────┘     └──────────────┘
│ - password   │
└──────┬───────┘
       │
       │ crée/gère
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Oeuvre     │────▶│  Categorie   │     │   Langue     │
│              │     │              │     │              │
│ - id_oeuvre  │     │ - id_cat     │     │ - id_langue  │
│ - titre      │     │ - nom        │     │ - nom        │
│ - description│     └──────────────┘     └──────────────┘
└──────┬───────┘
       │
       │ présentée dans
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Evenement   │────▶│    Lieu      │────▶│   Commune    │
│              │     │              │     │              │
│ - id_event   │     │ - id_lieu    │     │ - id_commune │
│ - nom        │     │ - nom        │     │ - nom        │
│ - date_debut │     │ - adresse    │     │ - Daira      │
└──────────────┘     └──────────────┘     │ - Wilaya     │
                                          └──────────────┘
```

### Gestion multilingue (i18n)

Les champs multilingues sont stockés en JSON:

```json
{
  "nom": {
    "fr": "Musée National du Bardo",
    "ar": "المتحف الوطني للباردو",
    "en": "National Bardo Museum",
    "tz-ltn": "Amussu Naṣyun n Bardu",
    "tz-tfng": "ⴰⵎⵓⵙⵙⵓ ⵏⴰⵚⵢⵓⵏ ⵏ ⴱⴰⵔⴷⵓ"
  }
}
```

Helper côté backend (`helpers/i18n.js`):
```javascript
// Traduire un champ
const translate = (field, lang) => field?.[lang] || field?.fr || '';

// Traduire un objet complet
const translateDeep = (obj, lang) => { /* ... */ };
```

---

## Frontend Architecture

### Structure des dossiers

```
frontEnd/src/
├── App.tsx                 # Composant racine + routing
├── main.tsx                # Point d'entrée
│
├── components/             # Composants réutilisables
│   ├── UI/                 # Primitives UI (shadcn/radix)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── shared/             # Composants partagés
│   │   ├── LazyImage.tsx
│   │   ├── StatusBadge.tsx
│   │   └── LoadingSpinner.tsx
│   ├── event/              # Composants événements
│   ├── oeuvre/             # Composants œuvres
│   ├── home/               # Composants page d'accueil
│   └── ...
│
├── pages/                  # Pages (routes)
│   ├── Index.tsx           # /
│   ├── Auth.tsx            # /auth
│   ├── Evenements.tsx      # /evenements
│   ├── EventDetailsPage.tsx # /evenement/:id
│   ├── Oeuvres.tsx         # /oeuvres
│   ├── Patrimoine.tsx      # /patrimoine
│   ├── DashboardAdmin.tsx  # /admin
│   ├── DashboardPro.tsx    # /pro
│   └── ...
│
├── hooks/                  # Custom hooks (28 hooks)
│   ├── useAuth.ts          # Authentification
│   ├── useApi.ts           # Fetch générique
│   ├── useFavoris.ts       # Gestion favoris
│   ├── useTranslateData.ts # Traduction données
│   ├── useLocalizedDate.ts # Formatage dates
│   ├── usePermissions.ts   # Contrôle d'accès
│   └── ...
│
├── services/               # Services API
│   ├── base.service.ts     # Service de base
│   ├── httpClient.ts       # Client Axios
│   ├── auth.service.ts
│   ├── oeuvre.service.ts
│   ├── evenement.service.ts
│   └── ...
│
├── contexts/               # Contextes React
│   └── AuthContext.tsx
│
├── types/                  # Types TypeScript
│   └── models/
│       ├── user.types.ts
│       ├── oeuvre.types.ts
│       └── evenement.types.ts
│
├── i18n/                   # Configuration i18next
│   ├── config.ts
│   └── locales/
│       ├── fr/translation.json
│       ├── ar/translation.json
│       └── ...
│
└── config/
    ├── api.ts              # Endpoints API
    └── env.ts              # Variables d'env
```

### Patterns utilisés

#### 1. Custom Hooks pour la logique métier

```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => { /* ... */ };
  const logout = () => { /* ... */ };
  const isAuthenticated = !!user;

  return { user, loading, login, logout, isAuthenticated };
};
```

#### 2. Services pour les appels API

```typescript
// services/evenement.service.ts
class EvenementService extends BaseService {
  async getAll(params?: EvenementFilters) {
    return this.get<Evenement[]>('/evenements', { params });
  }

  async getById(id: number) {
    return this.get<Evenement>(`/evenements/${id}`);
  }

  async inscription(id: number) {
    return this.post(`/evenements/${id}/inscription`);
  }
}

export const evenementService = new EvenementService();
```

#### 3. Composants avec traduction

```tsx
// components/event/EventInfo.tsx
const EventInfo: React.FC<{ event: Evenement }> = ({ event }) => {
  const { t } = useTranslation();           // Textes statiques UI
  const { td, safe } = useTranslateData();  // Données dynamiques BDD

  return (
    <Card>
      <CardTitle>{t('event.description')}</CardTitle>
      <p>{td(event.description)}</p>
      <span>{safe(event.capacite_max, '0')} places</span>
    </Card>
  );
};
```

#### 4. Protection des routes

```tsx
// App.tsx
<Routes>
  {/* Routes publiques */}
  <Route path="/" element={<Index />} />
  <Route path="/evenements" element={<Evenements />} />

  {/* Routes protégées - utilisateur connecté */}
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<DashboardUser />} />
    <Route path="/favoris" element={<Favoris />} />
  </Route>

  {/* Routes admin */}
  <Route element={<AdminRoute />}>
    <Route path="/admin/*" element={<DashboardAdmin />} />
  </Route>

  {/* Routes professionnel */}
  <Route element={<ProfessionalRoute />}>
    <Route path="/pro/*" element={<DashboardPro />} />
  </Route>
</Routes>
```

### Gestion de l'état

| Type de données | Solution |
|-----------------|----------|
| État serveur (API) | React Query |
| État global (auth) | Zustand |
| État local (forms) | useState / React Hook Form |
| Cache API | React Query cache |

### Support RTL

Le support RTL pour l'arabe est géré automatiquement:

```tsx
// components/RTLManager.tsx
const RTLManager: React.FC = ({ children }) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <>{children}</>;
};
```

---

## Communication Frontend-Backend

### Format des réponses API

```typescript
// Réponse standard
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Réponse paginée
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### Authentification

```
1. Login: POST /api/auth/login
   ↓
2. Réponse: { token: "eyJ...", user: {...} }
   ↓
3. Stockage: localStorage.setItem('token', token)
   ↓
4. Requêtes suivantes: Authorization: Bearer <token>
```

### Gestion des erreurs

```typescript
// Frontend: httpClient.ts
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expiré → redirection login
      authService.logout();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);
```

---

## Sécurité

### Backend

1. **Authentification JWT** - Tokens signés avec secret de 32+ caractères
2. **CORS** - Origines restreintes par environnement
3. **Rate Limiting** - Protection contre les abus
4. **Validation** - express-validator sur toutes les entrées
5. **Sanitization** - Nettoyage des entrées HTML/SQL
6. **HTTPS** - Redirection automatique en production
7. **Helmet** - Headers de sécurité HTTP

### Frontend

1. **XSS Protection** - React échappe automatiquement
2. **CSRF** - Pas de cookies sensibles (JWT en header)
3. **Source Maps** - Désactivés en production
4. **Dépendances** - Audit régulier avec `npm audit`

---

## Performance

### Backend

- **Mise en cache Redis** - Réponses fréquentes
- **Compression gzip** - Réponses HTTP
- **Pool de connexions** - MySQL (max 20)
- **Pagination** - Toutes les listes

### Frontend

- **Code splitting** - Chunks par route/vendor
- **Lazy loading** - Images et composants
- **React Query** - Cache côté client
- **Bundle optimisé** - Terser + tree shaking
