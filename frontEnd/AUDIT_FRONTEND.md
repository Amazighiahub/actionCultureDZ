# Audit Complet Frontend — 31 Mars 2026

> Build: ✅ `vite build` réussi | TypeScript: ✅ `tsc --noEmit` 0 erreurs

---

## 1. QUALITÉ DU CODE

### 1.1 TypeScript
- **Compilation** : ✅ 0 erreurs (`tsc --noEmit`)
- **Config stricte** : ✅ `strict: true`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `strictNullChecks`, `strictFunctionTypes`
- **vite-plugin-checker** : ✅ Activé (overlay en dev)

### 1.2 Usage de `any` — ⚠️ 407 occurrences dans 51 fichiers
| Catégorie | Fichiers | `any` count | Priorité |
|-----------|----------|-------------|----------|
| Tests (forms/) | 14 fichiers | ~290 | 🟡 Basse (tests) |
| **Code source** | **~37 fichiers** | **~117** | 🔴 Haute |

**Pires fichiers source** (hors tests) :
| Fichier | `any` | Action |
|---------|-------|--------|
| `components/oeuvre/HeroSection.tsx` | 9 | Typer les props |
| `utils/index.ts` | 9 | Créer des types utilitaires |
| `components/CarteInteractiveUnifiee.tsx` | 7 | Typer lieux/services/événements |
| `components/forms/ProgrammeForm.tsx` | 7 | Interface Programme |
| `components/article/useArticleEditor.ts` | 6 | Typer les blocs article |
| `types/api/oeuvre-creation.types.ts` | 6 | Ironique : fichier de types avec `any` |
| `services/httpClient.ts` | 5 | Structurel (signatures génériques) |
| `components/SEOHead.tsx` | 5 | Typer les données JSON-LD |

### 1.3 `eslint-disable` — 33 fichiers
- Quasi-tous sont `@typescript-eslint/no-explicit-any`
- `IntervenantEditeurManager.tsx` : 3 directives (le plus)
- **Recommandation** : Réduire à mesure que les `any` sont typés

