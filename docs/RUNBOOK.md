# Runbook Opérationnel — EventCulture

## Architecture des Services

| Service   | Container               | Port interne | Port exposé     |
|-----------|-------------------------|--------------|-----------------|
| Backend   | eventculture-backend    | 3001         | 3001            |
| Frontend  | eventculture-frontend   | 80           | 3000            |
| MySQL     | eventculture-mysql      | 3306         | 127.0.0.1:3306  |
| Redis     | eventculture-redis      | 6379         | non exposé      |

## Démarrage / Arrêt

### Développement
```bash
# Démarrer tous les services
docker compose up -d

# Arrêter
docker compose down

# Voir les logs
docker compose logs -f backend
docker compose logs -f --tail=100 mysql
```

### Production
```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down
```

## Health Checks

### Endpoint principal
```bash
curl http://localhost:3001/health
```

Réponse attendue (200 OK) :
```json
{
  "status": "healthy",
  "checks": { "db": true, "redis": true },
  "responseTimeMs": 12,
  "uptime": 86400,
  "version": "1.0.0"
}
```

Réponse dégradée (503) : `"status": "degraded"` — indique que la DB ou Redis est inaccessible.

### Vérification individuelle
```bash
# MySQL
docker exec eventculture-mysql mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD

# Redis
docker exec eventculture-redis redis-cli ping
```

## Cache (Redis + LRU fallback)

### Architecture
- **Redis** : cache primaire, partagé entre instances
- **LRU en mémoire** : fallback automatique si Redis est indisponible (500 entrées max)
- Les deux sont écrits simultanément (write-through)

### Vider le cache
```bash
# Via API admin (nécessite auth admin)
curl -X POST http://localhost:3001/api/dashboard/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'

# Via Redis directement
docker exec eventculture-redis redis-cli --pass $REDIS_PASSWORD KEYS "cache:*"
docker exec eventculture-redis redis-cli --pass $REDIS_PASSWORD FLUSHDB
```

### Stratégies de cache
| Stratégie | TTL       | Usage                          |
|-----------|-----------|--------------------------------|
| short     | 1 min     | Données temps réel             |
| medium    | 5 min     | Listes, recherches             |
| long      | 1 heure   | Contenus stables               |
| veryLong  | 24 heures | Statistiques agrégées          |
| metadata  | 7 jours   | Données de référence statiques |

## Circuit Breaker

Les services externes (Cloudinary, email) sont protégés par un circuit breaker.

### États
- **CLOSED** : fonctionnement normal
- **OPEN** : service défaillant → les appels échouent immédiatement (fail fast)
- **HALF_OPEN** : après le délai de reset, un appel test est autorisé

### Configuration
| Service    | Seuil d'échec | Délai de reset | Succès pour fermer |
|------------|---------------|----------------|--------------------|
| Cloudinary | 3 échecs      | 60s            | 2 succès           |
| Email      | 3 échecs      | 120s           | 1 succès           |

### Diagnostic
Si les uploads échouent systématiquement, vérifier :
1. Les logs pour `CircuitBreaker [cloudinary]: OPEN`
2. Les variables d'env Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
3. Le statut de Cloudinary : https://status.cloudinary.com

## Logs

### Emplacement
- **Container** : `docker compose logs backend`
- **Volume** : `backend_logs:/app/logs`
- Format JSON structuré avec `requestId` pour la traçabilité

### Niveaux
- `error` : erreurs serveur (5xx), exceptions non gérées
- `warn` : requêtes lentes (>2s), circuit breaker, rate limits
- `info` : connexions DB/Redis, démarrage/arrêt
- `debug` : requêtes individuelles, cache hits/misses

### Recherche par request ID
Chaque réponse inclut un header `X-Request-Id`. Pour tracer une requête :
```bash
docker compose logs backend | grep "abc123-request-id"
```

## Base de Données

### Backup
```bash
# Backup complet
docker exec eventculture-mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD actionculture > backup_$(date +%Y%m%d).sql

# Avec le script fourni
bash scripts/backup-uploads.sh
```

### Restore
```bash
docker exec -i eventculture-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD actionculture < backup.sql
```

### Migrations
```bash
docker exec eventculture-backend npx sequelize-cli db:migrate
docker exec eventculture-backend npx sequelize-cli db:migrate:undo  # rollback dernière migration
```

## Problèmes Courants

### Backend ne démarre pas
1. Vérifier que MySQL est healthy : `docker compose ps`
2. Vérifier les variables d'env : `.env`
3. Vérifier les logs : `docker compose logs backend`

### Erreurs 502 / 503
1. Vérifier le health check : `curl localhost:3001/health`
2. Redis down → le backend bascule automatiquement sur le cache LRU
3. MySQL down → redémarrer : `docker compose restart mysql`

### Rate limiting (429)
- Limite par défaut : voir `rateLimitMiddleware.js`
- Les headers `X-RateLimit-Remaining` et `X-RateLimit-Reset` sont inclus dans les réponses
- Actions sensibles ont des limites plus strictes

### Espace disque
```bash
docker system df          # utilisation Docker
docker system prune -f    # nettoyer images/containers inutilisés
```

## Scaling

### Horizontal
- Le backend est stateless (sessions via JWT cookies)
- Redis partagé nécessaire pour le cache distribué
- Ajouter `deploy.replicas: N` dans docker-compose

### Vertical
- MySQL : augmenter `innodb_buffer_pool_size`
- Redis : ajuster `--maxmemory` (défaut: 256mb)
- Node.js : augmenter `--max-old-space-size` si nécessaire
