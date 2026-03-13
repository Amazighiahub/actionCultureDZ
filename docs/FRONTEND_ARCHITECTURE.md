# Frontend Architecture — EventCulture

> React 18 + TypeScript single-page application for the Action Culture platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18, TypeScript, Vite |
| Routing | React Router v6 |
| Server State | TanStack Query (React Query) |
| UI Components | Radix UI primitives + Tailwind CSS (Shadcn/ui) |
| i18n | i18next + react-i18next (5 languages) |
| HTTP | Axios (custom `httpClient` wrapper) |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Notifications | Sonner + custom Toaster |
| Real-time | Socket.IO client |

---

## Directory Structure

```
frontEnd/
├── i18n/
│   ├── config.ts                 # i18next setup, language persistence
│   └── locales/
│       ├── ar/translation.json
│       ├── fr/translation.json
│       ├── en/translation.json
│       ├── tz-ltn/translation.json   # Tamazight (Latin)
│       └── tz-tfng/translation.json  # Tamazight (Tifinagh)
├── src/
│   ├── main.tsx                  # Entry point, ErrorBoundary wrapper
│   ├── App.tsx                   # Routes, providers, QueryClient
│   ├── index.css                 # Tailwind directives, global styles
│   ├── config/
│   │   ├── api.ts                # API_BASE_URL, AUTH_CONFIG, pagination, types
│   │   └── env.ts                # Environment variable access
│   ├── components/
│   │   ├── ui/                   # Shadcn primitives (Button, Dialog, Input…)
│   │   ├── UI/                   # Extended Shadcn components (Calendar, Chart…)
│   │   ├── auth/                 # ProtectedRoute, AdminRoute, ProfessionalRoute
│   │   ├── shared/               # FilterBar, StatusBadge, ErrorBoundary, ConfirmDialog
│   │   ├── home/                 # Landing page sections (HeroSection, StatCard…)
│   │   ├── layouts/              # AppLayout
│   │   ├── oeuvre/               # Oeuvre-specific components
│   │   ├── patrimoine/           # VisitePlanner, map components
│   │   ├── article/              # ArticleEditor, ReadingStats
│   │   ├── dashboard/            # ActivityTimeline, admin widgets
│   │   ├── forms/                # ProgrammeForm
│   │   ├── modals/               # EditeurModal
│   │   └── permissions/          # PermissionGuard
│   ├── pages/
│   │   ├── index.tsx             # Homepage
│   │   ├── Auth.tsx              # Login / Register combined page
│   │   ├── auth/                 # LoginForm, RegisterForm
│   │   ├── Patrimoine.tsx        # Heritage listing
│   │   ├── PatrimoineDetail.tsx
│   │   ├── Evenements.tsx        # Events listing
│   │   ├── EventDetailsPage.tsx
│   │   ├── event/                # EventInfo, EventGallery, EventRegistration…
│   │   ├── Oeuvres.tsx           # Works listing
│   │   ├── oeuvreDetail/         # Tabbed oeuvre detail (Hero, Info, Gallery…)
│   │   ├── Artisanat.tsx         # Crafts listing
│   │   ├── ArtisanatDetail.tsx
│   │   ├── articles/             # ArticleViewPage, Create, edit/EditArticle
│   │   ├── admin/                # AdminOverview, AdminUsersTab, AdminOeuvresTab…
│   │   ├── DashboardAdmin.tsx    # Admin dashboard shell
│   │   ├── DashboardPro.tsx      # Professional dashboard
│   │   ├── DashboardUser.tsx     # Visitor dashboard
│   │   ├── notifications/        # Notifications, Preferences
│   │   ├── Ajouter*.tsx          # Creation forms (Oeuvre, Evenement, Service…)
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   ├── index.ts              # Barrel export for all hooks
│   │   ├── useAuth.ts            # Login, logout, register orchestration
│   │   ├── usePermissions.ts     # Role checks (isAdmin, isProfessional…)
│   │   ├── useApi.ts             # Generic TanStack Query wrappers
│   │   ├── useOeuvres.ts         # Oeuvre queries & mutations
│   │   ├── useEvenements.ts      # Event queries
│   │   ├── useArtisanat.ts       # Artisanat queries
│   │   ├── useFavoris.ts         # Bookmark toggle
│   │   ├── useNotifications.ts   # Notification polling / socket
│   │   ├── useDashboardAdmin.ts  # Admin dashboard data
│   │   ├── useDashboardPro.ts    # Pro dashboard data
│   │   ├── useSocket.ts          # Socket.IO connection management
│   │   ├── useLanguage.ts        # i18n helpers, direction detection
│   │   ├── useRTL.ts             # RTL layout utility
│   │   ├── useGeographie.ts      # Wilayas, Dairas, Communes lookups
│   │   ├── useTrackView.ts       # Analytics view tracking
│   │   ├── useLocalizedDate.ts   # Date formatting per locale
│   │   ├── useLocalizedNumber.ts # Number formatting per locale
│   │   ├── useTranslateData.ts   # Dynamic content translation
│   │   └── useDebouncedValue.ts  # Debounced state
│   ├── services/
│   │   ├── index.ts              # Barrel export
│   │   ├── httpClient.ts         # Axios instance, interceptors, token refresh queue
│   │   ├── base.service.ts       # Abstract CRUD class (getAll, getById, create…)
│   │   ├── auth.service.ts       # Login, register, token management
│   │   ├── oeuvre.service.ts
│   │   ├── evenement.service.ts
│   │   ├── patrimoine.service.ts
│   │   ├── artisanat.service.ts
│   │   ├── lieu.service.ts
│   │   ├── upload.service.ts
│   │   ├── notification.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── admin.service.ts
│   │   ├── professionnel.service.ts
│   │   ├── favori.service.ts
│   │   ├── commentaire.service.ts
│   │   ├── media.service.ts
│   │   ├── metadata.service.ts
│   │   ├── permissions.service.ts
│   │   ├── socketService.ts      # Socket.IO singleton
│   │   └── requestQueue.service.ts
│   ├── providers/
│   │   └── PermissionsProvider.tsx  # Auth state + role context
│   ├── types/
│   │   ├── index.ts
│   │   ├── models/               # Domain types (oeuvre, evenement, user, lieu…)
│   │   ├── enums/                # Status enums, categories
│   │   ├── api/                  # Request/response DTOs
│   │   ├── common/               # Multilingual helpers
│   │   └── utils/                # Type utilities
│   ├── lib/
│   │   ├── Utils.ts              # cn() Tailwind merge helper
│   │   └── validation/schemas.ts # Zod schemas
│   ├── utils/                    # Misc helpers (mappers, config validation)
│   └── styles/                   # Additional CSS (language-specific styles)
```

