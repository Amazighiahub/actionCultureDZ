# Procédures de Rollback — EventCulture

## Rollback d'un Déploiement Docker

### Méthode rapide (image précédente)
```bash
# 1. Identifier l'image précédente
docker images eventculture-backend --format "{{.Tag}} {{.CreatedAt}}" | head -5

# 2. Arrêter le service actuel
docker compose -f docker-compose.prod.yml stop backend

# 3. Redémarrer avec l'image précédente
docker compose -f docker-compose.prod.yml up -d --no-build backend
# OU forcer une image spécifique :
# docker tag eventculture-backend:previous eventculture-backend:latest
# docker compose -f docker-compose.prod.yml up -d backend
```

### Méthode Git (rebuild)
```bash
# 1. Identifier le commit stable
git log --oneline -10

# 2. Checkout le commit stable
git checkout <commit-hash>

# 3. Rebuild et redéployer
docker compose -f docker-compose.prod.yml up -d --build

# 4. Revenir sur la branche après investigation
git checkout main
```

## Rollback de Migration Base de Données

### Annuler la dernière migration
```bash
docker exec eventculture-backend npx sequelize-cli db:migrate:undo
```

### Annuler N migrations
```bash
docker exec eventculture-backend npx sequelize-cli db:migrate:undo:all --to <migration-name>
```

### Restore complète depuis backup
```bash
# 1. Arrêter le backend
docker compose stop backend

# 2. Restaurer le backup
docker exec -i eventculture-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD actionculture < backup_YYYYMMDD.sql

# 3. Redémarrer
docker compose start backend
```

## Rollback de Configuration

### Variables d'environnement
```bash
# 1. Garder une copie du .env actuel
cp .env .env.rollback

# 2. Restaurer l'ancien .env
cp .env.backup .env

# 3. Redémarrer les services affectés
docker compose restart backend
```

### Nginx
```bash
# 1. Restaurer la config
cp nginx/prod.conf.backup nginx/prod.conf

# 2. Tester la config
docker exec eventculture-nginx nginx -t

# 3. Recharger
docker exec eventculture-nginx nginx -s reload
```

## Procédures d'Urgence

### Service complètement down
```bash
# 1. Vérifier l'état
docker compose ps
docker compose logs --tail=50

# 2. Redémarrer tout
docker compose down
docker compose up -d

# 3. Vérifier la santé
curl http://localhost:3001/health
```

### Base de données corrompue
```bash
# 1. Arrêter tout
docker compose down

# 2. Supprimer le volume MySQL (ATTENTION: perte de données)
# docker volume rm eventculture_mysql_data

# 3. Restaurer depuis backup
docker compose up -d mysql
# Attendre que MySQL soit healthy
docker exec -i eventculture-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD actionculture < latest_backup.sql

# 4. Redémarrer les autres services
docker compose up -d
```

### Redis inaccessible
Le backend bascule automatiquement sur le cache LRU en mémoire.
Aucune action immédiate nécessaire, mais vérifier :
```bash
docker compose restart redis
docker exec eventculture-redis redis-cli ping
```

## Checklist de Communication

En cas d'incident majeur :

- [ ] Identifier le problème et son impact
- [ ] Communiquer l'incident à l'équipe (Slack / email)
- [ ] Appliquer le rollback approprié
- [ ] Vérifier le health check post-rollback
- [ ] Documenter la cause racine
- [ ] Planifier le correctif
- [ ] Communiquer la résolution

## Contacts

| Rôle              | Responsabilité                    |
|-------------------|-----------------------------------|
| Lead Dev          | Décision de rollback              |
| DevOps            | Exécution du rollback             |
| Product Owner     | Communication utilisateurs        |
