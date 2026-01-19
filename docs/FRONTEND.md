# Guide Frontend - EventCulture

## Vue d'ensemble

Le frontend EventCulture est une SPA (Single Page Application) React avec TypeScript, utilisant Vite comme build tool et Tailwind CSS pour le styling.

## Stack technique

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.5.3 | Typage statique |
| Vite | 5.4.1 | Build tool / dev server |
| Tailwind CSS | 3.4.11 | Framework CSS utility-first |
| React Query | 5.90.12 | Data fetching & cache |
| Zustand | 4.4.7 | State management global |
| i18next | 25.3.0 | Internationalisation |
| Radix UI | Latest | Composants accessibles |
| React Hook Form | Latest | Gestion de formulaires |

---

## Structure des dossiers

```
frontEnd/src/
├── App.tsx                 # Routes et layout principal
├── main.tsx                # Point d'entrée
│
├── components/             # Composants React
│   ├── UI/                 # Primitives UI (shadcn/Radix)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   └── ...
│   ├── shared/             # Composants partagés
│   │   ├── LazyImage.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── DataTable.tsx
│   │   ├── Pagination.tsx
│   │   └── ErrorBoundary.tsx
│   ├── auth/               # Composants authentification
│   │   ├── ProtectedRoute.tsx
│   │   └── ValidatedProfessionalRoute.tsx
│   ├── home/               # Composants page d'accueil
│   │   ├── HeroSection.tsx
│   │   ├── PatrimoineDynamique.tsx
│   │   ├── EvenementsDynamique.tsx
│   │   └── OeuvresDynamique.tsx
│   ├── event/              # Composants événements
│   ├── oeuvre/             # Composants œuvres
│   ├── dashboard/          # Composants tableaux de bord
│   └── modals/             # Modals réutilisables
│
├── pages/                  # Pages (routes)
│   ├── Index.tsx           # Page d'accueil
│   ├── Auth.tsx            # Connexion/Inscription
│   ├── Evenements.tsx      # Liste événements
│   ├── EventDetailsPage.tsx
│   ├── Oeuvres.tsx         # Liste œuvres
│   ├── Patrimoine.tsx      # Sites patrimoniaux
│   ├── Artisanat.tsx       # Artisanat
│   ├── DashboardAdmin.tsx  # Dashboard administrateur
│   ├── DashboardPro.tsx    # Dashboard professionnel
│   ├── DashboardUser.tsx   # Dashboard utilisateur
│   └── ...
│
├── hooks/                  # Custom hooks (27 hooks)
│   ├── useAuth.ts          # Authentification
│   ├── useTranslateData.ts # Traduction données BDD
│   ├── useFavoris.ts       # Gestion favoris
│   ├── usePermissions.ts   # Contrôle d'accès
│   ├── useGeographie.ts    # Wilayas/Dairas/Communes
│   ├── useLocalizedDate.ts # Formatage dates i18n
│   └── ...
│
├── services/               # Services API
│   ├── base.service.ts     # Service de base (CRUD)
│   ├── httpClient.ts       # Client Axios configuré
│   ├── auth.service.ts
│   ├── evenement.service.ts
│   ├── oeuvre.service.ts
│   └── ...
│
├── contexts/               # Contextes React
│   └── AuthContext.tsx
│
├── providers/              # Providers React
│   └── PermissionsProvider.tsx
│
├── types/                  # Types TypeScript
│   └── models/
│       ├── user.types.ts
│       ├── oeuvre.types.ts
│       └── evenement.types.ts
│
├── i18n/                   # Internationalisation
│   ├── config.ts           # Configuration i18next
│   └── locales/
│       ├── fr/translation.json
│       ├── ar/translation.json
│       ├── en/translation.json
│       ├── tz-ltn/translation.json
│       └── tz-tfng/translation.json
│
├── config/
│   ├── api.ts              # Configuration API (endpoints, URL)
│   └── env.ts              # Variables d'environnement
│
└── styles/
    └── language-styles.css # Styles spécifiques par langue
```

---

## Hooks personnalisés

### useTranslateData - Traduction des données BDD

Hook essentiel pour traduire les données JSON multilingues de la base de données.

