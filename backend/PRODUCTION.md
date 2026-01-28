# Guide de Mise en Production - Action Culture Backend

## Checklist Pré-Production

### 1. Base de Données MySQL

```sql
-- Créer l'utilisateur dédié (NE PAS utiliser root)
CREATE USER 'actionculture_app'@'localhost' IDENTIFIED BY 'VotreMotDePasse2024!SecureProd';

-- Privilèges limités (principe du moindre privilège)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER
ON actionculture.* TO 'actionculture_app'@'localhost';

FLUSH PRIVILEGES;
```

### 2. Variables d'Environnement (.env)

```env
# === ENVIRONNEMENT ===
NODE_ENV=production
PORT=3001

# === BASE DE DONNÉES ===
DB_NAME=actionculture
DB_USER=actionculture_app
DB_PASSWORD=VotreMotDePasse2024!SecureProd  # Min 16 caractères, majuscules, minuscules, chiffres
DB_HOST=localhost
DB_PORT=3306

# === JWT ===
JWT_SECRET=<générer avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_EXPIRES_IN=24h

# === URLS (HTTPS obligatoire) ===
API_URL=https://api.votre-domaine.com
FRONTEND_URL=https://votre-domaine.com
BASE_URL=https://api.votre-domaine.com

# === EMAIL (désactiver le mode pause) ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-app-password
EMAIL_FROM=noreply@votre-domaine.com
EMAIL_PAUSED=false

# === REDIS (optionnel mais recommandé) ===
USE_REDIS_MEMORY=false
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Certificat SSL

#### Option A: Let's Encrypt (VPS/Serveur dédié)
```bash
# Installation Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot --nginx -d api.votre-domaine.com

# Renouvellement automatique (cron)
sudo crontab -e
# Ajouter: 0 0 1 * * certbot renew --quiet
```

#### Option B: Cloudflare (recommandé)
1. Ajouter votre domaine à Cloudflare
2. SSL/TLS > Mode: Full (strict)
3. Edge Certificates > Always Use HTTPS: ON

#### Option C: Hébergeur (cPanel, Plesk)
- Utiliser AutoSSL ou Let's Encrypt intégré

---

## Déploiement

### 1. Préparation
```bash
# Cloner le projet
git clone <repo> /var/www/actionculture
cd /var/www/actionculture/backend

# Installer les dépendances (production uniquement)
npm ci --production

# Corriger les vulnérabilités
npm audit fix
```

### 2. Configuration Nginx (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/api.votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.votre-domaine.com/privkey.pem;

    # Headers de sécurité
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Limite taille uploads
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

    # Fichiers statiques (uploads)
    location /uploads {
        alias /var/www/actionculture/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Process Manager (PM2)
```bash
# Installation
npm install -g pm2

# Démarrer l'application
pm2 start server.js --name "actionculture-api" --env production

# Configurer le démarrage automatique
pm2 startup
pm2 save

# Commandes utiles
pm2 status              # Voir le statut
pm2 logs actionculture-api  # Voir les logs
pm2 restart actionculture-api  # Redémarrer
pm2 monit               # Monitoring temps réel
```

### 4. Configuration PM2 (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'actionculture-api',
    script: 'server.js',
    instances: 'max',  // Utiliser tous les CPU
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
};
```

---

## Sécurité Production

### Headers activés automatiquement
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Protections actives
- Rate limiting (1000 req/15min)
- Sanitisation XSS des inputs
- Validation magic numbers uploads
- CORS strict (domaines autorisés uniquement)
- Redirection HTTP → HTTPS
- Blocage requêtes sans Origin

---

## Monitoring

### Endpoints de santé
```bash
# Health check
curl https://api.votre-domaine.com/health

# Réponse attendue
{
  "status": "healthy",
  "environment": "production",
  "version": "1.0.0"
}
```

### Logs
```bash
# PM2 logs
pm2 logs actionculture-api --lines 100

# Logs système
tail -f /var/www/actionculture/backend/logs/combined.log
```

---

## Checklist Finale

- [ ] MySQL: Utilisateur dédié créé (pas root)
- [ ] .env: Toutes les variables configurées
- [ ] .env: `EMAIL_PAUSED=false`
- [ ] .env: URLs en HTTPS
- [ ] SSL: Certificat valide installé
- [ ] Nginx: Reverse proxy configuré
- [ ] PM2: Application démarrée
- [ ] Test: `/health` retourne `environment: "production"`
- [ ] Test: Redirection HTTP → HTTPS fonctionne
- [ ] Backup: Base de données sauvegardée

---

## Commandes Rapides

```bash
# Démarrer en production
NODE_ENV=production npm start

# Avec PM2
pm2 start ecosystem.config.js --env production

# Vérifier la santé
curl -s https://api.votre-domaine.com/health | jq

# Redémarrer après mise à jour
git pull && npm ci --production && pm2 restart actionculture-api
```

---

## Support

En cas de problème:
1. Vérifier les logs: `pm2 logs`
2. Vérifier la connexion DB: `mysql -u actionculture_app -p`
3. Vérifier le certificat SSL: `openssl s_client -connect api.votre-domaine.com:443`
