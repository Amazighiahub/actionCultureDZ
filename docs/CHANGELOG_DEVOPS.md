# Changelog DevOps - EventCulture

Resume de toutes les modifications DevOps et securite appliquees, et les etapes suivantes pour deployer.

---

## Fichiers crees

| Fichier | Description |
|---------|-------------|
| `docker-compose.prod.yml` | Docker Compose production securise (MySQL/Redis non exposes, limites memoire, Certbot SSL) |
| `nginx/initial.conf` | Config Nginx temporaire HTTP (avant obtention du certificat SSL) |
| `nginx/prod.conf` | Config Nginx production HTTPS (rate limiting, headers securite, TLS 1.2+) |
| `scripts/deploy.sh` | Script de deploiement unifie (init, update, ssl, backup, logs, status) |
| `scripts/setup-server.sh` | Script de configuration initiale du VPS (user deploy, UFW, Fail2Ban, Docker) |
| `.gitlab-ci.yml` | Pipeline CI/CD GitLab (test, build, deploy staging/production) |
| `backend/.dockerignore` | Exclut .env, node_modules, tests, logs des images Docker |
| `frontEnd/.dockerignore` | Exclut .env, node_modules, dist, tests des images Docker |
| `docs/GUIDE_DEPLOIEMENT_OVH.md` | Guide complet deploiement OVHcloud (15 parties) |
| `docs/GUIDE_STAGIAIRE_COMPLET.md` | Guide complet pour stagiaires (Git, Docker, Nginx) |
| `docs/DEVOPS.md` | Guide DevOps synthetique (deploiement en 5 etapes) |

## Fichiers modifies

### `docker-compose.yml`
- Ajoute avertissement : fichier pour DEVELOPPEMENT uniquement
- Supprime `version: '3.8'` (obsolete)
- MySQL : `ports: "3306:3306"` -> `"127.0.0.1:3306:3306"` (localhost uniquement)
- Redis : `ports: "6379:6379"` -> `"127.0.0.1:6379:6379"` (localhost uniquement)
- MySQL : ajout fallback `:-root` pour dev sans .env

### `backend/Dockerfile`
- Supprime le stage `builder` (tests) inutile en production
- `--only=production` -> `--omit=dev` (syntaxe npm moderne)
- Ajout `RUN rm -rf` pour supprimer .env, tests, scripts/archives de l'image finale
- `start-period` augmente de 5s a 15s (laisse le temps a MySQL de demarrer)
- Ajout de commentaires explicatifs pour les stagiaires

### `frontEnd/Dockerfile`
- Ajout de commentaires explicatifs

### `frontEnd/nginx.conf`
- Ajout `server_tokens off` (masque la version Nginx)
- Ajout header `Permissions-Policy` (bloque camera/micro)
- Ajout `location ~ /\.` (bloque acces aux fichiers .env, .git)
- Ajout `access_log off` sur les assets statiques
- Ajout types gzip : `font/woff2`, `image/svg+xml`
- Supprime le proxy API commente (code mort)

### `.github/workflows/deploy.yml`
- `root@82.25.119.112` en dur -> `${{ secrets.SERVER_USER }}@${{ secrets.SERVER_IP }}`
- Ajout `permissions: contents: read` (principe du moindre privilege)
- Ajout etape backup DB automatique avant chaque deploiement
- Ajout etape health check apres deploiement
- Corrige `frontend` -> `frontEnd` (nom reel du dossier)
- Node.js 18 -> 20

### `.env.example` (racine)
- Valeurs par defaut explicites : `CHANGER_MOT_DE_PASSE_ROOT_MINIMUM_16_CARACTERES`
- Ajout instructions de generation JWT_SECRET
- Separation config dev / prod (commentee)
- Ajout section email

### `.gitignore`
- Ajout `backups/`, `nginx/ssl/`, `*.sql.gz`, `*.pem`

---

## Prochaines etapes pour deployer

### Etape 1 : Commander le VPS OVHcloud

1. Aller sur https://www.ovhcloud.com/fr/vps/
2. Choisir **VPS Value** (4 Go RAM, 80 Go SSD) minimum
3. Systeme : **Ubuntu 22.04**
4. Noter l'IP et le mot de passe root recus par email

### Etape 2 : Configurer le serveur (1 commande)

```bash
# Depuis votre PC : copier votre cle SSH
ssh-copy-id root@IP_DU_VPS

# Lancer le script de configuration automatique
ssh root@IP_DU_VPS 'bash -s' < scripts/setup-server.sh

# Ajouter votre cle SSH pour l'utilisateur deploy
ssh-copy-id deploy@IP_DU_VPS
```

Ce script fait automatiquement :
- Cree l'utilisateur `deploy` (non-root)
- Desactive SSH root + mot de passe
- Active le pare-feu (UFW : ports 22, 80, 443)
- Installe Fail2Ban, Docker, Git
- Configure la sauvegarde DB quotidienne

### Etape 3 : Cloner et configurer (sur le serveur)

```bash
ssh deploy@IP_DU_VPS

# Generer une cle SSH pour GitHub/GitLab
ssh-keygen -t ed25519 -C "deploy-ovh"
cat ~/.ssh/id_ed25519.pub
# -> Ajouter sur GitHub (Settings > SSH Keys) ou GitLab (Preferences > SSH Keys)

# Cloner
git clone git@github.com:VOTRE-ORG/EventCulture.git /home/EventCulture
cd /home/EventCulture

# Configurer
cp .env.example .env
nano .env
# Remplir : MYSQL_ROOT_PASSWORD, DB_PASSWORD, JWT_SECRET, FRONTEND_URL, VITE_API_URL
```

### Etape 4 : Deployer (1 commande)

```bash
chmod +x scripts/deploy.sh scripts/setup-server.sh
./scripts/deploy.sh --init
./scripts/deploy.sh --seed
```

Tester : `http://IP_DU_VPS`

### Etape 5 : Domaine + HTTPS

```bash
# Configurer le DNS chez votre registrar :
#   A  @    -> IP_DU_VPS
#   A  www  -> IP_DU_VPS
#   A  api  -> IP_DU_VPS

# Installer le certificat SSL
./scripts/deploy.sh --ssl votredomaine.com
```

Tester : `https://votredomaine.com`

### Etape 6 : CI/CD (optionnel)

**GitHub** : ajouter 3 secrets dans Settings > Secrets > Actions :
- `SSH_PRIVATE_KEY_B64` : cle SSH encodee base64
- `SERVER_IP` : IP du VPS
- `SERVER_USER` : `deploy`

**GitLab** : ajouter 3 variables dans Settings > CI/CD > Variables :
- `SSH_PRIVATE_KEY` (type File) : cle SSH privee
- `SERVER_IP` : IP du VPS
- `SERVER_USER` : `deploy`

Apres ca, chaque `git push main` deploie automatiquement.

---

## Commandes utiles apres deploiement

```bash
./scripts/deploy.sh              # Mettre a jour (git pull + rebuild)
./scripts/deploy.sh --status     # Verifier l'etat des services
./scripts/deploy.sh --logs       # Voir les logs
./scripts/deploy.sh --logs backend  # Logs du backend uniquement
./scripts/deploy.sh --backup     # Sauvegarder la DB
./scripts/deploy.sh --down       # Arreter tous les services
```