```typescript
import { useTranslateData } from '@/hooks/useTranslateData';

const MonComposant = ({ evenement }) => {
  const { td, safe, lang, isRTL } = useTranslateData();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* td() - Traduit un champ JSON multilingue */}
      <h1>{td(evenement.nom_evenement)}</h1>
      <p>{td(evenement.description)}</p>

      {/* safe() - Rend une valeur safe pour JSX */}
      <span>{safe(evenement.capacite_max, '0')} places</span>
    </div>
  );
};
```

**Fonctions disponibles:**

| Fonction | Description |
|----------|-------------|
| `td(field, fallback?)` | Traduit un champ JSON selon la langue actuelle |
| `safe(value, fallback?)` | Convertit toute valeur en string/number safe pour JSX |
| `lang` | Langue actuelle (fr, ar, en, tz-ltn, tz-tfng) |
| `isRTL` | `true` si langue RTL (arabe) |
| `dir` | Direction du texte ('ltr' ou 'rtl') |
| `translateObject(obj)` | Traduit tous les champs d'un objet |
| `translateArray(arr)` | Traduit un tableau d'objets |

### useAuth - Authentification

```typescript
import { useAuth } from '@/hooks/useAuth';

const MonComposant = () => {
  const {
    user,              // Utilisateur connecté
    isAuthenticated,   // Est connecté ?
    isAdmin,           // Est administrateur ?
    isProfessional,    // Est professionnel ?
    login,             // Fonction de connexion
    logout,            // Fonction de déconnexion
    registerVisitor,   // Inscription visiteur
    registerProfessional // Inscription pro
  } = useAuth();

  const handleLogin = async () => {
    const result = await login({ email, password });
    if (!result.success) {
      setError(result.error);
    }
  };
};
```

### usePermissions - Contrôle d'accès

```typescript
import { usePermissions } from '@/hooks/usePermissions';

const MonComposant = () => {
  const {
    can,               // Vérifier une permission
    hasRole,           // Vérifier un rôle
    canManageOeuvre,   // Peut gérer cette œuvre ?
    canManageEvent     // Peut gérer cet événement ?
  } = usePermissions();

  if (can('create:oeuvre')) {
    // Afficher bouton création
  }
};
```

### useFavoris - Gestion des favoris

```typescript
import { useFavoris } from '@/hooks/useFavoris';

const MonComposant = ({ oeuvreId }) => {
  const {
    isFavori,      // Est en favoris ?
    toggleFavori,  // Ajouter/Retirer
    favorisCount   // Nombre total
  } = useFavoris('oeuvre', oeuvreId);

  return (
    <Button onClick={toggleFavori}>
      {isFavori ? '❤️ Retirer' : '🤍 Ajouter'}
    </Button>
  );
};
```

### useGeographie - Données géographiques

```typescript
import { useGeographie } from '@/hooks/useGeographie';

const MonComposant = () => {
  const {
    wilayas,           // Liste des wilayas
    getDairas,         // Dairas d'une wilaya
    getCommunes,       // Communes d'une daira
    loading
  } = useGeographie();

  return (
    <Select onChange={(id) => getDairas(id)}>
      {wilayas.map(w => (
        <option key={w.id_wilaya} value={w.id_wilaya}>
          {td(w.nom_wilaya)}
        </option>
      ))}
    </Select>
  );
};
```

### useLocalizedDate - Dates localisées

```typescript
import { useLocalizedDate } from '@/hooks/useLocalizedDate';

const MonComposant = ({ date }) => {
  const { formatDate, formatDateTime, formatRelative } = useLocalizedDate();

  return (
    <div>
      <p>{formatDate(date)}</p>           {/* 15 janvier 2024 */}
      <p>{formatDateTime(date)}</p>       {/* 15 janvier 2024, 14:30 */}
      <p>{formatRelative(date)}</p>       {/* il y a 2 jours */}
    </div>
  );
};
```

---

## Services API

### Architecture des services

Tous les services héritent de `BaseService` qui fournit les opérations CRUD de base.

```typescript
// services/base.service.ts
abstract class BaseService<T, CreateDTO, UpdateDTO> {
  async getAll(params?): Promise<ApiResponse<PaginatedResponse<T>>>
  async getById(id: number): Promise<ApiResponse<T>>
  async create(data: CreateDTO): Promise<ApiResponse<T>>
  async update(id: number, data: UpdateDTO): Promise<ApiResponse<T>>
  async delete(id: number): Promise<ApiResponse<void>>
}
```

### Exemple d'utilisation

