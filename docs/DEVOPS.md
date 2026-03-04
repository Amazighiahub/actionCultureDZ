# Guide DevOps - EventCulture

Deploiement securise sur VPS OVHcloud avec Docker, Nginx, SSL et CI/CD.

---

## Architecture

```
┌─────────────────── VPS OVHcloud (Ubuntu 22.04) ───────────────────┐
│                                                                    │
│  UFW Firewall (ports 22, 80, 443 uniquement)                      │
│  Fail2Ban (anti brute-force)                                      │
│                                                                    │
│  ┌──────────────── Docker Compose ────────────────┐                │
│  │                                                 │                │
│  │  ┌─────────────────────────────────────────┐    │                │
│  │  │           NGINX (port 80/443)           │    │                │
│  │  │  - SSL/TLS (Let's Encrypt)              │    │                │
│  │  │  - Rate limiting                        │    │                │
│  │  │  - Security headers                     │    │                │
│  │  │  - Gzip compression                     │    │                │
│  │  └──────────┬──────────────┬───────────────┘    │                │
│  │             │              │                     │                │
│  │             v              v                     │                │
│  │  ┌──────────────┐ ┌──────────────┐              │                │
│  │  │   Frontend   │ │   Backend    │              │                │
│  │  │ React+Nginx  │ │  Node.js     │              │                │
│  │  │ (interne:80) │ │ (interne:3001│              │                │
│  │  └──────────────┘ └──────┬───────┘              │                │
│  │                          │                       │                │
│  │                   ┌──────┴───────┐               │                │
│  │                   │              │               │                │
│  │                   v              v               │                │
│  │            ┌──────────┐  ┌──────────┐            │                │
│  │            │  MySQL   │  │  Redis   │            │                │
│  │            │ (interne)│  │ (interne)│            │                │
│  │            └──────────┘  └──────────┘            │                │
│  │                                                   │                │
│  │  Certbot (renouvellement SSL auto)                │                │
│  └───────────────────────────────────────────────────┘                │
│                                                                       │
│  Cron : sauvegarde DB tous les jours a 3h                             │
└───────────────────────────────────────────────────────────────────────┘
```

**Points de securite :**
- MySQL et Redis ne sont PAS exposes sur internet (expose, pas ports)
- Nginx est le seul point d'entree (reverse proxy)
- SSL/TLS 1.2+ avec headers HSTS
- Rate limiting sur l'API (10 req/s) et le login (3 req/s)
- Utilisateur non-root dans les conteneurs Docker
- Pare-feu UFW + Fail2Ban sur le serveur

---

## Fichiers DevOps du projet

```
EventCulture/
├── docker-compose.yml           # Dev local
├── docker-compose.prod.yml      # Production (securise)
├── .env.example                 # Template variables
│
├── nginx/
│   ├── initial.conf             # Config HTTP (avant SSL)
│   └── prod.conf                # Config HTTPS (avec SSL)
│
├── scripts/
│   ├── setup-server.sh          # Configuration initiale du VPS
│   └── deploy.sh                # Script de deploiement
│
├── .github/workflows/
│   └── deploy.yml               # CI/CD GitHub Actions
│
├── .gitlab-ci.yml               # CI/CD GitLab CI
│
├── backend/
│   └── Dockerfile               # Image Docker backend
│
└── frontEnd/
    ├── Dockerfile               # Image Docker frontend
    └── nginx.conf               # Nginx interne frontend
```

---

## Deployer en 5 etapes

### Etape 1 : Commander un VPS OVHcloud

1. https://www.ovhcloud.com/fr/vps/
2. Choisir **VPS Value** (4 Go RAM, 80 Go SSD) minimum
3. Systeme : **Ubuntu 22.04**
4. Noter l'IP et le mot de passe root recus par email

### Etape 2 : Configurer le serveur

```bash
# Depuis votre PC : copier votre cle SSH sur le serveur
ssh-copy-id root@IP_DU_VPS

# Lancer le script de configuration automatique
ssh root@IP_DU_VPS 'bash -s' < scripts/setup-server.sh
```

