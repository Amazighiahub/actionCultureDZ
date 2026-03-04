# Documentation des Modifications — Action Culture

> **Date** : Mars 2026  
> **Scope** : Frontend (React/Vite) + Backend (Node.js/Express)  
> **Objectif** : Correction TypeScript, SEO dynamique, normalisation routes, nettoyage code

---

## Table des matières

1. [Corrections TypeScript Frontend](#1-corrections-typescript-frontend)
2. [Sitemap XML Dynamique (Backend)](#2-sitemap-xml-dynamique-backend)
3. [Normalisation des Routes (PascalCase → lowercase)](#3-normalisation-des-routes-pascalcase--lowercase)
4. [Image Open Graph (og:image)](#4-image-open-graph-ogimage)
5. [Nettoyage Imports & Variables](#5-nettoyage-imports--variables)
6. [SEO & robots.txt](#6-seo--robotstxt)
7. [Configuration Vite](#7-configuration-vite)
8. [Technologies Utilisées](#8-technologies-utilisées)
9. [Architecture Résumée](#9-architecture-résumée)
10. [Instructions de Déploiement](#10-instructions-de-déploiement)

---

## 1. Corrections TypeScript Frontend

### Problème
Erreurs de compilation TypeScript dues aux champs multilingues (`{fr, ar, en}`) utilisés comme `string` dans les templates JSX.

### Solution
Utilisation systématique du helper `getTranslation()` de `@/types/common/multilingual.types` pour extraire la valeur de la langue courante.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/pages/oeuvreDetail/OeuvreDetailPage.tsx` | Wrapping de `oeuvre.titre`, `oeuvre.description` avec `getTranslation(field, lang)`. Cast `(oeuvre as any)` pour `image_url`, `couverture_url`, `nombre_vues`, `url_extrait`, `Genre`, `Intervenants` |
| `src/pages/ArtisanatDetail.tsx` | Fix `type_artisanat` (n'existe pas sur le type) → cast `as any`. Fix `url_media` → `url`. Fix `image_url` → cast. Ajout optional chaining `oeuvre?.Oeuvre` |
| `src/components/home/EvenementsDynamique.tsx` | Wrapping `nom_evenement`, `description`, `Lieu.nom` avec `getTranslation()`. Fix JSX conditionnel cassé |
| `src/components/home/OeuvresDynamique.tsx` | Wrapping `titre`, `description` avec `getTranslation()`. Suppression imports inutilisés |
| `src/pages/oeuvreDetail/oeuvre/RelatedOeuvres.tsx` | Wrapping `titre` avec `getTranslation()`. Cast pour `image_url`, `couverture_url`, `note_moyenne`, `sous_titre`, `nombre_vues` |

### Pattern appliqué

```tsx
import { getTranslation, type SupportedLanguage } from '@/types/common/multilingual.types';
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
const lang = (i18n.language || 'fr') as SupportedLanguage;

// Avant (erreur TS) :
<h1>{oeuvre.titre}</h1>

// Après (corrigé) :
<h1>{getTranslation(oeuvre.titre, lang)}</h1>
```

---

## 2. Sitemap XML Dynamique (Backend)

### Problème
Le sitemap statique (`public/sitemap.xml`) ne contenait que 6 pages de listing. Les pages de détail (`/oeuvres/:id`, `/evenements/:id`, `/patrimoine/:id`, `/artisanat/:id`) n'étaient pas indexées.

### Solution
Création d'un endpoint Express côté backend qui interroge la base de données pour générer un sitemap XML complet.

### Fichier créé

**`backend/routes/sitemapRoutes.js`**

| Section | Modèle Sequelize | Route frontend | Filtre |
|---------|-----------------|----------------|--------|
| Pages statiques | — | `/`, `/patrimoine`, `/evenements`, `/oeuvres`, `/artisanat`, `/a-propos`, `/auth` | — |
| Œuvres | `Oeuvre` | `/oeuvres/:id` | `statut = 'publie'` |
| Événements | `Evenement` | `/evenements/:id` | `statut IN ('planifie', 'en_cours', 'a_venir')` |
| Patrimoine | `Lieu` | `/patrimoine/:id` | Tous |
| Artisanat | `Artisanat` | `/artisanat/:id` | Tous |
| Articles | `Oeuvre` | `/articles/:id` | `statut = 'publie' AND id_type_oeuvre IN (4, 5)` |

### Caractéristiques
- **URL absolues** : utilise `FRONTEND_URL` depuis `.env`
- **`<lastmod>`** : date de dernière modification par enregistrement
- **`<changefreq>`** et **`<priority>`** : adaptés par type de contenu
- **Cache HTTP** : `Cache-Control: public, max-age=3600` (1h)
- **Tolérance aux erreurs** : chaque section est dans un `try/catch` isolé

### Montage dans `app.js`

```js
// backend/app.js — dans initializeRoutes()
const initSitemapRoutes = require('./routes/sitemapRoutes');
this.app.use('/sitemap.xml', initSitemapRoutes(this.models));
```

### Fichier supprimé
- `frontEnd/public/sitemap.xml` (ancien sitemap statique)

---

## 3. Normalisation des Routes (PascalCase → lowercase)

### Problème
Certaines routes frontend utilisaient PascalCase (`/Oeuvres`, `/Evenements`, `/Auth`, `/Artisanat`) ce qui est mauvais pour le SEO (URLs dupliquées).

### Solution
Normalisation de **toutes** les routes internes vers lowercase.

### Fichiers modifiés (24 fichiers)

| Fichier | Changement |
|---------|-----------|
| `OeuvreDetailPage.tsx` | `/Oeuvres` → `/oeuvres`, `/Auth` → `/auth` |
| `ArtisanatDetail.tsx` | `/Auth` → `/auth`, breadcrumb JSON-LD lowercase |
| `EvenementsDynamique.tsx` | `/Evenements` → `/evenements` |
| `OeuvresDynamique.tsx` | `/Oeuvres` → `/oeuvres` |
| `RelatedOeuvres.tsx` | `/Oeuvres` → `/oeuvres` |
| `RelatedEvents.tsx` | `/Evenements` → `/evenements` |
| `DashboardUser.tsx` | `/Evenements`, `/Oeuvres`, `/Auth` → lowercase |
| `ArticleViewPage.tsx` | `/Oeuvres`, `/Auth` → lowercase |
| `ForgotPassword.tsx` | `/Auth` → `/auth` |
| `ResetPassword.tsx` | `/Auth` → `/auth` |
| `ProtectedRoute.tsx` | `/Auth` → `/auth` |
| `ValidatedProfessionalRoute.tsx` | `/Auth` → `/auth` |
| `EnhancedCTASection.tsx` | `/Auth` → `/auth` |
| `HeroSection.tsx` | `/Auth` → `/auth` |
| `ArtisanatDynamique.tsx` | `/Artisanat` → `/artisanat` |
| `useAuth.ts` | `/Auth` → `/auth` |
| `AjouterEvenement.tsx` | `/Auth` → `/auth` |
| `AjouterServicePro.tsx` | `/Auth` → `/auth` |
| `ConfirmEmailChange.tsx` | `/Auth` → `/auth` |
| `EventRegistration.tsx` | `/Auth` → `/auth` |
| `EventComments.tsx` | `/Auth` → `/auth` |
| `OeuvreComments.tsx` | `/Auth` → `/auth` |
| `SEOHead.tsx` | JSON-LD search target URL lowercase |
| `httpClient.ts` | Redirect URL `/Auth` → `/auth` |

---

## 4. Image Open Graph (og:image)

### Problème initial
L'image OG était un placeholder SVG avec des motifs géométriques islamiques.

### Solution finale
SVG 1200×630 avec des **motifs amazighs traditionnels** authentiques.

**Fichier** : `frontEnd/public/og-image.svg`

### Éléments visuels

| Motif | Signification culturelle |
|-------|------------------------|
| **Yaz ⵣ** (grand + petits) | Symbole de liberté amazighe, lettre Yaz en tifinagh |
| **Frise de losanges** (haut + bas) | Protection, féminité — motif universel berbère |
| **Chevrons zigzag** | Eau, rivière — motif tapis kabyle |
| **Triangles montagne** | Djurdjura, Atlas — relief berbère |
| **Croix solaire** | Symbole solaire amazigh à 8 branches |
| **Losange imbriqué (œil)** | Protection, vision — motif tapis berbère |
| **Tifinagh** : ⵜⴰⴷⵍⵙⴰ ⵏ ⴷⵣⴰⵢⵔ | "Culture d'Algérie" en tamazight |

### Palette de couleurs

| Couleur | Hex | Usage |
|---------|-----|-------|
| Bleu nuit | `#0a1628` → `#0b3d5e` | Fond dégradé |
| Or amazigh | `#f59e0b` → `#d97706` | Accent doré, Yaz |
| Vert algérien | `#006233` | Drapeau, barre accent |
| Blanc | `#ffffff` | Drapeau, texte |
| Rouge algérien | `#d21034` | Drapeau, barre accent |

### Barre inférieure
Tricolore algérien : vert (400px) · blanc (400px) · rouge (400px)

---

## 5. Nettoyage Imports & Variables

### Fichiers nettoyés

| Fichier | Imports supprimés |
|---------|------------------|
| `RelatedEvents.tsx` | `CardHeader`, `CardTitle`, `EmptyState`, `cn`, `error` (variable) |
| `OeuvreComments.tsx` | `Badge`, `ThumbsUp`, préfixe `_oeuvreId` |
| `EventComments.tsx` | `Badge`, préfixe `_eventId` |
| `DashboardUser.tsx` | Import `React` inutile (JSX transform moderne) |
| `OeuvresDynamique.tsx` | `useLocalizedDate`, `useLocalizedNumber`, destructuration vide |
| `ArtisanatDetail.tsx` | `handleDeleteItem`, destructuration `{type, item}` |
| `RelatedOeuvres.tsx` | `BookOpen`, `StatusBadge` (réajouté car utilisé), `error` |

---

## 6. SEO & robots.txt

### `frontEnd/public/robots.txt`

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard-pro
Disallow: /dashboard-user
Disallow: /ajouter-*
Disallow: /api/

# Sitemap dynamique généré par le backend
Sitemap: /sitemap.xml
```

### Modifications backend pour le support SEO
- **`app.js`** : Retiré `/robots.txt` de la blocklist 404
- **`routes/index.js`** : Retiré `/robots.txt` de `ignoredPaths`

---

## 7. Configuration Vite

### `frontEnd/vite.config.ts`

**Proxy ajouté** pour le sitemap en développement :
```ts
'/sitemap.xml': {
  target: 'http://127.0.0.1:3001',
  changeOrigin: true,
  secure: false,
}
```

**SPA fallback** : exclusion de `/sitemap.xml` pour éviter la réécriture vers `index.html` :
```ts
url.startsWith('/sitemap.xml') ||
```

---

## 8. Technologies Utilisées

### Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **React** | 18.x | Framework UI |
| **TypeScript** | 5.x | Typage statique |
| **Vite** | 5.x | Build tool + dev server |
| **React Router DOM** | 6.x | Routing SPA |
| **react-i18next** | 13.x | Internationalisation (fr, ar, en, tz-ltn, tz-tfng) |
| **TailwindCSS** | 3.x | Styling utility-first |
| **shadcn/ui** | — | Composants UI (Radix UI) |
| **Lucide React** | — | Icônes |
| **@tanstack/react-query** | 5.x | Data fetching & cache |
| **Axios** | 1.x | Client HTTP |
| **Zod** | 3.x | Validation de schémas |
| **react-helmet-async** | — | Gestion des meta tags SEO |

### Backend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Node.js** | 22.x | Runtime serveur |
| **Express** | 4.x | Framework HTTP |
| **Sequelize** | 6.x | ORM (MySQL) |
| **MySQL** | 8.x | Base de données relationnelle |
| **JWT** (jsonwebtoken) | — | Authentification |
| **Helmet** | — | Sécurité HTTP headers |
| **Morgan** | — | Logging HTTP |
| **Compression** | — | Gzip responses |
| **cookie-parser** | — | Gestion cookies httpOnly |
| **dotenv** | — | Variables d'environnement |

### SEO

| Technologie | Usage |
|-------------|-------|
| **Sitemap XML** | Généré dynamiquement côté serveur (Express) |
| **robots.txt** | Fichier statique frontend |
| **JSON-LD** | Données structurées (BreadcrumbList, WebSite, Article, Event) |
| **Open Graph** | Image SVG 1200×630 avec motifs amazighs |
| **react-helmet-async** | Meta tags dynamiques par page |

### Outils de Build

| Outil | Usage |
|-------|-------|
| **Vite** | Build frontend (Rollup sous le capot) |
| **Terser** | Minification JS en production |
| **vite-plugin-checker** | Vérification TypeScript en temps réel |
| **@vitejs/plugin-react-swc** | Compilation React avec SWC (rapide) |

---

## 9. Architecture Résumée

### Flux Sitemap en Production

```
Google/Bing Crawler
       │
       ▼
  /sitemap.xml
       │
       ▼
  Reverse Proxy (Nginx/Caddy)
       │
       ▼
  Backend Express :3001
       │
       ▼
  sitemapRoutes.js
       │
       ▼
  Sequelize → MySQL
  (Oeuvre, Evenement, Lieu, Artisanat)
       │
       ▼
  XML Response (cache 1h)
```

### Flux Frontend

```
Navigateur
    │
    ▼
  Vite Dev Server :8080 (dev) / Nginx (prod)
    │
    ├── /api/*        → Proxy → Backend :3001
    ├── /uploads/*    → Proxy → Backend :3001
    ├── /sitemap.xml  → Proxy → Backend :3001
    └── /*            → SPA (index.html → React Router)
```

### Structure Backend (7 modules)

```
backend/
├── routes/
│   ├── index.js              ← Point d'entrée /api
│   ├── sitemapRoutes.js      ← NOUVEAU : /sitemap.xml
│   ├── oeuvreRoutes.js
│   ├── evenementRoutes.js
│   ├── patrimoineRoutes.js
│   ├── artisanatRoutes.js
│   ├── userRoutes.js
│   ├── serviceRoutes.js
│   └── parcoursRoutes.js
├── controllers/              ← Singletons
├── services/                 ← ServiceContainer (lazy-loading)
├── models/                   ← Sequelize (MySQL)
└── middlewares/
    ├── authMiddleware.js     ← JWT + cookies httpOnly
    ├── corsMiddleware.js
    └── ...
```

---

## 10. Instructions de Déploiement

### Variables d'environnement requises

```env
# Backend (.env)
FRONTEND_URL=https://votre-domaine.com    # Utilisé par le sitemap
BASE_URL=https://api.votre-domaine.com
JWT_SECRET=<clé-secrète-forte>
DB_NAME=actionculture
DB_USER=<user>
DB_PASS=<password>
```

### Build Frontend

```bash
cd frontEnd
npm install
npx vite build    # Output → dist/
```

### Démarrage Backend

```bash
cd backend
npm install
node server.js    # Port 3001 par défaut
```

### Vérification Sitemap

```bash
# Tester le sitemap en local
curl http://localhost:3001/sitemap.xml

# Vérifier que le XML est valide et contient les pages détail
curl -s http://localhost:3001/sitemap.xml | grep -c "<url>"
```

### Configuration Reverse Proxy (Nginx exemple)

```nginx
server {
    listen 443 ssl;
    server_name votre-domaine.com;

    # Frontend (SPA)
    location / {
        root /var/www/frontEnd/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
    }

    # Sitemap dynamique
    location = /sitemap.xml {
        proxy_pass http://localhost:3001;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:3001;
    }
}
```

---

## Résumé des Fichiers Modifiés

| Action | Fichier | Scope |
|--------|---------|-------|
| **Créé** | `backend/routes/sitemapRoutes.js` | Backend |
| **Créé** | `CHANGELOG_MODIFICATIONS.md` | Racine projet |
| **Modifié** | `backend/app.js` | Montage sitemap + fix blocklist |
| **Modifié** | `backend/routes/index.js` | Fix ignoredPaths |
| **Modifié** | `frontEnd/vite.config.ts` | Proxy sitemap + SPA exclusion |
| **Modifié** | `frontEnd/public/robots.txt` | Disallow /api/ + commentaire |
| **Modifié** | `frontEnd/public/og-image.svg` | Motifs amazighs |
| **Modifié** | 24 fichiers `.tsx/.ts` | Routes lowercase + TS fixes + cleanup |
| **Supprimé** | `frontEnd/public/sitemap.xml` | Ancien sitemap statique |

**Build frontend** : ✅ Succès (vite build ~1min)  
**Syntax backend** : ✅ Module charge correctement