```typescript
import { evenementService } from '@/services/evenement.service';

// Récupérer la liste paginée
const response = await evenementService.getAll({
  page: 1,
  limit: 10,
  wilaya_id: 16
});

if (response.success) {
  const evenements = response.data.data;
  const pagination = response.data.pagination;
}

// Récupérer un événement
const event = await evenementService.getById(42);

// Inscription à un événement
const inscription = await evenementService.inscription(42);
```

### Liste des services

| Service | Endpoint | Description |
|---------|----------|-------------|
| `authService` | `/auth` | Authentification |
| `evenementService` | `/evenements` | Événements |
| `oeuvreService` | `/oeuvres` | Œuvres culturelles |
| `patrimoineService` | `/patrimoine` | Sites patrimoniaux |
| `lieuService` | `/lieux` | Lieux |
| `userService` | `/users` | Utilisateurs |
| `favoriService` | `/favoris` | Favoris |
| `commentaireService` | `/commentaires` | Commentaires |
| `notificationService` | `/notifications` | Notifications |
| `uploadService` | `/upload` | Upload fichiers |
| `adminService` | `/admin` | Administration |

---

## Internationalisation (i18n)

### Configuration

Le projet utilise i18next avec 5 langues supportées:

| Code | Langue | Direction |
|------|--------|-----------|
| `fr` | Français | LTR |
| `ar` | Arabe | RTL |
| `en` | Anglais | LTR |
| `tz-ltn` | Tamazight (Latin) | LTR |
| `tz-tfng` | Tamazight (Tifinagh) | LTR |

### Deux systèmes de traduction

1. **`useTranslation()`** - Textes statiques de l'interface
2. **`useTranslateData()`** - Données dynamiques de la BDD

```tsx
import { useTranslation } from 'react-i18next';
import { useTranslateData } from '@/hooks/useTranslateData';

const OeuvreCard = ({ oeuvre }) => {
  const { t } = useTranslation();      // Interface
  const { td } = useTranslateData();   // Données BDD

  return (
    <Card>
      <Label>{t('oeuvre.titre')}</Label>    {/* "Titre" */}
      <Title>{td(oeuvre.titre)}</Title>      {/* "Le Petit Prince" */}
    </Card>
  );
};
```

### Structure des fichiers de traduction

```
i18n/locales/
├── fr/translation.json
├── ar/translation.json
├── en/translation.json
├── tz-ltn/translation.json
└── tz-tfng/translation.json
```

**Exemple de fichier de traduction:**

```json
{
  "common": {
    "loading": "Chargement...",
    "error": "Une erreur est survenue",
    "save": "Enregistrer",
    "cancel": "Annuler"
  },
  "auth": {
    "login": {
      "title": "Connexion",
      "submit": "Se connecter",
      "noAccount": "Pas encore de compte ?"
    }
  },
  "event": {
    "title": "Événements",
    "register": "S'inscrire",
    "full": "Complet"
  }
}
```

### Gestion RTL

Le support RTL (arabe) est automatique via `RTLManager`:

```tsx
// components/RTLManager.tsx
const RTLManager = ({ children }) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <>{children}</>;
};
```

**Classes Tailwind RTL:**

```jsx
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  Marge gauche en LTR, marge droite en RTL
</div>
```

---

## Composants UI (shadcn/Radix)

Le projet utilise les composants shadcn/ui basés sur Radix UI.

### Import des composants

```tsx
import { Button } from '@/components/UI/button';
import { Card, CardHeader, CardContent } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/UI/select';
import { Dialog, DialogTrigger, DialogContent } from '@/components/UI/dialog';
```

### Composants disponibles

| Catégorie | Composants |
|-----------|------------|
| Actions | Button, Toggle, Switch |
| Layout | Card, Separator, Accordion, Tabs |
| Forms | Input, Select, Checkbox, Radio, Textarea, Form |
| Feedback | Alert, Toast, Progress, Skeleton |
| Overlay | Dialog, Sheet, Popover, Dropdown, Tooltip |
| Navigation | Breadcrumb, NavigationMenu, Pagination |
| Data | Table, DataTable, Calendar, Chart |

### Composants partagés custom

| Composant | Description |
|-----------|-------------|
| `LazyImage` | Image avec lazy loading et placeholder |
| `LoadingSkeleton` | Skeleton loader animé |
| `EmptyState` | État vide avec message et action |
| `StatusBadge` | Badge de statut coloré |
| `ConfirmDialog` | Dialog de confirmation |
| `ErrorBoundary` | Capture d'erreurs React |

