# Guide d'installation étudiante — EventCulture

## Objectif

Ce guide explique comment :

1. récupérer le projet
2. préparer votre machine
3. configurer les variables d’environnement
4. lancer l’application en local
5. résoudre les erreurs les plus fréquentes

Il est écrit pour un niveau **débutant** et couvre :

- **Windows**
- **macOS**
- **Linux**

---

## 1. Vue d’ensemble du projet

Le projet contient 2 applications principales :

- **`backend/`** : API Node.js / Express / Sequelize / MySQL
- **`frontEnd/`** : application React / Vite / TypeScript

Il existe aussi une stack Docker à la racine du projet :

- **`docker-compose.yml`** : environnement de développement avec `backend`, `frontEnd`, `mysql`, `redis`

## Ports utilisés

En développement local :

- **Frontend Vite** : `http://localhost:8080`
- **Backend API** : `http://localhost:3001`
- **API REST** : `http://localhost:3001/api`
- **Health backend** : `http://localhost:3001/health`
- **MySQL** : `localhost:3306`

En Docker :

- **Frontend** : `http://localhost:3000`
- **Backend API** : `http://localhost:3001/api`

---

## 2. Prérequis

### Obligatoires

- **Git**
- **Node.js 20 ou plus**
- **npm**
- **MySQL 8+** si vous lancez le projet **sans Docker**

### Recommandés

- **Docker Desktop** ou Docker Engine + Docker Compose
- **VS Code** ou un IDE équivalent

### Vérifier les versions

#### Windows

```powershell
git --version
node --version
npm --version
docker --version
docker compose version
mysql --version
```

#### macOS / Linux

```bash
git --version
node --version
npm --version
docker --version
docker compose version
mysql --version
```

Si une commande n’est pas reconnue, installez l’outil avant de continuer.

---

## 3. Récupérer le projet

```bash
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ
```

## 3.1 Éviter les problèmes Git, LF/CRLF et Docker

Pour que le projet fonctionne correctement avec Docker, Bash, Nginx et les scripts shell, les fichiers du dépôt doivent rester en **LF**.

Sous Windows, Git peut parfois convertir certains fichiers en **CRLF**, ce qui peut provoquer des erreurs du type :

- scripts `.sh` qui ne démarrent pas
- erreurs `^M`
- comportements différents entre Windows et Docker

### Réglage Git recommandé

À faire une seule fois sur votre machine :

```bash
git config --global core.autocrlf false
git config --global core.eol lf
```

Le dépôt contient un fichier `.gitattributes` pour imposer automatiquement le bon format de fin de ligne selon le type de fichier.

### Vérification recommandée juste après le clone

Exécutez :

```bash
git add --renormalize .
git status
```

Résultat attendu :

- soit aucun changement
- soit seulement des changements de fin de ligne à valider avant de continuer

Les scripts Windows comme `.bat` ou `.ps1` peuvent rester en **CRLF**. En revanche, les fichiers Docker, `.sh`, `.yml`, `.conf`, `.sql`, `Dockerfile`, `.env` et les fichiers source du projet doivent rester normalisés correctement par Git.

---

## 4. Comprendre les fichiers `.env`

Le projet utilise **deux contextes principaux** de configuration :

### A. Mode Docker

Le fichier utilisé est :

- **`.env` à la racine du projet**

Il est lu par `docker-compose.yml`.

### B. Mode local sans Docker

Le fichier utilisé pour le backend est :

- **`backend/.env`**

Le frontend local utilise Vite avec un proxy vers le backend. Il n’a pas forcément besoin d’un fichier `.env` pour démarrer en développement local simple.

---

## 5. Installation recommandée : avec Docker

C’est la méthode la plus simple pour éviter les problèmes de configuration MySQL et Redis.

### Étape 1 — Créer le fichier `.env` racine

#### Windows

```powershell
Copy-Item .env.example .env
```

#### macOS / Linux

```bash
cp .env.example .env
```

### Étape 2 — Modifier les variables minimales

Ouvrez le fichier `.env` à la racine et vérifiez au minimum :

```env
NODE_ENV=development
PORT=3001
MYSQL_ROOT_PASSWORD=VotreMotDePasseRoot
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=VotreMotDePasseUser
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=un_secret_long_genere
VITE_API_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
BASE_URL=http://localhost:3001
REDIS_PASSWORD=un_mot_de_passe_redis
```

### Étape 3 — Générer un vrai `JWT_SECRET`

Vous pouvez générer une valeur sécurisée avec Node.js :

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiez le résultat dans `JWT_SECRET=`.

### Étape 4 — Lancer le setup Docker recommandé

La méthode recommandée pour un étudiant est :

```bash
make setup
```

Cette commande :

- active temporairement `DB_SYNC=true`
- construit et démarre les conteneurs
- laisse le backend créer les tables
- charge les données de test
- remet ensuite `DB_SYNC=false`
- redémarre le backend dans un état normal

