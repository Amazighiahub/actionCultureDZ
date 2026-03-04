# Guide Complet pour Stagiaires - EventCulture

Guide pas-a-pas pour installer, configurer et travailler sur le projet EventCulture.

---

## Table des matieres

1. [Installer les outils necessaires](#1-installer-les-outils-necessaires)
2. [Git et GitHub](#2-git-et-github)
3. [Cloner et configurer le projet](#3-cloner-et-configurer-le-projet)
4. [Lancer le projet en local (sans Docker)](#4-lancer-le-projet-en-local-sans-docker)
5. [Docker - Installation et utilisation](#5-docker---installation-et-utilisation)
6. [Nginx - Comment ca marche dans le projet](#6-nginx---comment-ca-marche-dans-le-projet)
7. [Workflow quotidien avec Git](#7-workflow-quotidien-avec-git)
8. [Commandes utiles](#8-commandes-utiles)
9. [Problemes courants et solutions](#9-problemes-courants-et-solutions)
10. [Architecture du projet](#10-architecture-du-projet)

---

## 1. Installer les outils necessaires

### 1.1 Node.js (v18 ou plus)

Node.js est le runtime qui fait tourner le backend et les outils frontend.

**Telecharger** : https://nodejs.org (choisir la version **LTS**)

**Installation Windows :**
1. Telecharger le fichier `.msi` depuis le site
2. Double-cliquer sur le fichier telecharge
3. Suivre l'assistant d'installation (garder les options par defaut)
4. Cocher "Automatically install the necessary tools" si propose

**Verifier l'installation :**
```bash
node --version    # Doit afficher v18.x.x ou plus
npm --version     # Doit afficher 9.x.x ou plus
```

---

### 1.2 MySQL (v8+)

MySQL est la base de donnees du projet.

**Telecharger** : https://dev.mysql.com/downloads/installer/

**Installation Windows :**
1. Telecharger "MySQL Installer for Windows"
2. Choisir **Custom** et selectionner :
   - MySQL Server 8.x
   - MySQL Workbench (interface graphique, optionnel mais recommande)
3. Lors de la configuration :
   - Definir un mot de passe root (retenir ce mot de passe !)
   - Port par defaut : `3306`
4. Terminer l'installation

**Verifier l'installation :**
```bash
mysql --version
# OU se connecter :
mysql -u root -p
# Entrer le mot de passe, puis taper : exit
```

---

### 1.3 Git (v2.30+)

Git est l'outil de controle de version pour suivre les modifications du code.

**Telecharger** : https://git-scm.com/downloads

**Installation Windows :**
1. Telecharger le fichier `.exe`
2. Pendant l'installation, options recommandees :
   - **Default editor** : choisir "Use Visual Studio Code" (si VS Code installe)
   - **Adjusting PATH** : "Git from the command line and also from 3rd-party software"
   - **Line ending** : "Checkout as-is, commit Unix-style line endings"
   - Le reste : garder les options par defaut
3. Terminer l'installation

**Configurer Git pour la premiere fois :**
```bash
git config --global user.name "Ton Nom Complet"
git config --global user.email "ton.email@exemple.com"
git config --global core.autocrlf true
```

**Verifier :**
```bash
git --version
```

---

### 1.4 Visual Studio Code

**Telecharger** : https://code.visualstudio.com

**Extensions recommandees a installer :**
- **ESLint** — Verification du code JavaScript/TypeScript
- **Prettier** — Formatage automatique du code
- **Tailwind CSS IntelliSense** — Autocompletion CSS
- **MySQL (cweijan)** — Voir la base de donnees
- **Thunder Client** — Tester les APIs (comme Postman)
- **GitLens** — Voir l'historique Git dans l'editeur

---

### 1.5 Docker Desktop (optionnel mais recommande)

Docker permet de lancer tout le projet en une seule commande.

**Telecharger** : https://www.docker.com/products/docker-desktop/

**Installation Windows :**
1. Telecharger Docker Desktop pour Windows
2. **Prerequis** : Activer WSL 2 (Windows Subsystem for Linux)
   - Ouvrir PowerShell en administrateur et executer :
   ```powershell
   wsl --install
   ```
   - Redemarrer l'ordinateur si demande
3. Installer Docker Desktop (double-clic sur le `.exe`)
4. Au premier lancement, accepter les conditions
5. Docker demarre automatiquement (icone dans la barre des taches)

**Verifier l'installation :**
```bash
docker --version           # Docker version 24.x.x ou plus
docker compose version     # Docker Compose version v2.x.x
```

> **Note** : Docker Desktop doit etre lance (icone visible dans la barre des taches) avant d'utiliser les commandes Docker.

---

## 2. Git et GitHub

### 2.1 C'est quoi Git ?

**Git** = outil local pour suivre les modifications de ton code (historique, branches, etc.)
**GitHub** = site web qui heberge le code en ligne pour le partager avec l'equipe.

### 2.2 Creer un compte GitHub

1. Aller sur https://github.com
2. Cliquer sur **Sign up**
3. Remplir : nom d'utilisateur, email, mot de passe
4. Verifier l'email

### 2.3 Configurer la connexion SSH (recommande)

La connexion SSH evite de taper son mot de passe a chaque `git push`.

```bash
# 1. Generer une cle SSH
ssh-keygen -t ed25519 -C "ton.email@exemple.com"
# Appuyer sur Entree 3 fois (accepter le chemin par defaut, pas de passphrase)

# 2. Afficher la cle publique
cat ~/.ssh/id_ed25519.pub
# Copier tout le texte affiche
```

3. Aller sur GitHub > **Settings** > **SSH and GPG keys** > **New SSH key**
4. Coller la cle et sauvegarder

**Tester la connexion :**
```bash
ssh -T git@github.com
# Reponse attendue : "Hi <username>! You've successfully authenticated..."
```

### 2.4 Alternative : connexion HTTPS avec token

Si SSH ne fonctionne pas :
1. GitHub > **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
2. **Generate new token** > cocher `repo` > **Generate**
3. Copier le token (il ne sera plus visible apres)
4. Utiliser ce token comme mot de passe lors du `git push`

---

## 3. Cloner et configurer le projet

### 3.1 Cloner le repository

```bash
# Avec SSH (recommande) :
git clone git@github.com:VOTRE-ORGANISATION/EventCulture.git

# OU avec HTTPS :
git clone https://github.com/VOTRE-ORGANISATION/EventCulture.git

# Entrer dans le dossier du projet
cd EventCulture
```

> Remplacer `VOTRE-ORGANISATION` par le vrai nom du compte GitHub.

### 3.2 Configuration Git importante (Windows)

```bash
# Dans le dossier du projet :
git config core.ignorecase false
```

> C'est important car Linux (serveur de production) est sensible a la casse des fichiers, pas Windows.

### 3.3 Se placer sur la bonne branche

```bash
# Voir la branche actuelle
git branch

# Passer sur la branche de developpement
git checkout develop

# Creer ta branche de travail
git checkout -b feature/mon-travail
```

### 3.4 Configurer le backend

```bash
cd backend

# Copier le fichier de configuration
cp .env.example .env
```

**Editer le fichier `backend/.env`** avec VS Code et remplir au minimum :

```env
# Base de donnees - mettre TES credentials MySQL
DB_NAME=actionculture
DB_USER=root
DB_PASSWORD=ton_mot_de_passe_mysql
DB_HOST=localhost
DB_PORT=3306

# JWT - generer avec la commande ci-dessous
JWT_SECRET=A_GENERER

# URLs
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

**Generer le secret JWT :**
```bash
node scripts/generateSecret.js
# Copier le resultat dans .env -> JWT_SECRET=...
```

**Installer les dependances :**
```bash
npm install
```

### 3.5 Configurer le frontend

```bash
cd ../frontEnd
npm install
```

Le fichier `.env.development` est deja configure pour le developpement local.

### 3.6 Creer la base de donnees

```bash
# Se connecter a MySQL
mysql -u root -p

# Dans MySQL, executer :
CREATE DATABASE actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

### 3.7 Peupler la base de donnees (donnees de test)

```bash
cd backend

# Seed principal (tout d'un coup)
node scripts/seed-database.js

# OU etape par etape :
node scripts/seed-geography.js         # Wilayas, Dairas, Communes
node scripts/seed-data-reference.js    # Types, categories
node scripts/seed-all-data.js          # Utilisateurs, oeuvres, evenements
```

**Comptes de test crees :**

| Email | Mot de passe | Role |
|-------|-------------|------|
| `admin@eventculture.dz` | `Admin123!` | Administrateur |
| `pro@eventculture.dz` | `Pro123!` | Professionnel |
| `user@eventculture.dz` | `User123!` | Utilisateur |

---

## 4. Lancer le projet en local (sans Docker)

### 4.1 Demarrer le backend

```bash
# Ouvrir un terminal dans VS Code (Terminal > New Terminal)
cd backend
npm run dev
```

Le serveur demarre sur **http://localhost:3001**

Tester : ouvrir http://localhost:3001/health dans le navigateur. Resultat attendu : `OK` ou un JSON de sante.

### 4.2 Demarrer le frontend

```bash
# Ouvrir un DEUXIEME terminal dans VS Code
cd frontEnd
npm run dev
```

Le frontend demarre sur **http://localhost:8080**

### 4.3 Acceder a l'application

- **Application** : http://localhost:8080
- **API** : http://localhost:3001/api
- **API v2** : http://localhost:3001/api/v2

---

## 5. Docker - Installation et utilisation

### 5.1 C'est quoi Docker ?

Docker permet de faire tourner l'application dans des **conteneurs** isoles. Un conteneur = une mini-machine qui contient tout ce qu'il faut pour faire tourner un service (Node.js, MySQL, etc.).

**Avantages :**
- Tout le monde a exactement le meme environnement
- Installation en une seule commande
- Pas besoin d'installer MySQL, Redis, etc. sur ta machine
- Proche de l'environnement de production

### 5.2 Les fichiers Docker du projet

```
EventCulture/
├── docker-compose.yml          # Orchestre tous les services
├── backend/
│   └── Dockerfile              # Image Docker du backend (Node.js)
└── frontEnd/
    ├── Dockerfile              # Image Docker du frontend (React + Nginx)
    └── nginx.conf              # Configuration du serveur web Nginx
```

### 5.3 Comprendre le docker-compose.yml

Le fichier `docker-compose.yml` definit **4 services** qui tournent ensemble :

```
┌─────────────────────────────────────────────────┐
│                Docker Compose                    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  ┌─────┐│
│  │ Frontend │  │ Backend  │  │ MySQL │  │Redis││
│  │ port 3000│  │ port 3001│  │  3306 │  │ 6379││
│  │ (Nginx)  │──│ (Node.js)│──│       │  │     ││
│  └──────────┘  └──────────┘  └───────┘  └─────┘│
│                                                  │
│           Reseau: eventculture-network           │
└─────────────────────────────────────────────────┘
```

| Service | Image | Port | Role |
|---------|-------|------|------|
| `frontend` | React + Nginx | 3000 | Interface utilisateur |
| `backend` | Node.js + Express | 3001 | API REST |
| `mysql` | MySQL 8.0 | 3306 | Base de donnees |
| `redis` | Redis 7 | 6379 | Cache et sessions |

### 5.4 Configurer Docker

**Avant de lancer Docker, creer le fichier `.env` a la racine du projet :**

```bash
# A la racine du projet (pas dans backend/ ou frontEnd/)
cp .env.example .env
```

**Editer `.env` a la racine :**

```env
# Mots de passe MySQL
MYSQL_ROOT_PASSWORD=un_mot_de_passe_root_solide
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=un_mot_de_passe_utilisateur_solide_16_chars

# JWT
JWT_SECRET=un_secret_tres_long_minimum_32_caracteres

# URLs
VITE_API_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:3000
```

> **IMPORTANT** : Ne jamais commiter le fichier `.env` ! Il contient des mots de passe.

### 5.5 Lancer le projet avec Docker

```bash
# S'assurer que Docker Desktop est lance (icone dans la barre des taches)

# Se placer a la racine du projet
cd EventCulture

# Construire et lancer tous les services
docker compose up -d
```

**Explication de la commande :**
- `docker compose` : outil d'orchestration
- `up` : demarrer les services
- `-d` : mode "detache" (le terminal reste libre)

**Premiere execution** : le build prend 3-5 minutes (telechargement des images, installation des dependances).

### 5.6 Verifier que tout fonctionne

```bash
# Voir l'etat des conteneurs
docker compose ps
```

**Resultat attendu** : 4 services avec le statut `Up` et `(healthy)` :

```
NAME                     STATUS              PORTS
eventculture-backend     Up (healthy)        0.0.0.0:3001->3001/tcp
eventculture-frontend    Up (healthy)        0.0.0.0:3000->80/tcp
eventculture-mysql       Up (healthy)        0.0.0.0:3306->3306/tcp
eventculture-redis       Up (healthy)        0.0.0.0:6379->6379/tcp
```

**Acceder a l'application :**
- **Frontend** : http://localhost:3000
- **API** : http://localhost:3001/api
- **Health check** : http://localhost:3001/health

### 5.7 Commandes Docker essentielles

```bash
# Demarrer les services
docker compose up -d

# Arreter les services
docker compose down

# Arreter ET supprimer les donnees (volumes)
docker compose down -v
# ⚠️ Attention : cela supprime la base de donnees !

# Voir les logs de tous les services
docker compose logs

# Voir les logs d'un service specifique
docker compose logs backend
docker compose logs frontend
docker compose logs mysql

# Suivre les logs en temps reel
docker compose logs -f backend

# Reconstruire apres modification du code
docker compose up -d --build

# Reconstruire un seul service
docker compose up -d --build backend

# Entrer dans un conteneur (pour debugger)
docker compose exec backend sh
docker compose exec mysql mysql -u root -p

# Voir les images Docker
docker images

# Voir les conteneurs en cours
docker ps

# Nettoyer les images inutilisees
docker system prune
```

### 5.8 Comprendre les Dockerfiles

#### Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
# Etape 1 : Base - Image legere Node.js
FROM node:20-alpine AS base

# Etape 2 : Dependencies - Installe UNIQUEMENT les deps de production
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Etape 3 : Builder - Installe tout + lance les tests
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test || echo "Tests skipped"

# Etape 4 : Production - Image finale legere
FROM base AS production
ENV NODE_ENV=production
# Cree un utilisateur non-root (securite)
RUN addgroup --system nodejs && adduser --system expressjs
# Copie uniquement les deps de production + le code
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
USER expressjs
CMD ["node", "server.js"]
```

#### Frontend Dockerfile (`frontEnd/Dockerfile`)

```dockerfile
# Etape 1 : Installe les dependances
FROM node:20-alpine AS deps
COPY package*.json ./
RUN npm ci

# Etape 2 : Build l'application React
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build    # Genere le dossier dist/

# Etape 3 : Sert les fichiers avec Nginx
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 6. Nginx - Comment ca marche dans le projet

### 6.1 C'est quoi Nginx ?

**Nginx** (prononce "engine-x") est un serveur web. Dans ce projet, il sert le frontend React en production.

**En developpement** : Vite sert les fichiers (avec hot-reload).
**En production (Docker)** : Nginx sert les fichiers compiles (plus rapide et securise).

### 6.2 Le fichier nginx.conf

Le fichier `frontEnd/nginx.conf` configure comment Nginx sert l'application :

```nginx
server {
    listen 80;                              # Ecoute sur le port 80
    root /usr/share/nginx/html;             # Dossier des fichiers React compiles
    index index.html;

    # Compression Gzip - reduit la taille des fichiers envoyes
    gzip on;

    # Headers de securite
    add_header X-Frame-Options "SAMEORIGIN";          # Empeche l'iframe hijacking
    add_header X-Content-Type-Options "nosniff";       # Empeche le MIME sniffing
    add_header X-XSS-Protection "1; mode=block";       # Protection XSS

    # Cache des fichiers statiques (JS, CSS, images) pendant 1 an
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback : toutes les routes vers index.html
    # C'est essentiel pour React Router !
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check pour Docker
    location /health {
        return 200 "healthy\n";
    }
}
```

**Points cles :**
- `try_files $uri $uri/ /index.html;` : si une URL comme `/evenements/123` est demandee, Nginx renvoie `index.html` et React Router gere la route cote client.
- Le cache de 1 an sur les fichiers statiques accelere le chargement (les fichiers Vite ont un hash unique dans leur nom, donc le cache est invalide automatiquement lors d'un nouveau build).

### 6.3 Proxy API (optionnel)

Le fichier contient une section commentee pour faire passer les appels API par Nginx :

```nginx
# Decommenter pour activer le proxy API :
# location /api {
#     proxy_pass http://backend:3001;
# }
```

Si active, les appels a `http://localhost:3000/api/...` seraient rediriges vers le backend. Actuellement, le frontend appelle directement `http://localhost:3001/api`.

---

## 7. Workflow quotidien avec Git

### 7.1 Schema du workflow

```
main (production)
  │
  └── develop (developpement)
        │
        ├── feature/ajout-filtres    (ta branche)
        ├── feature/page-contact     (branche d'un collegue)
        └── fix/bug-connexion        (correction de bug)
```

### 7.2 Avant de commencer a travailler (chaque jour)

```bash
# 1. Se placer sur develop
git checkout develop

# 2. Recuperer les dernieres modifications de l'equipe
git pull origin develop

# 3. Retourner sur ta branche de travail
git checkout feature/ma-feature

# 4. Mettre ta branche a jour avec develop
git merge develop
# OU (plus propre) :
git rebase develop
```

### 7.3 Creer une nouvelle branche pour une tache

```bash
# Depuis develop :
git checkout develop
git pull origin develop

# Creer la branche :
git checkout -b feature/nom-descriptif
# Exemples :
# git checkout -b feature/page-evenements
# git checkout -b fix/bug-login
# git checkout -b refactor/service-oeuvres
```

**Conventions de nommage des branches :**
- `feature/...` : nouvelle fonctionnalite
- `fix/...` : correction de bug
- `refactor/...` : refactoring de code
- `docs/...` : documentation

### 7.4 Sauvegarder son travail (commit)

```bash
# 1. Voir les fichiers modifies
git status

# 2. Voir les modifications en detail
git diff

# 3. Ajouter les fichiers a commiter
git add chemin/du/fichier.js
git add chemin/du/dossier/
# OU pour tout ajouter :
git add .

# 4. Creer le commit avec un message clair
git commit -m "feat: ajouter la page de detail d'un evenement"
```

**Format des messages de commit :**
- `feat:` — nouvelle fonctionnalite
- `fix:` — correction de bug
- `refactor:` — refactoring (pas de changement fonctionnel)
- `docs:` — documentation
- `style:` — formatage, CSS
- `test:` — ajout/modification de tests

### 7.5 Envoyer sur GitHub (push)

```bash
# Premier push d'une nouvelle branche :
git push -u origin feature/ma-feature

# Push suivants (meme branche) :
git push
```

### 7.6 Creer une Pull Request (PR) sur GitHub

1. Aller sur le repository GitHub
2. GitHub propose automatiquement de creer une PR pour ta branche
3. Cliquer sur **"Compare & pull request"**
4. Remplir :
   - **Titre** : description courte (ex: "Ajouter la page detail evenement")
   - **Description** : ce qui a ete fait, comment tester
   - **Base branch** : `develop` (pas `main` !)
5. Cliquer sur **"Create pull request"**
6. Attendre la review de l'equipe

### 7.7 Apres validation de la PR

```bash
# Retourner sur develop
git checkout develop

# Recuperer les changements merges
git pull origin develop

# Supprimer ta branche locale (optionnel)
git branch -d feature/ma-feature
```

---

## 8. Commandes utiles

### Backend

```bash
cd backend
npm run dev              # Demarrage avec hot-reload (nodemon)
npm run start            # Demarrage production
npm test                 # Lancer les tests
npm run lint             # Verification ESLint
```

### Frontend

```bash
cd frontEnd
npm run dev              # Demarrage avec hot-reload (Vite)
npm run build            # Build de production
npm run preview          # Preview du build
npm run test             # Tests Vitest
npm run lint             # Verification ESLint
npm run build:analyze    # Analyse de la taille du bundle
```

### Scripts de donnees

```bash
cd backend
node scripts/seed-database.js        # Seed principal (tout)
node scripts/seed-geography.js       # Wilayas/Dairas/Communes
node scripts/seed-data-reference.js  # Types, categories
node scripts/seed-all-data.js        # Donnees completes de test
node scripts/reset-database.js       # ⚠️ RESET complet de la DB
node scripts/generateSecret.js       # Generer un secret JWT
```

### Docker

```bash
docker compose up -d                 # Lancer tout
docker compose down                  # Arreter tout
docker compose up -d --build         # Reconstruire et relancer
docker compose logs -f backend       # Voir les logs backend
docker compose ps                    # Etat des conteneurs
docker compose exec backend sh       # Terminal dans le conteneur
```

### Git

```bash
git status                           # Voir les modifications
git log --oneline -10                # 10 derniers commits
git diff                             # Voir les differences
git stash                            # Mettre de cote ses modifications
git stash pop                        # Recuperer les modifications mises de cote
git branch -a                        # Voir toutes les branches
```

---

## 9. Problemes courants et solutions

### Installation

| Probleme | Solution |
|----------|----------|
| `node` non reconnu | Reinstaller Node.js et redemarrer le terminal |
| `npm install` echoue | Supprimer `node_modules/` et `package-lock.json`, puis `npm install` |
| `git clone` echoue | Verifier la connexion SSH/HTTPS (voir section 2) |

### Base de donnees

| Probleme | Solution |
|----------|----------|
| `ER_ACCESS_DENIED` | Verifier `DB_USER` et `DB_PASSWORD` dans `.env` |
| `ECONNREFUSED 3306` | MySQL n'est pas demarre. Lancer le service MySQL |
| `Unknown database` | Creer la base : `CREATE DATABASE actionculture ...;` |

### Backend

| Probleme | Solution |
|----------|----------|
| `JWT_SECRET required` | Lancer `node scripts/generateSecret.js` et copier dans `.env` |
| `Cannot find module` | `npm install` dans le dossier `backend/` |
| Port 3001 deja utilise | Fermer l'autre processus ou changer le port dans `.env` |

### Frontend

| Probleme | Solution |
|----------|----------|
| Page blanche | Ouvrir la console navigateur (F12) pour voir l'erreur |
| Erreur CORS | Verifier que `FRONTEND_URL` dans `.env` backend correspond |
| `Module not found` | `npm install` dans le dossier `frontEnd/` |

### Docker

| Probleme | Solution |
|----------|----------|
| `docker: command not found` | Installer Docker Desktop et le demarrer |
| `Cannot connect to Docker daemon` | Lancer Docker Desktop (icone dans la barre des taches) |
| Port deja utilise | Arreter le service local (MySQL, etc.) ou changer le port |
| Build qui echoue | `docker compose down -v` puis `docker compose up -d --build` |
| MySQL pas pret | Attendre 30s (healthcheck) puis verifier `docker compose ps` |
| Conteneur qui redmarre en boucle | `docker compose logs <service>` pour voir l'erreur |

### Git

| Probleme | Solution |
|----------|----------|
| `Permission denied (publickey)` | Configurer la cle SSH (voir section 2.3) |
| Conflit de merge | Ouvrir le fichier, resoudre le conflit, `git add` puis `git commit` |
| Import qui casse apres merge | Verifier la casse des noms de fichiers (`git config core.ignorecase false`) |
| Push refuse | `git pull` d'abord, resoudre les conflits, puis `git push` |

---

## 10. Architecture du projet

```
EventCulture/
├── docker-compose.yml              # Orchestration Docker
├── .env.example                    # Template variables d'environnement
│
├── backend/                        # API Node.js + Express
│   ├── Dockerfile                  # Image Docker backend
│   ├── .env.example                # Template env backend
│   ├── server.js                   # Point d'entree serveur
│   ├── app.js                      # Configuration Express
│   ├── config/                     # Configuration (DB, env)
│   ├── controllers/                # Logique metier (1 par module)
│   ├── routes/                     # Routes API
│   │   ├── v2/                     # Routes API v2
│   │   └── admin/                  # Routes admin
│   ├── models/                     # Modeles Sequelize (tables MySQL)
│   ├── services/                   # Services metier
│   ├── repositories/               # Acces donnees
│   ├── middlewares/                # Auth, CORS, validation
│   ├── scripts/                    # Seeds, utilitaires
│   └── uploads/                    # Fichiers uploades
│
├── frontEnd/                       # SPA React + TypeScript
│   ├── Dockerfile                  # Image Docker frontend
│   ├── nginx.conf                  # Configuration Nginx
│   └── src/
│       ├── components/             # Composants React
│       │   ├── ui/                 # shadcn/ui (ne pas modifier)
│       │   └── shared/             # Composants partages
│       ├── pages/                  # Pages (1 par route)
│       ├── hooks/                  # Custom hooks React
│       ├── services/               # Appels API (axios)
│       ├── types/                  # Types TypeScript
│       └── i18n/                   # Traductions (fr, ar, en, tz)
│
└── docs/                           # Documentation
    ├── ONBOARDING.md               # Guide d'accueil
    ├── ARCHITECTURE.md             # Architecture detaillee
    ├── API.md                      # Documentation API
    ├── CONTRIBUTING.md             # Guide de contribution
    └── modules/                    # Doc par module metier
```

### Technologies principales

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, React Query, Zustand |
| **Backend** | Node.js 20, Express.js, Sequelize ORM, JWT, Bull (jobs) |
| **Base de donnees** | MySQL 8, Redis 7 |
| **DevOps** | Docker, Docker Compose, Nginx |
| **Langues** | Francais, Arabe (RTL), Anglais, Tamazight (Latin + Tifinagh) |

---

## Glossaire pour debutants

| Terme | Definition |
|-------|-----------|
| **API** | Interface qui permet au frontend de communiquer avec le backend |
| **Backend** | Partie serveur (logique metier, base de donnees) |
| **Branch** | Version parallele du code pour travailler sans casser le code principal |
| **Build** | Compilation du code source en fichiers optimises pour la production |
| **CLI** | Interface en ligne de commande (terminal) |
| **Clone** | Copier un repository GitHub sur ton ordinateur |
| **Commit** | Sauvegarde d'un ensemble de modifications dans Git |
| **Conteneur** | Environnement isole qui fait tourner un service (Docker) |
| **CORS** | Mecanisme de securite qui controle les appels entre domaines |
| **Dockerfile** | Recette pour construire une image Docker |
| **Frontend** | Partie visible par l'utilisateur (interface web) |
| **Hot-reload** | Rechargement automatique quand tu modifies le code |
| **Image Docker** | Modele pour creer des conteneurs |
| **JWT** | Token d'authentification (JSON Web Token) |
| **Merge** | Fusionner une branche dans une autre |
| **Nginx** | Serveur web qui sert les fichiers statiques en production |
| **ORM** | Outil qui traduit le code JavaScript en requetes SQL (Sequelize) |
| **PR (Pull Request)** | Demande de fusion de code sur GitHub |
| **Push** | Envoyer ses commits vers GitHub |
| **Pull** | Recuperer les derniers commits depuis GitHub |
| **Repository (Repo)** | Projet stocke sur GitHub |
| **Seed** | Script qui remplit la base de donnees avec des donnees de test |
| **SPA** | Single Page Application - application web qui ne recharge pas la page |
| **Volume Docker** | Stockage persistant pour les donnees des conteneurs |
