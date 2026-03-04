# Guide Complet de Deploiement - EventCulture sur OVHcloud

Guide detaille pas-a-pas pour deployer le projet EventCulture (backend + frontend) sur un VPS OVHcloud, avec Git, GitHub/GitLab, Docker, Nginx et CI/CD.

---

## Table des matieres

- [Partie 1 : Comprendre l'architecture de deploiement](#partie-1--comprendre-larchitecture-de-deploiement)
- [Partie 2 : Commander un VPS OVHcloud](#partie-2--commander-un-vps-ovhcloud)
- [Partie 3 : Se connecter au serveur (SSH)](#partie-3--se-connecter-au-serveur-ssh)
- [Partie 4 : Securiser le serveur](#partie-4--securiser-le-serveur)
- [Partie 5 : Installer les outils sur le serveur](#partie-5--installer-les-outils-sur-le-serveur)
- [Partie 6 : Configurer Git et cloner le projet](#partie-6--configurer-git-et-cloner-le-projet)
- [Partie 7 : Methode A - Deploiement SANS Docker (PM2 + Nginx)](#partie-7--methode-a---deploiement-sans-docker-pm2--nginx)
- [Partie 8 : Methode B - Deploiement AVEC Docker](#partie-8--methode-b---deploiement-avec-docker)
- [Partie 9 : Configurer un nom de domaine](#partie-9--configurer-un-nom-de-domaine)
- [Partie 10 : HTTPS avec Let's Encrypt](#partie-10--https-avec-lets-encrypt)
- [Partie 11 : CI/CD avec GitHub Actions](#partie-11--cicd-avec-github-actions)
- [Partie 12 : CI/CD avec GitLab CI](#partie-12--cicd-avec-gitlab-ci)
- [Partie 13 : Maintenance et monitoring](#partie-13--maintenance-et-monitoring)
- [Partie 14 : Sauvegardes automatiques](#partie-14--sauvegardes-automatiques)
- [Partie 15 : Problemes courants et solutions](#partie-15--problemes-courants-et-solutions)
- [Glossaire](#glossaire)

---

# Partie 1 : Comprendre l'architecture de deploiement

## 1.1 Schema global

```
                    INTERNET
                       |
                       v
              ┌─────────────────┐
              │  Nom de domaine │
              │ eventculture.dz │
              └────────┬────────┘
                       │
                       v
           ┌───────────────────────┐
           │    VPS OVHcloud       │
           │  (Ubuntu 22.04)       │
           │                       │
           │  ┌─────────────────┐  │
           │  │     NGINX       │  │
           │  │  (port 80/443)  │  │
           │  │  Reverse Proxy  │  │
           │  │  + SSL (HTTPS)  │  │
           │  └───────┬─────────┘  │
           │          │            │
           │    ┌─────┴──────┐     │
           │    │            │     │
           │    v            v     │
           │ ┌──────┐  ┌────────┐  │
           │ │Front │  │Backend │  │
           │ │static│  │Node.js │  │
           │ │files │  │:3001   │  │
           │ └──────┘  └───┬────┘  │
           │               │       │
           │         ┌─────┴────┐  │
           │         │          │  │
           │         v          v  │
           │    ┌───────┐ ┌──────┐ │
           │    │ MySQL │ │Redis │ │
           │    │ :3306 │ │:6379 │ │
           │    └───────┘ └──────┘ │
           └───────────────────────┘
```

## 1.2 Deux methodes de deploiement

| Critere | Methode A : PM2 + Nginx | Methode B : Docker |
|---------|------------------------|-------------------|
| Complexite | Plus simple | Plus technique |
| Ressources | Moins gourmand | Necessite plus de RAM |
| VPS minimum | 2 Go RAM | 4 Go RAM |
| Isolation | Pas d'isolation | Services isoles |
| Reproductibilite | Manuelle | Automatique |
| Recommandation | Debutants / Petit budget | Production serieuse |

---

# Partie 2 : Commander un VPS OVHcloud

## 2.1 Aller sur OVHcloud

1. Ouvrir https://www.ovhcloud.com/fr/
2. Cliquer sur **Bare Metal & VPS** > **VPS**
3. OU aller directement sur https://www.ovhcloud.com/fr/vps/

## 2.2 Choisir l'offre

| Offre recommandee | Methode A (sans Docker) | Methode B (avec Docker) |
|-------------------|------------------------|------------------------|
| **VPS Starter** | 2 vCPU, 2 Go RAM, 40 Go SSD | Non recommande |
| **VPS Value** | 2 vCPU, 4 Go RAM, 80 Go SSD | Minimum |
| **VPS Essential** | 4 vCPU, 8 Go RAM, 160 Go SSD | Recommande |

**Options a selectionner :**
- **Localisation** : France (Gravelines ou Strasbourg) ou plus proche de vos utilisateurs
- **Systeme d'exploitation** : **Ubuntu 22.04 LTS** (ou 24.04 LTS)
- **Pas besoin** de cPanel ou Plesk

## 2.3 Apres la commande

OVHcloud enverra un email avec :
- **Adresse IP** du serveur (ex: `51.77.xxx.xxx`)
- **Mot de passe root** temporaire
- **Nom du VPS** (ex: `vps-xxxxxxxx.vps.ovh.net`)

> Conserver ces informations precieusement.

---

# Partie 3 : Se connecter au serveur (SSH)

## 3.1 Depuis Windows

**Option 1 : Terminal Windows (PowerShell ou Git Bash)**
```bash
ssh root@51.77.xxx.xxx
# Entrer le mot de passe recu par email
```

**Option 2 : VS Code (recommande pour les etudiants)**
1. Installer l'extension **Remote - SSH** dans VS Code
2. Appuyer sur `F1` > taper "Remote-SSH: Connect to Host"
3. Entrer : `root@51.77.xxx.xxx`
4. Entrer le mot de passe
5. VS Code s'ouvre directement sur le serveur

**Option 3 : PuTTY (classique)**
1. Telecharger PuTTY : https://www.putty.org
2. Host Name : `51.77.xxx.xxx`
3. Port : `22`
4. Cliquer sur **Open**
5. Login : `root`, puis le mot de passe

## 3.2 Depuis Mac/Linux

```bash
ssh root@51.77.xxx.xxx
```

## 3.3 Changer le mot de passe root immediatement

```bash
passwd
# Entrer le nouveau mot de passe (2 fois)
# Choisir un mot de passe FORT (min 16 caracteres, majuscules, minuscules, chiffres, symboles)
```

---

# Partie 4 : Securiser le serveur

> IMPORTANT : ne jamais sauter cette etape. Un serveur non securise sera pirate en quelques heures.

## 4.1 Mettre a jour le systeme

```bash
apt update && apt upgrade -y
```

## 4.2 Creer un utilisateur non-root

```bash
# Creer l'utilisateur
adduser deploy
# Entrer un mot de passe fort, les autres champs sont optionnels

# Lui donner les droits sudo
usermod -aG sudo deploy
```

## 4.3 Configurer la connexion SSH par cle (plus secure que mot de passe)

**Sur VOTRE ordinateur local (pas le serveur) :**

```bash
# Generer une cle SSH (si pas deja fait)
ssh-keygen -t ed25519 -C "deploiement-eventculture"
# Appuyer sur Entree 3 fois

# Copier la cle publique vers le serveur
ssh-copy-id deploy@51.77.xxx.xxx
# Entrer le mot de passe de l'utilisateur deploy

# Tester la connexion sans mot de passe
ssh deploy@51.77.xxx.xxx
```

> Si `ssh-copy-id` n'est pas disponible (Windows), faire manuellement :
> ```bash
> # Sur votre PC, afficher la cle publique :
> cat ~/.ssh/id_ed25519.pub
> # Copier le texte
>
> # Sur le SERVEUR, en tant que deploy :
> mkdir -p ~/.ssh
> echo "COLLER_LA_CLE_ICI" >> ~/.ssh/authorized_keys
> chmod 700 ~/.ssh
> chmod 600 ~/.ssh/authorized_keys
> ```

## 4.4 Desactiver la connexion root par SSH

```bash
# Sur le serveur, en tant que root :
nano /etc/ssh/sshd_config
```

Modifier ces lignes :
```
PermitRootLogin no
PasswordAuthentication no
```

Redemarrer SSH :
```bash
systemctl restart sshd
```

> ATTENTION : avant de fermer le terminal, ouvrir un NOUVEAU terminal et tester :
> ```bash
> ssh deploy@51.77.xxx.xxx
> ```
> Si ca fonctionne, vous pouvez fermer l'ancien terminal. Sinon, ne PAS fermer.

## 4.5 Configurer le pare-feu (UFW)

```bash
# En tant que deploy avec sudo :
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
# Taper "y" pour confirmer

# Verifier
sudo ufw status
```

Resultat attendu :
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

## 4.6 Installer Fail2Ban (protection anti brute-force)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

# Partie 5 : Installer les outils sur le serveur

> Toutes les commandes ci-dessous sont a executer sur le SERVEUR (via SSH).

## 5.1 Installer Node.js 20

```bash
# Ajouter le repo NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js
sudo apt install nodejs -y

# Verifier
node --version     # v20.x.x
npm --version      # 10.x.x
```

## 5.2 Installer MySQL 8

```bash
# Installer MySQL
sudo apt install mysql-server -y

# Securiser l'installation
sudo mysql_secure_installation
# Repondre :
# - Validate Password : Yes
# - Password Level : 1 (MEDIUM) ou 2 (STRONG)
# - Nouveau mot de passe root MySQL : MotDePasse_Complexe_2024!
# - Remove anonymous users : Yes
# - Disallow root login remotely : Yes
# - Remove test database : Yes
# - Reload privileges : Yes

# Verifier
sudo mysql --version
```

**Creer la base de donnees et l'utilisateur :**

```bash
sudo mysql
```

Dans MySQL :
```sql
-- Creer la base de donnees
CREATE DATABASE actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Creer un utilisateur dedie (NE PAS utiliser root en production !)
CREATE USER 'actionculture_user'@'localhost'
  IDENTIFIED BY 'MotDePasse_Prod_TresLong_2024!@#';

-- Donner les permissions
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER
  ON actionculture.* TO 'actionculture_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

## 5.3 Installer Redis

```bash
sudo apt install redis-server -y

# Configurer Redis pour systemd
sudo nano /etc/redis/redis.conf
# Trouver et modifier : supervised systemd

sudo systemctl restart redis
sudo systemctl enable redis

# Tester
redis-cli ping
# Reponse attendue : PONG
```

## 5.4 Installer Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Verifier
sudo nginx -t
# Reponse attendue : syntax is ok / test is successful
```

Tester dans le navigateur : `http://51.77.xxx.xxx` — la page par defaut de Nginx doit s'afficher.

## 5.5 Installer Git

```bash
sudo apt install git -y
git --version
```

## 5.6 Installer PM2 (gestionnaire de processus Node.js)

```bash
sudo npm install -g pm2

# Configurer le demarrage automatique
pm2 startup
# Executer la commande affichee (commencant par sudo env...)
```

## 5.7 (Optionnel) Installer Docker et Docker Compose

> Uniquement pour la Methode B.

```bash
# Supprimer les anciennes versions
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Ajouter le repo Docker officiel
sudo apt update
sudo apt install ca-certificates curl gnupg -y

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Ajouter l'utilisateur deploy au groupe docker
sudo usermod -aG docker deploy
# IMPORTANT : se deconnecter et reconnecter pour que ca prenne effet
exit
ssh deploy@51.77.xxx.xxx

# Verifier
docker --version
docker compose version
```

---

# Partie 6 : Configurer Git et cloner le projet

## 6.1 Configurer Git sur le serveur

```bash
git config --global user.name "Deploy EventCulture"
git config --global user.email "deploy@eventculture.dz"
```

## 6.2 Generer une cle SSH pour GitHub/GitLab

```bash
ssh-keygen -t ed25519 -C "deploy-ovh-eventculture"
# Appuyer sur Entree 3 fois

# Afficher la cle publique
cat ~/.ssh/id_ed25519.pub
# Copier tout le texte affiche
```

### Ajouter la cle sur GitHub :
1. GitHub > **Settings** > **SSH and GPG keys** > **New SSH key**
2. Title : `OVH VPS Deploy`
3. Coller la cle
4. **Add SSH key**

### Ajouter la cle sur GitLab :
1. GitLab > **Preferences** > **SSH Keys**
2. Coller la cle
3. Title : `OVH VPS Deploy`
4. **Add key**

## 6.3 Cloner le projet

```bash
# Creer le dossier du projet
sudo mkdir -p /home/EventCulture
sudo chown deploy:deploy /home/EventCulture

# Cloner depuis GitHub :
git clone git@github.com:VOTRE-ORG/EventCulture.git /home/EventCulture

# OU depuis GitLab :
git clone git@gitlab.com:VOTRE-ORG/EventCulture.git /home/EventCulture

cd /home/EventCulture
```

## 6.4 Choisir la branche

```bash
# Pour la production :
git checkout main

# Pour le staging/test :
git checkout develop
```

---

# Partie 7 : Methode A - Deploiement SANS Docker (PM2 + Nginx)

> Methode recommandee pour les debutants et les VPS avec 2 Go de RAM.

## 7.1 Configurer le Backend

```bash
cd /home/EventCulture/backend

# Copier et editer le fichier de configuration
cp .env.example .env
nano .env
```

**Remplir le `.env` de production :**

```env
# === ENVIRONNEMENT ===
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# === BASE DE DONNEES ===
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=MotDePasse_Prod_TresLong_2024!@#
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql

# === JWT ===
# Generer avec : node scripts/generateSecret.js
JWT_SECRET=COLLER_LE_SECRET_GENERE_ICI
JWT_EXPIRES_IN=24h

# === URLS (mettre votre domaine, HTTPS en production !) ===
API_URL=https://api.votredomaine.com
FRONTEND_URL=https://votredomaine.com
BASE_URL=https://api.votredomaine.com

# === REDIS ===
USE_REDIS_MEMORY=false
REDIS_HOST=localhost
REDIS_PORT=6379

# === EMAIL ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-application
EMAIL_FROM=noreply@votredomaine.com
EMAIL_PAUSED=false

# === SECURITE ===
BCRYPT_ROUNDS=12
```

**Installer les dependances et generer le secret JWT :**

```bash
# Installer les dependances de production
npm ci --production

# Generer un secret JWT
node scripts/generateSecret.js
# Copier le resultat dans .env -> JWT_SECRET=...

# Tester que le backend demarre
node server.js
# Si "Server running on port 3001" apparait, c'est bon
# Ctrl+C pour arreter
```

## 7.2 Peupler la base de donnees

```bash
cd /home/EventCulture/backend

# Seed des donnees geographiques (wilayas, communes)
node scripts/seed-geography.js

# Seed des donnees de reference (categories, types)
node scripts/seed-data-reference.js

# (Optionnel) Seed des donnees de test
node scripts/seed-all-data.js
```

## 7.3 Lancer le Backend avec PM2

```bash
cd /home/EventCulture/backend

# Demarrer avec PM2
pm2 start server.js --name "eventculture-api" -i max

# Verifier
pm2 status
# Doit afficher : eventculture-api │ online

# Sauvegarder pour redemarrage automatique
pm2 save

# Tester
curl http://localhost:3001/health
# Doit retourner un JSON avec status "healthy"
```

**Commandes PM2 utiles :**
```bash
pm2 status                       # Voir l'etat
pm2 logs eventculture-api        # Voir les logs
pm2 restart eventculture-api     # Redemarrer
pm2 stop eventculture-api        # Arreter
pm2 monit                        # Monitoring temps reel
```

## 7.4 Configurer le Frontend

```bash
cd /home/EventCulture/frontEnd

# Installer les dependances
npm ci

# Build de production
VITE_API_URL=https://api.votredomaine.com/api npm run build
# OU si le domaine n'est pas encore configure :
VITE_API_URL=http://51.77.xxx.xxx:3001/api npm run build
```

Le build genere un dossier `dist/` contenant les fichiers statiques.

```bash
# Copier les fichiers vers le dossier web de Nginx
sudo mkdir -p /var/www/eventculture
sudo cp -r dist/* /var/www/eventculture/
sudo chown -R www-data:www-data /var/www/eventculture
```

## 7.5 Configurer Nginx

### Configuration Frontend (site principal)

```bash
sudo nano /etc/nginx/sites-available/eventculture
```

Coller cette configuration :

```nginx
# ===================================================
# EventCulture - Frontend + API Reverse Proxy
# ===================================================

# Redirection HTTP -> HTTPS (activer apres installation SSL)
# server {
#     listen 80;
#     server_name votredomaine.com www.votredomaine.com api.votredomaine.com;
#     return 301 https://$server_name$request_uri;
# }

# Frontend - Site principal
server {
    listen 80;
    server_name votredomaine.com www.votredomaine.com;
    # Apres SSL, remplacer par :
    # listen 443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/votredomaine.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/votredomaine.com/privkey.pem;

    root /var/www/eventculture;
    index index.html;

    # Compression Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml
               image/svg+xml;

    # Headers de securite
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache des fichiers statiques (JS, CSS, images)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend - API
server {
    listen 80;
    server_name api.votredomaine.com;
    # Apres SSL, remplacer par :
    # listen 443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/votredomaine.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/votredomaine.com/privkey.pem;

    # Limite taille uploads (100 Mo)
    client_max_body_size 100M;

    # Headers de securite
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy vers le backend Node.js
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Fichiers uploades
    location /uploads {
        alias /home/EventCulture/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Activer le site :**

```bash
# Creer le lien symbolique
sudo ln -s /etc/nginx/sites-available/eventculture /etc/nginx/sites-enabled/

# Supprimer le site par defaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t
# Doit afficher : syntax is ok / test is successful

# Recharger Nginx
sudo systemctl reload nginx
```

**Tester :**
- Ouvrir `http://51.77.xxx.xxx` dans le navigateur — le frontend doit s'afficher
- Tester `http://51.77.xxx.xxx:3001/health` — l'API doit repondre

---

# Partie 8 : Methode B - Deploiement AVEC Docker

> Pour les VPS avec 4 Go+ de RAM. Docker doit etre installe (voir 5.7).

## 8.1 Configurer les variables d'environnement

```bash
cd /home/EventCulture

# Copier et editer le fichier de configuration
cp .env.example .env
nano .env
```

Remplir le `.env` a la racine :

```env
# === MYSQL ===
MYSQL_ROOT_PASSWORD=MotDePasse_Root_MySQL_TresLong_2024!
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=MotDePasse_User_MySQL_TresLong_2024!@#

# === JWT ===
JWT_SECRET=generer_avec_node_scripts_generateSecret_js_minimum_64_chars

# === URLS ===
VITE_API_URL=https://api.votredomaine.com/api
FRONTEND_URL=https://votredomaine.com
```

## 8.2 Lancer avec Docker Compose

```bash
cd /home/EventCulture

# Construire et lancer tous les services
docker compose up -d --build

# Suivre la progression
docker compose logs -f
# Attendre que tous les services soient "healthy" (1-2 minutes)
# Ctrl+C pour quitter les logs
```

## 8.3 Verifier que tout fonctionne

```bash
docker compose ps
```

Resultat attendu :
```
NAME                     STATUS              PORTS
eventculture-backend     Up (healthy)        0.0.0.0:3001->3001/tcp
eventculture-frontend    Up (healthy)        0.0.0.0:3000->80/tcp
eventculture-mysql       Up (healthy)        0.0.0.0:3306->3306/tcp
eventculture-redis       Up (healthy)        0.0.0.0:6379->6379/tcp
```

## 8.4 Peupler la base de donnees

```bash
# Executer les scripts de seed dans le conteneur backend
docker compose exec backend node scripts/seed-geography.js
docker compose exec backend node scripts/seed-data-reference.js
docker compose exec backend node scripts/seed-all-data.js
```

## 8.5 Configurer Nginx en tant que Reverse Proxy devant Docker

Meme si Docker fait tourner Nginx pour le frontend, il est recommande d'avoir un Nginx "host" pour gerer le SSL.

```bash
sudo nano /etc/nginx/sites-available/eventculture
```

```nginx
# Frontend (Docker ecoute sur le port 3000)
server {
    listen 80;
    server_name votredomaine.com www.votredomaine.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API (Docker ecoute sur le port 3001)
server {
    listen 80;
    server_name api.votredomaine.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/eventculture /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 8.6 Commandes Docker utiles en production

```bash
# Voir les logs
docker compose logs -f backend          # Logs backend
docker compose logs -f mysql            # Logs MySQL

# Redemarrer un service
docker compose restart backend

# Reconstruire apres un git pull
docker compose up -d --build

# Arreter tout
docker compose down

# Arreter tout ET supprimer les donnees
docker compose down -v                  # ATTENTION : supprime la DB !

# Entrer dans un conteneur
docker compose exec backend sh          # Terminal dans le backend
docker compose exec mysql mysql -u root -p   # Terminal MySQL

# Voir l'espace disque utilise par Docker
docker system df
```

---

# Partie 9 : Configurer un nom de domaine

## 9.1 Acheter un nom de domaine

**Chez OVHcloud :**
1. https://www.ovhcloud.com/fr/domains/
2. Chercher votre domaine (ex: `eventculture.dz`, `eventculture.com`)
3. Commander

**Ou chez un autre registrar** : Namecheap, Google Domains, Gandi, etc.

## 9.2 Configurer les enregistrements DNS

Dans l'interface OVHcloud (ou votre registrar) > **Zone DNS** :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | `@` (ou `votredomaine.com`) | `51.77.xxx.xxx` | 3600 |
| A | `www` | `51.77.xxx.xxx` | 3600 |
| A | `api` | `51.77.xxx.xxx` | 3600 |

> Remplacer `51.77.xxx.xxx` par l'IP reelle de votre VPS.

## 9.3 Verifier la propagation DNS

```bash
# Sur votre PC local :
ping votredomaine.com
# Doit afficher l'IP de votre VPS

# OU utiliser un outil en ligne :
# https://www.whatsmydns.net/
```

> La propagation DNS peut prendre de 5 minutes a 48 heures.

## 9.4 Mettre a jour la configuration Nginx

Remplacer `votredomaine.com` par votre vrai domaine dans le fichier Nginx :

```bash
sudo nano /etc/nginx/sites-available/eventculture
# Remplacer votredomaine.com par votre domaine
sudo nginx -t
sudo systemctl reload nginx
```

## 9.5 Mettre a jour les URLs dans le projet

**Backend `.env` :**
```env
API_URL=https://api.votredomaine.com
FRONTEND_URL=https://votredomaine.com
BASE_URL=https://api.votredomaine.com
```

**Reconstruire le frontend avec la bonne URL :**
```bash
# Methode A (sans Docker) :
cd /home/EventCulture/frontEnd
VITE_API_URL=https://api.votredomaine.com/api npm run build
sudo cp -r dist/* /var/www/eventculture/

# Methode B (Docker) :
cd /home/EventCulture
# Mettre a jour VITE_API_URL dans .env
docker compose up -d --build frontend
```

---

# Partie 10 : HTTPS avec Let's Encrypt

> HTTPS est **obligatoire** en production (securite, SEO, confiance utilisateurs).

## 10.1 Installer Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

## 10.2 Obtenir le certificat SSL

```bash
# Pour le domaine principal + API :
sudo certbot --nginx -d votredomaine.com -d www.votredomaine.com -d api.votredomaine.com
```

Certbot va demander :
1. **Email** : votre email (pour les alertes d'expiration)
2. **Conditions** : accepter (A)
3. **Partage email** : Non (N)

Certbot modifie automatiquement la configuration Nginx pour ajouter le SSL.

## 10.3 Verifier

```bash
# Tester HTTPS
curl -I https://votredomaine.com
# Doit retourner HTTP/2 200

curl -I https://api.votredomaine.com/health
# Doit retourner HTTP/2 200
```

## 10.4 Renouvellement automatique

Le certificat expire tous les 90 jours. Certbot installe automatiquement un timer de renouvellement.

```bash
# Verifier que le timer est actif
sudo systemctl status certbot.timer

# Tester le renouvellement (sans vraiment renouveler)
sudo certbot renew --dry-run
```

---

# Partie 11 : CI/CD avec GitHub Actions

Le CI/CD (Continuous Integration / Continuous Deployment) permet de deployer automatiquement quand on pousse du code.

## 11.1 Schema du pipeline

```
┌──────────┐      ┌─────────┐      ┌──────────┐      ┌──────────────┐
│ git push │ ──>  │ GitHub  │ ──>  │ Actions  │ ──>  │ Serveur OVH  │
│ (local)  │      │  repo   │      │ (CI/CD)  │      │ (deploiement)│
└──────────┘      └─────────┘      └──────────┘      └──────────────┘
                                        │
                                   Tests + Lint
                                   Build frontend
                                   Deploy via SSH
```

## 11.2 Le fichier de pipeline existe deja

Le projet contient deja un pipeline CI/CD dans `.github/workflows/deploy.yml`.

**Ce qu'il fait :**
1. **Sur chaque push** (main et develop) : execute les tests, le lint, la verification TypeScript
2. **Si push sur `main`** : deploie automatiquement en production sur le VPS
3. **Si push sur `develop`** : deploie en staging

## 11.3 Configurer les secrets GitHub

Sur GitHub > votre repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret** :

| Secret | Valeur | Description |
|--------|--------|-------------|
| `SSH_PRIVATE_KEY_B64` | `(voir ci-dessous)` | Cle SSH privee encodee en base64 |

**Generer le secret SSH :**

```bash
# Sur votre PC local :
# 1. Generer une cle dediee au deploiement
ssh-keygen -t ed25519 -f ~/.ssh/deploy_eventculture -C "github-actions-deploy"

# 2. Copier la cle publique sur le serveur
ssh-copy-id -i ~/.ssh/deploy_eventculture.pub deploy@51.77.xxx.xxx

# 3. Encoder la cle privee en base64
cat ~/.ssh/deploy_eventculture | base64 -w 0
# Copier TOUT le texte affiche

# 4. Coller comme secret GitHub : SSH_PRIVATE_KEY_B64
```

## 11.4 Tester le deploiement automatique

```bash
# Sur votre PC local :
git checkout main
git merge develop
git push origin main
# Le deploiement se lance automatiquement !
```

**Suivre l'execution :**
GitHub > votre repo > **Actions** > cliquer sur le dernier workflow

---

# Partie 12 : CI/CD avec GitLab CI

Si votre projet est sur GitLab au lieu de GitHub.

## 12.1 Creer le fichier `.gitlab-ci.yml`

Creer ce fichier a la racine du projet :

```yaml
# ============================================
# GitLab CI/CD - EventCulture
# ============================================

stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

# ============================================
# Stage: Tests
# ============================================
test-backend:
  stage: test
  image: node:20-alpine
  script:
    - cd backend
    - npm ci
    - npm run lint || echo "Linting issues detected"
    - npm test -- --passWithNoTests
  only:
    - main
    - develop
    - merge_requests

test-frontend:
  stage: test
  image: node:20-alpine
  script:
    - cd frontEnd
    - npm ci
    - npm run lint || echo "Linting issues detected"
    - npm run build
  only:
    - main
    - develop
    - merge_requests

# ============================================
# Stage: Deploy Production (branche main)
# ============================================
deploy-production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - mkdir -p ~/.ssh
    - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan -H $SERVER_IP >> ~/.ssh/known_hosts
  script:
    - |
      ssh deploy@$SERVER_IP << 'EOF'
        cd /home/EventCulture
        git pull origin main

        cd backend
        npm ci --production

        cd ../frontEnd
        npm ci
        npm run build
        sudo cp -r dist/* /var/www/eventculture/

        pm2 restart eventculture-api
        echo "Deploiement termine !"
      EOF
  only:
    - main
  when: manual  # Deploiement manuel (cliquer pour lancer)

# ============================================
# Stage: Deploy Staging (branche develop)
# ============================================
deploy-staging:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - mkdir -p ~/.ssh
    - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan -H $SERVER_IP >> ~/.ssh/known_hosts
  script:
    - |
      ssh deploy@$SERVER_IP << 'EOF'
        cd /home/EventCulture
        git pull origin develop
        cd backend && npm ci
        cd ../frontEnd && npm ci && npm run build
        pm2 restart eventculture-api
      EOF
  only:
    - develop
```

## 12.2 Configurer les variables GitLab

GitLab > votre projet > **Settings** > **CI/CD** > **Variables** :

| Variable | Valeur | Protected | Masked |
|----------|--------|-----------|--------|
| `SSH_PRIVATE_KEY` | Contenu de `~/.ssh/deploy_eventculture` | Oui | Oui |
| `SERVER_IP` | `51.77.xxx.xxx` | Oui | Non |

## 12.3 Mirroring GitHub <-> GitLab (optionnel)

Si vous voulez avoir le code sur les deux plateformes :

**GitLab > votre projet > Settings > Repository > Mirroring repositories :**
- Git repository URL : `https://github.com/VOTRE-ORG/EventCulture.git`
- Mirror direction : **Push** (GitLab -> GitHub) ou **Pull** (GitHub -> GitLab)
- Authentication : Token GitHub

---

# Partie 13 : Maintenance et monitoring

## 13.1 Commandes de maintenance quotidienne

```bash
# Se connecter au serveur
ssh deploy@51.77.xxx.xxx

# Verifier l'etat des services
pm2 status                              # Backend Node.js
sudo systemctl status nginx             # Nginx
sudo systemctl status mysql             # MySQL
sudo systemctl status redis             # Redis

# Verifier l'espace disque
df -h

# Verifier la memoire
free -h

# Verifier les logs d'erreur
pm2 logs eventculture-api --lines 50    # Derniers 50 logs
sudo tail -50 /var/log/nginx/error.log  # Erreurs Nginx
```

## 13.2 Mettre a jour le projet manuellement

```bash
cd /home/EventCulture

# Recuperer les derniers changements
git pull origin main

# Mettre a jour le backend
cd backend
npm ci --production
pm2 restart eventculture-api

# Mettre a jour le frontend
cd ../frontEnd
npm ci
VITE_API_URL=https://api.votredomaine.com/api npm run build
sudo cp -r dist/* /var/www/eventculture/

# Recharger Nginx (si config modifiee)
sudo nginx -t && sudo systemctl reload nginx
```

## 13.3 Mettre a jour le serveur

```bash
# Mises a jour de securite (faire regulierement)
sudo apt update && sudo apt upgrade -y

# Redemarrer si necessaire (noyau mis a jour)
sudo reboot
# Attendre 30 secondes puis se reconnecter
```

## 13.4 Monitoring avec PM2

```bash
# Monitoring temps reel (CPU, RAM, requetes)
pm2 monit

# Dashboard web PM2 (optionnel, service payant)
pm2 plus
```

## 13.5 Monitoring simple avec cron

Creer un script de verification :

```bash
nano /home/deploy/check-health.sh
```

```bash
#!/bin/bash
# Script de verification de sante

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)

if [ "$HEALTH" != "200" ]; then
    echo "$(date) - ALERTE : Backend down (code $HEALTH)" >> /home/deploy/monitoring.log
    pm2 restart eventculture-api
    echo "$(date) - Backend redemarre" >> /home/deploy/monitoring.log
fi
```

```bash
chmod +x /home/deploy/check-health.sh

# Executer toutes les 5 minutes
crontab -e
# Ajouter cette ligne :
*/5 * * * * /home/deploy/check-health.sh
```

---

# Partie 14 : Sauvegardes automatiques

## 14.1 Script de sauvegarde MySQL

```bash
sudo nano /home/deploy/backup-db.sh
```

```bash
#!/bin/bash
# Sauvegarde automatique de la base de donnees

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="/home/deploy/backups"
DB_NAME="actionculture"
DB_USER="actionculture_user"
DB_PASS="MotDePasse_Prod_TresLong_2024!@#"

# Creer le dossier de sauvegarde
mkdir -p $BACKUP_DIR

# Sauvegarder
mysqldump -u $DB_USER -p"$DB_PASS" $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Compresser
gzip $BACKUP_DIR/db_$DATE.sql

# Supprimer les sauvegardes de plus de 30 jours
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "$(date) - Sauvegarde effectuee : db_$DATE.sql.gz" >> $BACKUP_DIR/backup.log
```

```bash
chmod +x /home/deploy/backup-db.sh

# Sauvegarder tous les jours a 3h du matin
crontab -e
# Ajouter :
0 3 * * * /home/deploy/backup-db.sh
```

## 14.2 Restaurer une sauvegarde

```bash
# Decompresser
gunzip /home/deploy/backups/db_2024-01-15_03-00.sql.gz

# Restaurer
mysql -u actionculture_user -p actionculture < /home/deploy/backups/db_2024-01-15_03-00.sql
```

## 14.3 Sauvegarder les uploads

```bash
# Ajouter au script backup ou en cron separe :
tar -czf /home/deploy/backups/uploads_$(date +%Y-%m-%d).tar.gz /home/EventCulture/backend/uploads/
```

---

# Partie 15 : Problemes courants et solutions

## Serveur

| Probleme | Diagnostic | Solution |
|----------|-----------|----------|
| Impossible de se connecter en SSH | `ssh -v deploy@IP` | Verifier que le port 22 est ouvert dans UFW |
| Serveur lent | `htop` ou `free -h` | Augmenter la RAM du VPS / optimiser le code |
| Disque plein | `df -h` | Nettoyer les logs : `pm2 flush`, Docker : `docker system prune` |
| Serveur inaccessible | Reboot via interface OVHcloud | Console KVM dans l'espace client OVH |

## Nginx

| Probleme | Diagnostic | Solution |
|----------|-----------|----------|
| Erreur 502 Bad Gateway | `pm2 status` | Le backend est arrete, le redemarrer |
| Erreur 504 Gateway Timeout | `pm2 logs` | Le backend est trop lent, optimiser ou augmenter les timeouts |
| Erreur 413 Request Entity Too Large | Fichier trop gros | Augmenter `client_max_body_size` dans Nginx |
| Site non accessible | `sudo nginx -t` | Erreur de syntaxe dans la config Nginx |

## Backend / Node.js

| Probleme | Diagnostic | Solution |
|----------|-----------|----------|
| `ECONNREFUSED 3306` | MySQL arrete | `sudo systemctl start mysql` |
| `ER_ACCESS_DENIED` | Mauvais credentials | Verifier DB_USER/DB_PASSWORD dans `.env` |
| Port 3001 deja utilise | `sudo lsof -i :3001` | Tuer le processus ou changer le port |
| Memoire insuffisante | `pm2 monit` | Ajouter `--max-memory-restart 500M` |

## Docker

| Probleme | Diagnostic | Solution |
|----------|-----------|----------|
| Conteneur qui redemarre en boucle | `docker compose logs <service>` | Lire l'erreur dans les logs |
| Port deja utilise | `sudo lsof -i :<port>` | Arreter le service local qui occupe le port |
| Pas assez de memoire | `docker stats` | Augmenter la RAM du VPS |
| Build qui echoue | `docker compose build --no-cache` | Reconstruire sans cache |

## SSL / HTTPS

| Probleme | Diagnostic | Solution |
|----------|-----------|----------|
| Certificat expire | `sudo certbot renew` | Verifier le timer : `sudo systemctl status certbot.timer` |
| Mixed content (HTTP dans HTTPS) | Console navigateur (F12) | Mettre a jour toutes les URLs en HTTPS |
| Certbot echoue | `sudo certbot certificates` | Verifier que le DNS pointe vers le VPS |

## Git / Deploiement

| Probleme | Diagnostic | Solution |
|----------|-----------|----------|
| `Permission denied (publickey)` | `ssh -T git@github.com` | Ajouter la cle SSH du serveur sur GitHub/GitLab |
| Conflit lors du `git pull` | `git status` | `git stash` puis `git pull` puis `git stash pop` |
| Pipeline CI/CD echoue | Voir les logs sur GitHub Actions / GitLab CI | Verifier les secrets et les permissions SSH |

---

# Resume : Checklist de deploiement

## Avant le deploiement
- [ ] VPS OVHcloud commande (Ubuntu 22.04)
- [ ] Se connecter en SSH
- [ ] Changer le mot de passe root
- [ ] Creer l'utilisateur `deploy`
- [ ] Configurer la cle SSH
- [ ] Desactiver la connexion root SSH
- [ ] Configurer le pare-feu (UFW)
- [ ] Installer Fail2Ban

## Installation des outils
- [ ] Node.js 20
- [ ] MySQL 8
- [ ] Redis
- [ ] Nginx
- [ ] Git
- [ ] PM2 (ou Docker)

## Configuration du projet
- [ ] Cloner le repository
- [ ] Configurer le `.env` backend
- [ ] Generer le JWT_SECRET
- [ ] Creer la base de donnees MySQL
- [ ] Creer l'utilisateur MySQL dedie
- [ ] Peupler la base (seed)

## Deploiement
- [ ] Backend lance avec PM2 (ou Docker)
- [ ] Frontend builde et copie dans `/var/www/`
- [ ] Nginx configure et fonctionne
- [ ] Site accessible via l'IP du VPS

## Nom de domaine et HTTPS
- [ ] DNS configure (A records)
- [ ] DNS propage (tester avec ping)
- [ ] Certificat SSL obtenu (Let's Encrypt)
- [ ] HTTPS fonctionne
- [ ] Redirection HTTP -> HTTPS

## CI/CD
- [ ] Pipeline GitHub Actions ou GitLab CI configure
- [ ] Secret SSH ajoute
- [ ] Deploiement automatique fonctionne

## Securite et maintenance
- [ ] Sauvegarde automatique de la DB
- [ ] Monitoring de sante (cron)
- [ ] Mises a jour systeme planifiees

---

# Glossaire

| Terme | Definition |
|-------|-----------|
| **CI/CD** | Integration Continue / Deploiement Continu - automatisation des tests et du deploiement |
| **Certbot** | Outil pour obtenir des certificats SSL gratuits (Let's Encrypt) |
| **DNS** | Systeme qui traduit un nom de domaine en adresse IP |
| **Fail2Ban** | Outil qui bloque les IP qui tentent trop de connexions echouees |
| **Let's Encrypt** | Autorite de certification SSL gratuite |
| **Nginx** | Serveur web qui sert les fichiers statiques et fait reverse proxy |
| **PM2** | Gestionnaire de processus Node.js (redemarrage auto, logs, monitoring) |
| **Reverse Proxy** | Serveur intermediaire qui redirige les requetes vers le bon service |
| **SSH** | Protocole securise pour se connecter a distance a un serveur |
| **SSL/TLS** | Protocole de securite pour chiffrer les communications (HTTPS) |
| **UFW** | Pare-feu simplifie pour Ubuntu |
| **VPS** | Serveur Prive Virtuel - un serveur dedie dans le cloud |
| **Staging** | Environnement de test qui reproduit la production |
| **Seed** | Script qui remplit la base de donnees avec des donnees initiales |
| **Healthcheck** | Verification automatique qu'un service fonctionne correctement |
| **Pipeline** | Enchainement automatique d'etapes (tests, build, deploiement) |