---

## Provider Hierarchy

```
ErrorBoundary
└─ QueryClientProvider          (TanStack Query)
   └─ TooltipProvider           (Radix)
      └─ PermissionsProvider    (Auth state + roles)
         └─ BrowserRouter
            ├─ LanguagePersistenceManager
            ├─ RTLManager
            ├─ NotificationToastListener
            ├─ GlobalToastListener
            └─ Suspense → <Routes>
```

`PermissionsProvider` is the central auth context. It calls `authService.getCurrentUser()` on mount and exposes:
- `user`, `isAuthenticated`, `isAdmin`, `isProfessional`, `isVisitor`
- `needsValidation`, `statusMessage`
- `refreshPermissions()` — called after login/logout/register

---

## State Management

### Server State — TanStack Query

All API data is managed via TanStack Query. The `QueryClient` is configured in `App.tsx`:
- `staleTime`: 5 min
- `gcTime`: 10 min
- `refetchOnWindowFocus`: disabled
- `retry`: 1 with exponential backoff

Domain hooks (`useOeuvres`, `useEvenements`, etc.) wrap `useQuery` / `useMutation` and handle cache invalidation.

### Client State — React Context

- **PermissionsProvider** — auth user, roles, validation status
- No Zustand or Redux store is currently used; local `useState` handles component-level state.

---

## Routing & Guards

Routes are defined in `App.tsx` using React Router v6 with lazy-loaded pages (`React.lazy` + `Suspense`).

Three guard components restrict access:

| Guard | Behavior |
|---|---|
| `ProtectedRoute` | Redirects to `/auth` if not authenticated |
| `AdminRoute` | Requires admin role; redirects non-admins to their dashboard |
| `ProfessionalRoute` | Requires validated professional; shows pending message if not validated |

A `DashboardRouter` component at `/dashboard` inspects the user's role and redirects to the appropriate dashboard (`/admin/dashboard`, `/dashboard-pro`, or `/dashboard-user`).