### 1.4 ESLint Config — ⚠️ Minimale
```
Règles actives : seulement `import/no-unresolved`
```
**Manquant** : `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `no-unused-vars`, `react-refresh/only-export-components`

---

## 2. SÉCURITÉ

### 2.1 XSS / `dangerouslySetInnerHTML` — ✅ Maîtrisé (3 usages)
| Fichier | Usage | Sanitisation |
|---------|-------|-------------|
| `ArticlePreview.tsx` | Embeds iframe | ✅ DOMPurify + whitelist domaines |
| `ArticleEditor.tsx` | Styles preview | ✅ CSS statique (pas de user input) |
| `ui/chart.tsx` | Thème CSS | ✅ Généré par le code (pas de user input) |

### 2.2 Tokens & Auth — ✅ Bien architecturé
- Tokens JWT gérés via **cookies httpOnly** (côté serveur)
- `localStorage` stocke uniquement : expiry (ISO string), user (données non sensibles)
- Legacy token keys nettoyées via `clearLocalAuthData()`
- Refresh token via cookie automatique

### 2.3 localStorage — ⚠️ 10 fichiers, 35 occurrences
| Usage | Fichiers | Risque |
|-------|----------|--------|
| Auth expiry/user | auth.service, httpClient | ✅ OK (pas de secrets) |
| Langue/RTL prefs | useLanguage*, useRTL, LanguageSelector | ✅ OK (préférences UX) |
| Filtres oeuvres/artisanat | useOeuvres, useArtisanat | ✅ OK (préférences) |
| Config API | config/api.ts | ✅ OK |

### 2.4 Secrets dans le code — ✅ Aucun
- Aucune API key, mot de passe ou secret hardcodé détecté
- Variables d'environnement via `import.meta.env.VITE_*`

### 2.5 Dépendances — ⚠️ À vérifier
```
Recommandation : exécuter `npm audit` pour vérifier les vulnérabilités connues
```

---

## 3. ARCHITECTURE & STRUCTURE

### 3.1 Points positifs ✅
- **Lazy loading** complet : toutes les pages via `React.lazy()`
- **Code splitting** : chunks manuels bien configurés (react-vendor, ui-vendor, data-vendor, maps-vendor, i18n-vendor, charts-vendor, editor-vendor)
- **Services centralisés** : barrel `services/index.ts`
- **Hooks barrel** : `hooks/index.ts` avec exports nommés
- **Types barrel** : `types/index.ts` avec exports organisés
- **ProtectedRoute / AdminRoute / ProfessionalRoute** : guards bien séparés

### 3.2 Doublons détectés — ⚠️
| Doublon | Fichier A | Fichier B |
|---------|-----------|-----------|
| `use-toast` | `hooks/use-toast.ts` | `components/ui/use-toast.ts` (re-export) |
| `CategorySelection` | `pages/ajouterOeuvre/CategorySelection.tsx` | `components/oeuvre/creation/CategorySelection.tsx` |
| `EditorModeSelector` | `pages/ajouterOeuvre/EditorModeSelector.tsx` | `components/oeuvre/creation/EditorModeSelector.tsx` |

### 3.3 Dossier orphelin complet
- `components/oeuvre/creation/` — barrel + 2 composants jamais importés (doublons de `pages/ajouterOeuvre/`)
- `lib/validation/` — barrel + schemas jamais importés depuis l'extérieur

### 3.4 Dépendances npm potentiellement inutilisées
| Package | Installé | Utilisé ? |
|---------|----------|-----------|
| `@radix-ui/react-accordion` | ✅ | ❌ Composant ui non utilisé |
| `@radix-ui/react-aspect-ratio` | ✅ | ❌ |
| `@radix-ui/react-collapsible` | ✅ | ❌ |
| `@radix-ui/react-context-menu` | ✅ | ❌ |
| `@radix-ui/react-hover-card` | ✅ | ❌ |
| `@radix-ui/react-menubar` | ✅ | ❌ |
| `@radix-ui/react-navigation-menu` | ✅ | ❌ |
| `@radix-ui/react-toggle-group` | ✅ | ❌ |
| `react-resizable-panels` | ✅ | ❌ (resizable.tsx non utilisé) |
| `input-otp` | ✅ | ❌ (input-otp.tsx non utilisé) |
| `cmdk` | ✅ | ❌ (command.tsx non utilisé) |
| `embla-carousel-react` | ✅ | ❌ (carousel.tsx non utilisé) |
| `vaul` | ✅ | ❌ (drawer.tsx non utilisé) |
| `next-themes` | ✅ | ⚠️ À vérifier |
| `redis-server` (devDep) | ✅ | ❌ Incongru en frontend |

---

## 4. PERFORMANCE & BUNDLE SIZE

### 4.1 Build Output
| Chunk | Taille | Gzip | Verdict |
|-------|--------|------|---------|
| `index` (entry) | **588 KB** | 161 KB | 🔴 TROP GROS |
| `react-vendor` | 183 KB | 61 KB | ✅ Normal |
| `ui-vendor` | 177 KB | 49 KB | 🟡 Lourd |
| `maps-vendor` (leaflet) | 156 KB | 47 KB | ✅ Lazy loaded |
| `services` | 97 KB | 24 KB | 🟡 Un seul chunk |
| `ArticleEditor` | 97 KB | 26 KB | 🟡 Gros composant |
| `ui-components` | 83 KB | 24 KB | ✅ OK |
| `data-vendor` | 72 KB | 24 KB | ✅ OK |
| `OeuvreDetailPage` | 68 KB | 13 KB | 🟡 Page lourde |
| `DashboardPro` | 64 KB | 14 KB | 🟡 Page lourde |

**Total estimé : ~2.5 MB raw, ~700 KB gzip**

### 4.2 Problèmes identifiés
- **`index` chunk à 588 KB** : contient probablement du code qui devrait être lazy-loadé
- **`services` en un seul chunk (97 KB)** : pourrait être splitté par module
- **`ui-vendor` à 177 KB** : inclut des composants Radix inutilisés

### 4.3 Console.log — ⚠️ 105 occurrences dans 43 fichiers
- ✅ `drop_console: true` en production (vite.config.ts)
- Mais en dev, 105 console.log polluent la console
- **Top pollueurs** : `useAjouterOeuvre.ts` (11), `GestionEvenement.tsx` (7), `IntervenantEditeurManager.tsx` (5)

### 4.4 Memoization — ✅ Bien utilisée
- 192 occurrences de `useCallback`/`useMemo`/`React.memo` dans 49 fichiers
- Les hooks principaux utilisent `useCallback` pour les handlers

---

## 5. ROUTES

### 5.1 Couverture des routes — ✅ Complète

**Routes publiques (9)** :
`/`, `/patrimoine`, `/patrimoine/:id`, `/evenements`, `/evenements/:id`, `/oeuvres`, `/oeuvres/:id`, `/artisanat`, `/artisanat/:id`, `/a-propos`, `/articles/:id`

**Routes auth (6)** :
`/auth`, `/forgot-password`, `/reset-password/:token`, `/verification-email-envoyee`, `/verify-email/:token`, `/confirm-email-change/:token`

**Routes protégées - Visiteur (4)** :
`/dashboard`, `/dashboard-user`, `/notifications`, `/notifications/preferences`

**Routes protégées - Professionnel (15)** :
`/dashboard-pro`, `/ajouter-oeuvre`, `/modifier-oeuvre/:id`, `/ajouter-evenement`, `/modifier-evenement/:id`, `/ajouter-service`, `/ajouter-mon-service`, `/modifier-service/:id`, `/ajouter-patrimoine`, `/modifier-patrimoine/:id`, `/ajouter-artisanat`, `/modifier-artisanat/:id`, `/ajouter-organisation`, `/editer-article/:id`, `/gestion-artisanat`, `/programme/creer`, `/programme/modifier/:id`

**Routes admin (4)** :
`/admin/dashboard`, `/admin/patrimoine/ajouter`, `/admin/patrimoine/modifier/:id`, `/admin/*` (catch-all → redirect)

**Routes de compatibilité (7)** :
PascalCase → lowercase redirects + `/profile`, `/mes-favoris` → dashboard

### 5.2 Guards ✅
- `ProtectedRoute` : vérifie authentification
- `AdminRoute` : vérifie rôle admin
- `ProfessionalRoute` : vérifie rôle pro validé
- `DashboardRouter` : redirige selon le rôle

### 5.3 Route programme/:id — ⚠️ Non protégée
```tsx
<Route path="/programme/:id" element={<ViewProgrammePage />} />
```
Cette route est publique — est-ce intentionnel ?

### 5.4 ErrorBoundary — ⚠️ Inconsistant
Certaines pages ont `<ErrorBoundary>`, d'autres non :
- ✅ Avec : `AjouterOeuvre`, `AjouterEvenement`, `DashboardUser`, `CreateProgrammePage`
- ❌ Sans : `AjouterService`, `AjouterServicePro`, `AjouterPatrimoinePro`, `AjouterArtisanat`, `EditArticle`, `DashboardPro`, `DashboardAdmin`, etc.

---

## 6. RESPONSIVE & UX/UI

### 6.1 Accessibilité (a11y) — 🟡 Partielle
- **aria-label/role** : 427 occurrences dans 78 fichiers ✅
- **Best practices** détectées : `role="alert"`, `aria-invalid`, `aria-describedby` sur les formulaires
- **Formulaires bien structurés** : RegisterForm (38 aria), AjouterServicePro (22), AjouterEvenement (20)

**Manquant** :
- Pas de `skip-to-content` link
- Pas de `aria-live` pour les chargements async
- Pas de focus trap explicite sur les modals (Radix le gère)

### 6.2 Responsive — ✅ Via Tailwind
- Classes responsives Tailwind (`sm:`, `md:`, `lg:`, `xl:`) utilisées partout
- Hook `useIsMobile` disponible
- Tailwind RTL (`tailwindcss-rtl`) pour le support arabe ✅
- `RTLManager` composant global dans App.tsx ✅

### 6.3 RTL Support — ✅ Bien implémenté
- `useRTL` hook utilisé dans 24+ fichiers
- `rtl.ts` utilitaire (18 KB) pour les transformations
- `language-styles.css` pour les styles spécifiques RTL
- `RTLManager` global dans `App.tsx`

### 6.4 i18n — ✅ Complet
- `react-i18next` avec `i18next-browser-languagedetector`
- `LanguagePersistenceManager` pour persister la langue
- `useTranslateData` hook pour traduire les données dynamiques
- `useLocalizedDate` et `useLocalizedNumber` pour le formatage localisé

### 6.5 UX Patterns — ✅ Bien implémentés
- **Offline banner** : détection de perte de connexion réseau
- **Toast notifications** : système global via custom events
- **Idle timeout** : `useIdleTimeout` pour déconnexion automatique
- **Unsaved changes** : `useUnsavedChanges` hook
- **Scroll to top** : `ScrollToTop` sur changement de route
- **Loading skeletons** : composant `LoadingSkeleton` partagé
- **Empty states** : composant `EmptyState` partagé
- **Error boundaries** : présents (mais inconsistants, voir §5.4)
- **SEO** : `SEOHead` avec JSON-LD, meta tags, breadcrumbs

---

## 7. RÉSUMÉ DES ACTIONS RECOMMANDÉES

### 🔴 Priorité haute
1. ~~Réduire le chunk `index` (588 KB)~~ — **161 KB gzip = acceptable** pour une SPA i18n+auth+routing
2. **Ajouter ErrorBoundary** sur toutes les pages protégées (consistance)
3. **Enrichir ESLint** : ajouter `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`
4. **Supprimer les dépendances npm inutilisées** (~13 packages Radix + 5 autres)

### 🟡 Priorité moyenne
5. **Typer les `any`** : commencer par les 37 fichiers source (~117 `any`)
6. **Supprimer `components/oeuvre/creation/`** (doublon complet)
7. **Supprimer `lib/validation/`** (jamais importé)
8. **Nettoyer les 105 console.log** restants en dev
9. **Splitter le chunk `services`** par module pour un meilleur tree-shaking

### 🟢 Priorité basse
10. Ajouter `skip-to-content` link pour l'accessibilité
11. Ajouter `aria-live` sur les zones de chargement async
12. Consolider `use-toast` (supprimer le re-export dans `components/ui/`)
13. Supprimer les fichiers orphelins restants (voir audit précédent)
14. Exécuter `npm audit` pour vérifier les vulnérabilités

---

*Audit généré le 31/03/2026*