---

## Routes et protection

### Configuration des routes (App.tsx)

```tsx
<Routes>
  {/* Routes publiques */}
  <Route path="/" element={<Index />} />
  <Route path="/evenements" element={<Evenements />} />
  <Route path="/evenement/:id" element={<EventDetailsPage />} />
  <Route path="/oeuvres" element={<Oeuvres />} />
  <Route path="/patrimoine" element={<Patrimoine />} />
  <Route path="/auth" element={<Auth />} />

  {/* Routes protégées - utilisateur connecté */}
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<DashboardUser />} />
    <Route path="/favoris" element={<Favoris />} />
  </Route>

  {/* Routes professionnel */}
  <Route element={<ValidatedProfessionalRoute />}>
    <Route path="/dashboard-pro" element={<DashboardPro />} />
    <Route path="/ajouter-evenement" element={<AjouterEvenement />} />
    <Route path="/ajouter-oeuvre" element={<AjouterOeuvre />} />
  </Route>

  {/* Routes admin */}
  <Route element={<AdminRoute />}>
    <Route path="/admin/*" element={<DashboardAdmin />} />
  </Route>
</Routes>
```

### Composants de protection

```tsx
// components/auth/ProtectedRoute.tsx
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/auth" />;

  return <Outlet />;
};

// components/auth/ValidatedProfessionalRoute.tsx
const ValidatedProfessionalRoute = () => {
  const { isProfessional, needsValidation } = useAuth();

  if (!isProfessional) return <Navigate to="/auth" />;
  if (needsValidation) return <PendingValidationPage />;

  return <Outlet />;
};
```

---

## Gestion des formulaires

### React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  nom_evenement: z.object({
    fr: z.string().min(3, 'Minimum 3 caractères'),
    ar: z.string().optional(),
  }),
  date_debut: z.string().datetime(),
  capacite_max: z.number().min(1).max(10000),
});

type FormData = z.infer<typeof schema>;

const MonFormulaire = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await evenementService.create(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('nom_evenement.fr')} />
      {errors.nom_evenement?.fr && (
        <span>{errors.nom_evenement.fr.message}</span>
      )}
      <Button type="submit">Créer</Button>
    </form>
  );
};
```

### Composant MultiLangInput

Pour les champs multilingues:

```tsx
import { MultiLangInput } from '@/components/MultiLangInput';

<MultiLangInput
  name="description"
  label="Description"
  control={control}
  languages={['fr', 'ar', 'en']}
  required={['fr']}
/>
```

---

## Bonnes pratiques

### 1. Toujours utiliser td() pour les données BDD

```tsx
// ✅ Correct
<h1>{td(evenement.nom_evenement)}</h1>

// ❌ Incorrect - peut afficher [object Object]
<h1>{evenement.nom_evenement}</h1>
```

### 2. Utiliser safe() pour les valeurs incertaines

```tsx
// ✅ Correct
<span>{safe(evenement.capacite_max, '0')}</span>

// ❌ Risque d'erreur si capacite_max est un objet
<span>{evenement.capacite_max}</span>
```

### 3. Séparer les textes UI des données

```tsx
// ✅ Correct
const { t } = useTranslation();      // UI
const { td } = useTranslateData();   // Données

<Label>{t('event.title')}</Label>
<Value>{td(event.nom_evenement)}</Value>
```

### 4. Gérer les états de chargement

```tsx
const { data, isLoading, error } = useQuery(...);

if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <Content data={data} />;
```

### 5. Typer correctement les props

```tsx
interface EvenementCardProps {
  evenement: Evenement;
  onSelect?: (id: number) => void;
  showActions?: boolean;
}

const EvenementCard: React.FC<EvenementCardProps> = ({
  evenement,
  onSelect,
  showActions = true
}) => {
  // ...
};
```

---

## Scripts disponibles

```bash
# Développement
npm run dev           # Démarrer le serveur de dev (port 8080)

# Production
npm run build         # Build de production
npm run preview       # Preview du build

# Qualité
npm run lint          # Vérification ESLint
npm run type-check    # Vérification TypeScript

# Analyse
npm run build:analyze # Analyse du bundle
```

---

## Variables d'environnement

```env
# .env.example
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
VITE_APP_NAME=EventCulture
VITE_DEFAULT_LANGUAGE=fr
```

**Accès dans le code:**

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```