SEO-friendly redirects from PascalCase paths (`/Patrimoine` → `/patrimoine`) are defined inline.

---

## i18n Setup

Powered by **i18next** with `react-i18next`. Configuration lives in `frontEnd/i18n/config.ts`.

### Supported Languages

| Code | Language | Direction |
|---|---|---|
| `ar` | العربية (Arabic) | RTL |
| `fr` | Français | LTR |
| `en` | English | LTR |
| `tz-ltn` | Tamaziɣt (Latin script) | LTR |
| `tz-tfng` | ⵜⴰⵎⴰⵣⵉⵖⵜ (Tifinagh script) | LTR |

### How It Works

1. Language is stored in `localStorage` under `i18nextLng`.
2. On change, `document.documentElement.dir` is updated for RTL support.
3. The `RTLManager` component keeps the DOM `dir` attribute in sync.
4. `LanguagePersistenceManager` syncs language with the backend via `POST /api/set-language`.
5. `useLanguage()` and `useDirection()` hooks provide current language info.
6. `useLocalizedDate()` and `useLocalizedNumber()` format values per locale.
7. `useTranslateData()` resolves multilingual database fields dynamically.

---

## Service Layer

All HTTP calls go through a centralized `httpClient` (Axios instance in `services/httpClient.ts`).

### httpClient Features

- Automatic `Authorization: Bearer <token>` header injection
- `Accept-Language` header from i18next
- Token refresh queue: when a 401 is received, pending requests are queued and retried after refresh
- Rate-limit detection and toast notifications
- Request/response logging in development

### BaseService Pattern

Domain services extend `BaseService<T>` which provides generic CRUD:

```typescript
abstract class BaseService<T, CreateDTO, UpdateDTO> {
  getAll(params?)   → GET    /endpoint?page=&limit=
  getById(id)       → GET    /endpoint/:id
  create(data)      → POST   /endpoint
  update(id, data)  → PUT    /endpoint/:id
  delete(id)        → DELETE /endpoint/:id
}
```

Concrete services (e.g. `oeuvre.service.ts`, `evenement.service.ts`) add domain-specific methods like `getRecent()`, `search()`, `register()`.

---

## Key Hooks

| Hook | Purpose |
|---|---|
| `useAuth` | Login / logout / register orchestration with redirect logic |
| `usePermissions` | Derived role booleans from PermissionsProvider |
| `useApi` | Generic `useQuery` wrapper with error handling |
| `useMutation` | Generic `useMutation` wrapper |
| `useOeuvres` | List, create, update, delete oeuvres |
| `useEvenements` | List events, upcoming, stats |
| `useFavoris` | Toggle bookmarks with optimistic updates |
| `useNotifications` | Polling + socket-based notifications |
| `useDashboardAdmin` | Admin overview, user management, moderation data |
| `useDashboardPro` | Professional dashboard statistics |
| `useSocket` | Socket.IO connection lifecycle |
| `useGeographie` | Wilayas / Dairas / Communes cascading selects |
| `useTrackView` | Analytics view event on page mount |
| `useLanguage` | Current language, direction, change handler |
| `useLocalizedDate` | Locale-aware date formatting |
| `useLocalizedNumber` | Locale-aware number formatting |
| `useTranslateData` | Resolve multilingual fields from API data |
| `useDebouncedValue` | Debounced state for search inputs |

---

## UI Component Library

The project uses **Shadcn/ui** — a copy-paste component library built on Radix UI primitives styled with Tailwind CSS.

Components live in two directories:
- `components/ui/` — base Shadcn primitives (Button, Dialog, Input, Select, Tooltip…)
- `components/UI/` — extended/custom variants (Calendar, Chart, Command, Menubar…)

The `cn()` utility in `lib/Utils.ts` merges Tailwind classes with `clsx` + `tailwind-merge`.

### Design Patterns
- **Responsive tabs** — `responsive-tabs.tsx` collapses tabs to a dropdown on mobile
- **RTL support** — Arabic layout handled via `dir="rtl"` on `<html>` and `tailwindcss-rtl` plugin
- **Toast system** — dual toasters (Radix-based `Toaster` + `Sonner`) with global event listener for HTTP errors

---

## Code Splitting

Every page is lazy-loaded via `React.lazy()` in `App.tsx`, wrapped in a single `<Suspense>` boundary with a spinner fallback. This keeps the initial bundle small and loads pages on demand.