Si `make` n’est pas disponible sur votre machine, utilisez Git Bash, WSL, Chocolatey, MSYS2 ou une autre méthode d’installation de `make`.

La commande suivante peut démarrer les conteneurs, mais elle ne remplace pas complètement `make setup` pour un débutant :

```bash
docker compose up -d --build
```

### Étape 5 — Vérifier que tout fonctionne

```bash
docker compose ps
```

Vous devez voir les services :

- `eventculture-backend`
- `eventculture-frontend`
- `eventculture-mysql`
- `eventculture-redis`

### Étape 6 — Ouvrir l’application

- Frontend : `http://localhost:3000`
- API : `http://localhost:3001/api`
- Health : `http://localhost:3001/health`

### Étape 7 — Se connecter avec les comptes de test

- **Admin** : `admin@actionculture.dz` / `admin123`
- **Professionnel** : `pro.artiste@eventculture.dz` / `ProTest2024!`

### Remarque importante sur les seeds / migrations

En mode Docker, **`make setup`** est la méthode à privilégier car elle gère automatiquement la création initiale de la base et le chargement des données de test.

La commande simple :

```bash
docker compose up -d --build
```

ne remplace pas entièrement `make setup` pour un étudiant débutant.

Le dépôt contient aussi plusieurs scripts de base de données. Selon l’état du projet ou du poste étudiant, il peut parfois être nécessaire d’exécuter des migrations ou des seeds manuellement.

Exemples :

```bash
docker exec -it eventculture-backend npm run db:migrate
docker exec -it eventculture-backend npm run db:seed
```

Si une commande échoue, consultez d’abord la section **Dépannage** plus bas.

---

## 6. Installation sans Docker

Utilisez cette méthode si vous voulez lancer séparément MySQL, le backend et le frontend sur votre machine.

## 6.1 Préparer MySQL

Assurez-vous que MySQL est démarré.

Créez la base de données et l’utilisateur.

### Exemple SQL

```sql
CREATE DATABASE actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'actionculture_user'@'localhost' IDENTIFIED BY 'VotreMotDePasseUser';
GRANT ALL PRIVILEGES ON actionculture.* TO 'actionculture_user'@'localhost';
FLUSH PRIVILEGES;
```

Si vous utilisez déjà `root`, adaptez `DB_USER` et `DB_PASSWORD` en conséquence dans `backend/.env`.

### Important sur `DB_SYNC` en local

En installation locale sans Docker, gardez `DB_SYNC=false`.

Pour créer ou mettre à jour la structure de base de données, utilisez les migrations du projet au lieu d’activer la synchronisation automatique Sequelize.

## 6.2 Installer et configurer le backend

### Étape 1 — Aller dans le dossier backend

```bash
cd backend
```

### Étape 2 — Installer les dépendances

```bash
npm install
```

### Étape 3 — Créer `backend/.env`

#### Windows

```powershell
Copy-Item .env.example .env
```

#### macOS / Linux

```bash
cp .env.example .env
```

### Étape 4 — Modifier les variables importantes

Dans `backend/.env`, vérifiez au minimum :

```env
NODE_ENV=development
PORT=3001
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=VotreMotDePasseUser
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql
JWT_SECRET=un_secret_long_genere
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:8080
BASE_URL=http://localhost:3001
USE_REDIS_MEMORY=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Pourquoi `USE_REDIS_MEMORY=true` ?

En développement local, le backend peut fonctionner plus facilement sans Redis Docker si cette variable reste activée.

### Étape 5 — Générer un secret JWT

```bash
npm run generate:secret
```

Puis reportez la valeur dans `backend/.env` si nécessaire.

### Étape 6 — Lancer les migrations

```bash
npm run db:migrate
```

### Étape 7 — Démarrer le backend

```bash
npm run dev
```

Le backend doit répondre sur :

- `http://localhost:3001`
- `http://localhost:3001/api`
- `http://localhost:3001/health`

## 6.3 Installer et lancer le frontend

Ouvrez un **deuxième terminal**.

```bash
cd frontEnd
npm install
npm run dev
```

Le frontend démarre sur :

- `http://localhost:8080`

### Important

Le dossier frontend s’écrit exactement :

```text
frontEnd
```

Respectez bien la casse du nom de dossier, surtout sur macOS/Linux.

---

## 7. Commandes utiles

## Backend

```bash
cd backend
npm run dev
npm start
npm run start:safe
npm run db:migrate
npm run db:seed
npm run db:init
npm run db:reset
npm run lint
npm test
```

## Frontend

```bash
cd frontEnd
npm run dev
npm run build
npm run preview
npm run lint
npm test
```

## Docker

```bash
make setup
docker compose up -d --build
docker compose down
docker compose ps
docker compose logs -f
```

## Makefile

Sur macOS/Linux, vous pouvez aussi utiliser :

```bash
make setup
make up
make down
make logs
make build
make reset
```

