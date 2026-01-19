# ✅ Checklist de Déploiement en Production - EventCulture

## Corrections de sécurité effectuées

### Backend
- [x] **database.js** - Validation stricte des credentials en production (pas de fallbacks)
- [x] **authMiddleware.js** - Validation du JWT_SECRET (minimum 32 caractères, rejet des valeurs d'exemple)
- [x] **corsMiddleware.js** - CORS sécurisé (localhost uniquement en dev, HTTPS requis en prod)
- [x] **httpsRedirect.js** - Nouveau middleware de redirection HTTP→HTTPS
- [x] **envValidator.js** - Validation stricte bloquante en production
- [x] **.env.example** - Documentation complète avec instructions de sécurité

### Frontend
- [x] **vite.config.ts** - Source maps désactivés en production
- [x] **jspdf** - Mis à jour vers v4.0.0 (correction vulnérabilité critique)

---

## 🔐 Avant le déploiement

### 1. Générer les secrets
```bash
cd backend
node scripts/generateSecret.js
# Copiez le secret généré dans votre .env
```

### 2. Créer un utilisateur MySQL dédié
```sql
CREATE USER 'actionculture_prod'@'localhost' IDENTIFIED BY 'VotreMotDePasseTrèsComplexe123!@#';
GRANT SELECT, INSERT, UPDATE, DELETE ON actionculture.* TO 'actionculture_prod'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configurer le fichier .env de production
```env
NODE_ENV=production

# Base de données
DB_USER=actionculture_prod
DB_PASSWORD=VotreMotDePasseTrèsComplexe123!@#
DB_NAME=actionculture
DB_HOST=localhost

# JWT (généré avec generateSecret.js)
JWT_SECRET=votre_secret_genere_de_64_caracteres_minimum_ici

# URLs (HTTPS obligatoire!)
FRONTEND_URL=https://www.votredomaine.com
API_URL=https://api.votredomaine.com

# Email (service réel)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=votre_cle_api_sendgrid
EMAIL_FROM=noreply@votredomaine.com
```

### 4. Vérifier les vulnérabilités restantes
```bash
cd backend && npm audit
cd ../frontEnd && npm audit
```

### 5. Construire pour la production
```bash
cd frontEnd
npm run build
# Vérifier qu'aucun .map n'est généré
ls dist/assets/*.map 2>/dev/null || echo "OK - Pas de source maps"
```

---

## 🚀 Déploiement

### Backend (Node.js)
```bash
# Avec PM2 (recommandé)
pm2 start backend/server.js --name eventculture-api -i max

# Ou avec systemd
sudo systemctl start eventculture-api
```

### Frontend (fichiers statiques)
```bash
# Copier le build vers le serveur web
scp -r frontEnd/dist/* user@server:/var/www/eventculture/
```

### Nginx (configuration recommandée)
```nginx
server {
    listen 80;
    server_name www.votredomaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.votredomaine.com;

    ssl_certificate /etc/letsencrypt/live/votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votredomaine.com/privkey.pem;

    # Frontend
    root /var/www/eventculture;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
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

    # Uploads
    location /uploads {
        alias /var/www/eventculture-api/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔍 Vérifications post-déploiement

- [ ] Le site est accessible en HTTPS
- [ ] La redirection HTTP→HTTPS fonctionne
- [ ] L'API répond correctement
- [ ] L'authentification fonctionne
- [ ] Les uploads fonctionnent
- [ ] Les emails sont envoyés
- [ ] Les logs sont collectés
- [ ] Le monitoring est actif

---

## 📊 Monitoring recommandé

- **Logs**: ELK Stack, Datadog, ou Papertrail
- **Uptime**: UptimeRobot, Pingdom
- **Performance**: New Relic, Datadog APM
- **Erreurs**: Sentry

---

## 🔄 Mises à jour futures

1. Toujours tester en environnement de staging d'abord
2. Faire une sauvegarde de la base de données avant chaque mise à jour
3. Utiliser des migrations pour les changements de schéma
4. Vérifier `npm audit` régulièrement
