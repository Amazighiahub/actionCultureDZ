# Guide d'Onboarding — Nouveau Stagiaire

Bienvenue sur **EventCulture**, une plateforme de gestion du patrimoine culturel algérien. Ce guide t'aidera à être opérationnel rapidement.

---

## 1. Prérequis à installer

| Outil | Version min | Lien |
|-------|-------------|------|
| Node.js | 18+ | https://nodejs.org |
| MySQL | 8+ | https://dev.mysql.com/downloads/ |
| Git | 2.30+ | https://git-scm.com |
| VS Code | Latest | https://code.visualstudio.com |
| Redis | 5+ | Optionnel en dev (émulé par `redis-dev.js`) |

### Extensions VS Code recommandées
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MySQL (cweijan)
- Thunder Client (test API)

---

## 2. Installation du projet

```bash
# 1. Cloner le repo
git clone <url_du_repo>
cd EventCulture

# 2. Configurer Git (important pour Windows !)
git config core.ignorecase false

# 3. Installer le backend
cd backend
cp .env.example .env       # Éditer .env avec tes credentials MySQL
npm install

# 4. Générer un secret JWT
node scripts/generateSecret.js
# Copier le résultat dans .env → JWT_SECRET=...

# 5. Créer la base de données MySQL
mysql -u root -p -e "CREATE DATABASE actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 6. Installer le frontend
cd ../frontEnd
cp .env.example .env
npm install
```

---

## 3. Lancer le projet

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 8080)
cd frontEnd
npm run dev
```

URLs :
- **Frontend** : http://localhost:8080
- **API** : http://localhost:3001/api
- **API v2** : http://localhost:3001/api/v2

---

## 4. Peupler la base de données

```bash
cd backend

# Données géographiques (wilayas, dairas, communes)
node scripts/seed-geography.js

# Données de référence (types, catégories, langues)
node scripts/seed-data-reference.js

# Données complètes de test (utilisateurs, œuvres, événements)
node scripts/seed-all-data.js

# OU tout d'un coup
node scripts/seed-database.js
```

### Comptes de test créés par le seed
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@eventculture.dz` | `Admin123!` | Administrateur |
| `pro@eventculture.dz` | `Pro123!` | Professionnel |
| `user@eventculture.dz` | `User123!` | Utilisateur |

> ⚠️ Vérifie dans le script `seed-database.js` car les credentials peuvent varier.

---

## 5. Structure du projet

```
EventCulture/
├── backend/                    # API Node.js + Express
│   ├── app.js                  # Config Express (point d'entrée)
│   ├── server.js               # Démarrage serveur
│   ├── config/                 # Config DB, env
│   ├── controllers/            # Logique métier (1 par module)
│   ├── routes/                 # Routes API (1 par module)
│   │   ├── v2/                 # Routes API v2
│   │   └── admin/              # Routes admin
│   ├── models/                 # Modèles Sequelize
│   │   ├── users/              # User, Role, UserRole
│   │   ├── oeuvres/            # Oeuvre, Livre, Film, Artisanat...
│   │   ├── events/             # Evenement, Programme
│   │   ├── places/             # Lieu, Monument, Vestige, Service
│   │   ├── geography/          # Wilaya, Daira, Commune
│   │   ├── classifications/    # Categorie, Genre, TypeOeuvre...
│   │   ├── misc/               # Commentaire, Favori, Notification...
│   │   ├── organisations/      # Organisation, Editeur
│   │   └── associations/       # Tables pivot M2M
│   ├── services/               # Services métier (pattern Service/Repository)
│   ├── repositories/           # Accès données
│   ├── dto/                    # Data Transfer Objects
│   ├── middlewares/             # Auth, CORS, validation, cache, sécurité
│   ├── helpers/                # i18n
│   ├── scripts/                # Seeds, migrations, utilitaires
│   └── uploads/                # Fichiers uploadés
│
├── frontEnd/                   # SPA React + TypeScript
│   └── src/
│       ├── components/         # Composants réutilisables
│       │   ├── ui/             # shadcn/ui (ne pas modifier manuellement)
│       │   ├── shared/         # Composants partagés
│       │   ├── home/           # Composants page d'accueil
│       │   ├── event/          # Composants événements
│       │   ├── oeuvre/         # Composants œuvres
│       │   └── ...
│       ├── pages/              # Pages (1 par route)
│       ├── hooks/              # Custom hooks React
│       ├── services/           # Appels API (axios)
│       ├── types/              # Types TypeScript
│       ├── i18n/               # Traductions (fr, ar, en, tz)
│       ├── utils/              # Utilitaires
│       └── config/             # Config frontend
│
└── docs/                       # Documentation
    ├── modules/                # Doc par module métier
    ├── archives/               # Anciens rapports d'audit
    └── ...
```

---

## 6. Conventions de nommage