Sur Windows, utilisez plutôt directement `docker compose ...`, sauf si vous avez un environnement `make` configuré.

---

## 8. Erreurs fréquentes et solutions

## Erreur 1 — `cp` n'est pas reconnu sur Windows

### Cause

La commande `cp` est une commande Linux/macOS.

### Solution

Utilisez :

```powershell
Copy-Item .env.example .env
```

ou dans l’invite de commandes Windows :

```cmd
copy .env.example .env
```

---

## Erreur 2 — le frontend ne démarre pas car le dossier `frontend` n’existe pas

### Cause

Le vrai nom du dossier est :

```text
frontEnd
```

### Solution

Utilisez :

```bash
cd frontEnd
```

et non `cd frontend`.

---

## Erreur 3 — `EADDRINUSE` ou port déjà utilisé

### Cause

Le port est déjà pris par une autre application.

### Ports concernés

- `3000`
- `3001`
- `3306`
- `8080`

### Solution

Fermez l’application qui utilise ce port ou changez la configuration locale.

### Vérification Windows

```powershell
netstat -ano | findstr :3001
```

### Vérification macOS / Linux

```bash
lsof -i :3001
```

---

## Erreur 4 — impossible de se connecter à MySQL

### Cause

- MySQL n’est pas démarré
- identifiants faux dans `.env`
- base non créée

### Solution

Vérifiez :

- que MySQL est lancé
- que `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` sont corrects
- que la base `actionculture` existe

Puis relancez :

```bash
cd backend
npm run db:migrate
```

---

## Erreur 5 — backend lancé mais frontend ne charge pas les données

### Cause probable

Le backend n’est pas accessible ou l’URL frontend/backend n’est pas cohérente.

### Vérifications

En local sans Docker :

- frontend : `http://localhost:8080`
- backend : `http://localhost:3001`
- `backend/.env` doit contenir `FRONTEND_URL=http://localhost:8080`

En Docker :

- frontend : `http://localhost:3000`
- `.env` racine doit contenir `FRONTEND_URL=http://localhost:3000`

---

## Erreur 6 — `docker compose` échoue au build

### Causes possibles

- Docker non démarré
- ancien cache Docker
- `.env` racine manquant

### Solutions

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

Vérifiez aussi que le fichier `.env` existe à la racine du projet.

---

## Erreur 7 — Redis pose problème en local

### Cause

Redis n’est pas installé sur la machine.

### Solution simple

Dans `backend/.env`, gardez :

```env
USE_REDIS_MEMORY=true
```

Cela facilite le démarrage local en développement.

---

## Erreur 8 — `npm install` échoue

### Causes possibles

- version Node.js trop ancienne
- cache npm corrompu
- dépendances natives manquantes

### Solutions

```bash
node --version
npm --version
npm cache clean --force
npm install
```

Le projet vise **Node.js 20+**.

---

## Erreur 9 — la route `/api/v2` ne fonctionne pas

### Cause

Le projet est monté sur **`/api`**, pas sur `/api/v2`.

### Bonne base URL

```text
http://localhost:3001/api
```

---

## 9. Vérification rapide après installation

Quand tout fonctionne, vous devez pouvoir :

1. ouvrir le frontend
2. ouvrir le backend healthcheck
3. voir que le backend répond sans erreur

### URLs à tester

- `http://localhost:3001/health`
- `http://localhost:3001/api`
- `http://localhost:8080` en local sans Docker
- `http://localhost:3000` en Docker

---

## 10. Ordre conseillé pour un étudiant

Si vous débutez, utilisez cet ordre :

1. essayer **Docker**
2. si Docker ne fonctionne pas, passer au **mode local sans Docker**
3. vérifier les variables d’environnement
4. vérifier MySQL
5. vérifier les ports
6. lire la section **Dépannage**

---

## 11. Fichiers importants à connaître

- `README.md`
- `.env.example`
- `backend/.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `backend/package.json`
- `frontEnd/package.json`
- `frontEnd/vite.config.ts`
- `setup.sh`
- `setup-local.bat`

---

## 12. Résumé rapide

### Lancement Docker

```bash
cp .env.example .env
# ou Copy-Item .env.example .env sur Windows

docker compose up -d --build
```

Puis ouvrir :

- `http://localhost:3000`

### Lancement local sans Docker

Terminal 1 :

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Terminal 2 :

```bash
cd frontEnd
npm install
npm run dev
```

Puis ouvrir :

- `http://localhost:8080`

---

## 13. Conseils pédagogiques

- Commencez toujours par vérifier les **ports**, les **variables d’environnement** et les **versions d’outils**.
- Si une commande échoue, copiez le message exact avant de modifier autre chose.
- Ne mélangez pas les deux modes de lancement en même temps au début : choisissez **Docker** ou **local**, pas les deux.
- Sur macOS/Linux, faites attention à la casse de `frontEnd`.
