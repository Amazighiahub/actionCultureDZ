# EventCulture - Plateforme de Patrimoine Culturel Algérien

## Vue d'ensemble

EventCulture est une plateforme web complète de gestion du patrimoine culturel algérien. Elle permet de gérer les œuvres culturelles, les événements, les sites patrimoniaux, et l'artisanat avec un support multilingue complet (Français, Arabe, Anglais, Tamazight).

## Technologies

### Backend
| Technologie | Version | Description |
|-------------|---------|-------------|
| Node.js | 18+ | Runtime JavaScript |
| Express.js | 4.18.2 | Framework web |
| Sequelize | 6.33.0 | ORM pour MySQL |
| MySQL | 8+ | Base de données |
| Redis | 5.5.6 | Cache et sessions |
| JWT | 9.0.2 | Authentification |
| Bull | 4.16.5 | File d'attente de jobs |
| Nodemailer | 7.0.11 | Envoi d'emails |

### Frontend
| Technologie | Version | Description |
|-------------|---------|-------------|
| React | 18.3.1 | Bibliothèque UI |
| TypeScript | 5.5.3 | Typage statique |
| Vite | 5.4.1 | Build tool |
| Tailwind CSS | 3.4.11 | Framework CSS |
| React Query | 5.90.12 | Data fetching |
| Zustand | 4.4.7 | State management |
| i18next | 25.3.0 | Internationalisation |
| Radix UI | Latest | Composants UI |

## Installation

### Prérequis
- Node.js 18+
- MySQL 8+
- Redis (optionnel en développement)
- Git

### Installation du projet

```bash
# Cloner le repository
git clone https://github.com/votre-org/eventculture.git
cd eventculture

# Backend
cd backend
cp .env.example .env
npm install

# Générer un secret JWT
node scripts/generateSecret.js
# Copier le secret dans .env

# Frontend
cd ../frontEnd
cp .env.example .env
npm install
```

### Configuration de la base de données

```sql
-- Créer la base de données
CREATE DATABASE actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- En développement, vous pouvez utiliser root
-- En production, créez un utilisateur dédié:
CREATE USER 'actionculture_user'@'localhost' IDENTIFIED BY 'MotDePasseSecurise123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON actionculture.* TO 'actionculture_user'@'localhost';
FLUSH PRIVILEGES;
```

### Démarrage

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontEnd
npm run dev
```

Le frontend sera accessible sur http://localhost:8080
L'API sera accessible sur http://localhost:3001

## Structure du Projet

```
eventculture/
├── backend/                 # API Node.js/Express
│   ├── config/              # Configuration (DB, env)
│   ├── controllers/         # Logique métier
│   ├── middlewares/         # Middlewares Express
│   ├── models/              # Modèles Sequelize
│   ├── routes/              # Routes API
│   ├── services/            # Services métier
│   ├── helpers/             # Helpers (i18n, etc.)
│   ├── scripts/             # Scripts utilitaires
│   └── uploads/             # Fichiers uploadés
│
├── frontEnd/                # Application React
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── pages/           # Pages (routes)
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # Services API
│   │   ├── contexts/        # Contextes React
│   │   ├── types/           # Types TypeScript
│   │   └── i18n/            # Traductions
│   └── public/              # Assets statiques
│
└── docs/                    # Documentation
```

## Documentation détaillée

- [Architecture du projet](./ARCHITECTURE.md)
- [Guide de l'API](./API.md)
- [Guide du Frontend](./FRONTEND.md)
- [Guide de contribution](./CONTRIBUTING.md)
- [Checklist de production](../PRODUCTION_CHECKLIST.md)

## Langues supportées

| Code | Langue | Direction |
|------|--------|-----------|
| fr | Français | LTR |
| ar | Arabe | RTL |
| en | Anglais | LTR |
| tz-ltn | Tamazight (Latin) | LTR |
| tz-tfng | Tamazight (Tifinagh) | LTR |

## Rôles utilisateurs

| Rôle | Description | Accès |
|------|-------------|-------|
| Visiteur | Utilisateur non connecté | Consultation uniquement |
| User | Utilisateur inscrit | Favoris, commentaires, inscriptions |
| Professionnel | Créateur de contenu | Gestion œuvres, événements |
| Administrateur | Super utilisateur | Accès complet, modération |

## Scripts disponibles

### Backend
```bash
npm run dev          # Démarrage en développement
npm run start        # Démarrage en production
npm run start:safe   # Démarrage avec validation env
npm run lint         # Vérification ESLint
```

### Frontend
```bash
npm run dev          # Démarrage en développement
npm run build        # Build de production
npm run preview      # Preview du build
npm run lint         # Vérification ESLint
npm run build:analyze # Analyse du bundle
```

## Variables d'environnement

Voir les fichiers `.env.example` dans chaque dossier pour la liste complète.

### Variables critiques
- `JWT_SECRET` - Secret pour les tokens JWT (min 32 caractères)
- `DB_USER` / `DB_PASSWORD` - Credentials MySQL
- `FRONTEND_URL` - URL du frontend (HTTPS en production)
- `EMAIL_*` - Configuration SMTP

## Licence

Propriétaire - Tous droits réservés