Ce script fait automatiquement :
- Mise a jour du systeme
- Creation de l'utilisateur `deploy` (non-root)
- Securisation SSH (desactivation root, cle obligatoire)
- Pare-feu UFW (ports 22, 80, 443)
- Fail2Ban (anti brute-force)
- Installation de Docker + Git
- Cron de sauvegarde DB quotidien

```bash
# Ajouter votre cle SSH pour l'utilisateur deploy
ssh-copy-id deploy@IP_DU_VPS

# Se connecter (root ne fonctionne plus)
ssh deploy@IP_DU_VPS
```

### Etape 3 : Cloner et configurer

```bash
# Sur le serveur, en tant que deploy :

# Generer une cle SSH pour GitHub/GitLab
ssh-keygen -t ed25519 -C "deploy-ovh"
cat ~/.ssh/id_ed25519.pub
# -> Copier et ajouter sur GitHub (Settings > SSH Keys)
#    ou GitLab (Preferences > SSH Keys)

# Cloner le projet
git clone git@github.com:VOTRE-ORG/EventCulture.git /home/EventCulture
cd /home/EventCulture

# Configurer les variables d'environnement
cp .env.example .env
nano .env
```

**Remplir le `.env` :**
```env
# MySQL
MYSQL_ROOT_PASSWORD=MotDePasse_Root_TresLong_2024!@#
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=MotDePasse_User_TresLong_2024!@#

# JWT (generer avec : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=COLLER_LE_RESULTAT_ICI

# URLs (remplacer par votre domaine)
FRONTEND_URL=https://votredomaine.com
API_URL=https://api.votredomaine.com
VITE_API_URL=https://api.votredomaine.com/api

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-app-password
EMAIL_FROM=noreply@votredomaine.com
EMAIL_PAUSED=false
```

### Etape 4 : Deployer

```bash
# Rendre le script executable
chmod +x scripts/deploy.sh scripts/setup-server.sh

# Premier deploiement
./scripts/deploy.sh --init

# Peupler la base de donnees
./scripts/deploy.sh --seed
```

Tester : `http://IP_DU_VPS` doit afficher le site.

### Etape 5 : Domaine + SSL

```bash
# 1. Configurer le DNS chez votre registrar :
#    A    @     -> IP_DU_VPS
#    A    www   -> IP_DU_VPS
#    A    api   -> IP_DU_VPS

# 2. Attendre la propagation DNS (5 min a 48h)
ping votredomaine.com  # doit retourner l'IP du VPS

# 3. Installer le certificat SSL
./scripts/deploy.sh --ssl votredomaine.com
```

Tester : `https://votredomaine.com` et `https://api.votredomaine.com/health`

---

## CI/CD : deploiement automatique

### Avec GitHub Actions

Le pipeline `.github/workflows/deploy.yml` :
1. **A chaque push** (main/develop) : lance les tests et le build
2. **Push sur `main`** : sauvegarde la DB puis deploie en production
3. **Push sur `develop`** : deploie en staging

**Configurer les secrets GitHub :**

GitHub > Settings > Secrets and variables > Actions :

| Secret | Valeur |
|--------|--------|
| `SSH_PRIVATE_KEY_B64` | Cle SSH encodee base64 (voir ci-dessous) |
| `SERVER_IP` | IP du VPS |
| `SERVER_USER` | `deploy` |

```bash
# Generer et encoder la cle SSH :
ssh-keygen -t ed25519 -f ~/.ssh/deploy_ci -C "ci-deploy"
ssh-copy-id -i ~/.ssh/deploy_ci.pub deploy@IP_DU_VPS
cat ~/.ssh/deploy_ci | base64 -w 0
# -> Copier comme secret SSH_PRIVATE_KEY_B64
```

**Tester :**
```bash
git checkout main && git merge develop && git push
# -> GitHub Actions deploie automatiquement
```

### Avec GitLab CI

Le pipeline `.gitlab-ci.yml` fait la meme chose.

**Configurer les variables GitLab :**

GitLab > Settings > CI/CD > Variables :