| Type de fichier | Convention | Exemple |
|----------------|-----------|---------|
| Composant React (.tsx) | **PascalCase** | `Header.tsx`, `AjouterOeuvre.tsx` |
| Hook (.ts) | **camelCase** + préfixe `use` | `useAuth.ts`, `useOeuvres.ts` |
| Utilitaire/config (.ts) | **camelCase** | `permissions.ts`, `api.ts` |
| shadcn/ui (.tsx) | **kebab-case** | `alert-dialog.tsx`, `dropdown-menu.tsx` |
| Backend (.js) | **camelCase** | `oeuvreController.js`, `userRoutes.js` |
| Dossiers | **camelCase** | `oeuvreDetail/`, `components/` |

> ⚠️ **JAMAIS de PascalCase pour un dossier** — casse les imports sur Linux.

---

## 7. Modules métier

La plateforme est organisée en 5 modules principaux. Voir `docs/modules/` pour le détail.

| Module | Description | Doc |
|--------|-------------|-----|
| **Événements** | Festivals, expositions, conférences | [EVENEMENTS.md](modules/EVENEMENTS.md) |
| **Patrimoine** | Sites, monuments, vestiges, carte | [PATRIMOINE.md](modules/PATRIMOINE.md) |
| **Œuvres** | Livres, films, artisanat, articles | [OEUVRES.md](modules/OEUVRES.md) |
| **Parcours Intelligents** | Itinéraires touristiques auto-générés | [PARCOURS_INTELLIGENTS.md](modules/PARCOURS_INTELLIGENTS.md) |
| **Services** | Guides, ateliers, hébergement | [SERVICES.md](modules/SERVICES.md) |

---

## 8. Rôles utilisateurs

| Rôle | Peut faire |
|------|------------|
| **Visiteur** | Consulter les pages publiques |
| **User** | Favoris, commentaires, inscriptions événements |
| **Professionnel** | Créer/gérer œuvres, événements, services |
| **Admin** | Modération, gestion utilisateurs, dashboard |

---

## 9. Technologies clés à connaître

### Backend
- **Express.js** — Framework web (routes, middlewares)
- **Sequelize** — ORM pour MySQL (modèles, migrations, associations)
- **JWT** — Authentification (tokens)
- **Bull + Redis** — File d'attente pour emails
- **Multer + Sharp** — Upload et traitement d'images

### Frontend
- **React 18** + **TypeScript**
- **Vite** — Build tool (rapide)
- **TailwindCSS** — CSS utilitaire
- **shadcn/ui** — Composants UI (basé sur Radix)
- **React Query** — Data fetching et cache
- **Zustand** — State management
- **i18next** — Internationalisation (4 langues)
- **React Router v6** — Navigation
- **Leaflet** — Cartes interactives
- **Recharts** — Graphiques dashboard

---

## 10. Commandes utiles

### Backend
```bash
npm run dev              # Démarrage avec hot-reload
npm run start            # Démarrage production
npm run test             # Lancer les tests Jest
npm run lint             # Vérification ESLint
npm run db:migrate       # Migrations Sequelize
```

### Frontend
```bash
npm run dev              # Démarrage avec hot-reload
npm run build            # Build production
npm run preview          # Preview du build
npm run test             # Tests Vitest
npm run lint             # Vérification ESLint
npm run build:analyze    # Analyse du bundle
```

### Scripts de données
```bash
cd backend
node scripts/seed-geography.js       # Wilayas/Dairas/Communes
node scripts/seed-data-reference.js  # Types, catégories
node scripts/seed-all-data.js        # Données complètes
node scripts/seed-database.js        # Seed principal
node scripts/reset-database.js       # ⚠️ Reset complet
node scripts/generateSecret.js       # Générer JWT secret
node scripts/cleanTempFiles.js       # Nettoyer uploads temporaires
node scripts/checkRawSql.js          # Audit sécurité SQL
```

---

## 11. Workflow de développement

1. **Créer une branche** : `git checkout -b feature/nom-feature`
2. **Développer** avec `npm run dev` (backend + frontend)
3. **Tester** : `npm test`
4. **Vérifier le build** : `cd frontEnd && npm run build`
5. **Committer** : messages conventionnels (`feat:`, `fix:`, `refactor:`, `docs:`)
6. **Push** : `git push origin feature/nom-feature`
7. **Pull Request** vers `develop`

---

## 12. Problèmes courants

| Problème | Solution |
|----------|----------|
| `ER_ACCESS_DENIED` | Vérifier DB_USER/DB_PASSWORD dans `.env` |
| `ECONNREFUSED 3306` | MySQL n'est pas démarré |
| `JWT_SECRET required` | Lancer `node scripts/generateSecret.js` et copier dans `.env` |
| Import/require qui casse | Vérifier la casse du fichier (Linux = case-sensitive) |
| `Cannot find module` | `npm install` dans le bon dossier |
| Redis timeout | Normal en dev si Redis non installé, utilise `npm run redis:dev` |

---

## 13. Documentation complémentaire

- [Architecture détaillée](ARCHITECTURE.md)
- [Guide API](API.md)
- [Guide Frontend](FRONTEND.md)
- [Guide de contribution](CONTRIBUTING.md)
- [Guide de sécurité](SECURITY_GUIDELINES.md)
- [Guide seed base de données](GUIDE_SEED_DATABASE.md)
- [Module Patrimoine (détaillé)](MODULE_PATRIMOINE.md)