| Variable | Type | Protected | Masked |
|----------|------|-----------|--------|
| `SSH_PRIVATE_KEY` | File | Oui | Oui |
| `SERVER_IP` | Variable | Oui | Non |
| `SERVER_USER` | Variable | Oui | Non |
| `DOMAIN` | Variable | Oui | Non |

---

## Commandes du script deploy.sh

| Commande | Action |
|----------|--------|
| `./scripts/deploy.sh --init` | Premier deploiement (build + lancement) |
| `./scripts/deploy.sh` | Mise a jour (git pull + rebuild + restart) |
| `./scripts/deploy.sh --ssl domaine.com` | Installer le certificat SSL |
| `./scripts/deploy.sh --seed` | Peupler la base de donnees |
| `./scripts/deploy.sh --backup` | Sauvegarder la base de donnees |
| `./scripts/deploy.sh --status` | Verifier l'etat des services |
| `./scripts/deploy.sh --logs` | Voir tous les logs |
| `./scripts/deploy.sh --logs backend` | Voir les logs du backend |
| `./scripts/deploy.sh --down` | Arreter tous les services |

---

## Workflow de deploiement

```
Developpeur                   GitHub/GitLab               VPS OVH
    │                              │                         │
    │  git push develop            │                         │
    │─────────────────────────────>│                         │
    │                              │  Tests + Lint + Build   │
    │                              │─────────┐               │
    │                              │<────────┘               │
    │                              │                         │
    │                              │  Si tests OK :          │
    │                              │  SSH -> deploy.sh       │
    │                              │────────────────────────>│
    │                              │                         │  git pull
    │                              │                         │  docker build
    │                              │                         │  docker restart
    │                              │      Health check OK    │
    │                              │<────────────────────────│
    │                              │                         │
    │  git checkout main           │                         │
    │  git merge develop           │                         │
    │  git push main               │                         │
    │─────────────────────────────>│                         │
    │                              │  Tests + Backup DB      │
    │                              │  SSH -> deploy.sh       │
    │                              │────────────────────────>│
    │                              │                         │  Production !
```

---

## Securite : ce qui est en place

### Serveur (setup-server.sh)
- Utilisateur `deploy` non-root
- SSH par cle uniquement (mot de passe desactive)
- Connexion root SSH desactivee
- Pare-feu UFW (22, 80, 443 uniquement)
- Fail2Ban (blocage apres 3 tentatives)

### Docker (docker-compose.prod.yml)
- MySQL et Redis non exposes sur internet (`expose` au lieu de `ports`)
- Limites de memoire par conteneur
- Utilisateur non-root dans le conteneur backend
- Volumes pour les donnees persistantes

### Nginx (nginx/prod.conf)
- HTTPS obligatoire (redirection HTTP -> HTTPS)
- TLS 1.2+ uniquement
- Headers de securite (HSTS, X-Frame-Options, CSP, etc.)
- Rate limiting (10 req/s API, 3 req/s login)
- Blocage des fichiers sensibles (`.env`, `.git`)
- Blocage des scripts dans les uploads

### CI/CD
- Secrets stockes dans GitHub/GitLab (jamais dans le code)
- IP du serveur dans les secrets (pas en dur)
- Permissions minimales (`contents: read`)
- Sauvegarde DB automatique avant chaque deploiement
- Health check apres deploiement

### Sauvegardes
- Cron quotidien a 3h du matin
- Retention de 30 jours
- Compression gzip

---

## Problemes courants

| Probleme | Solution |
|----------|----------|
| `docker: permission denied` | Se deconnecter/reconnecter (`exit` puis `ssh deploy@...`) |
| SSL echoue | Verifier que le DNS pointe vers le VPS : `dig votredomaine.com` |
| Backend `unhealthy` | `./scripts/deploy.sh --logs backend` |
| MySQL `unhealthy` | Attendre 30s au premier lancement, verifier `.env` |
| Port 80/443 deja utilise | `sudo lsof -i :80` et arreter le service |
| Pipeline CI/CD echoue | Verifier les secrets dans GitHub/GitLab Settings |
| `Permission denied (publickey)` | Ajouter la cle SSH du CI sur le serveur |
| Disque plein | `docker system prune -a` pour nettoyer les images |
