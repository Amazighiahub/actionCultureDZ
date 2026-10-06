#!/usr/bin/env bash
# ============================================================================
# Déploiement production — appelé par .github/workflows/deploy.yml sur le VPS,
# depuis le dossier du projet, APRÈS que le dépôt est positionné sur le commit testé.
#
#   scripts/deploy-ci.sh <sha_deploye> <sha_precedent>
#
# Principe : le site reste en ligne pendant le build ; on ne touche à la prod
# qu'une fois les images prêtes ; en cas d'échec après la bascule, retour
# automatique aux images précédentes (les migrations, elles, ne sont pas annulées :
# elles doivent rester compatibles avec la version précédente du code).
# ============================================================================
set -Eeuo pipefail

SHA="${1:?sha deploye requis}"
PREV="${2:?sha precedent requis}"
DOMAIN="${DEPLOY_DOMAIN:-taladz.com}"
C="docker compose -f docker-compose.prod.yml"
# Nom de projet compose = nom du dossier en minuscules (ex. actionculturedz)
PROJECT="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')"

log()  { echo "[deploy $(date +%T)] $*"; }
warn() { echo "[deploy $(date +%T)] ATTENTION: $*" >&2; }

wait_healthy() {
  local container="$1" timeout="${2:-180}" status=""
  for ((i = 0; i < timeout; i += 5)); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo absent)"
    [ "$status" = "healthy" ] && return 0
    sleep 5
  done
  warn "$container n'est pas healthy apres ${timeout}s (statut: $status)"
  docker logs --tail 80 "$container" || true
  return 1
}

rollback() {
  warn "echec du deploiement de $SHA -> retour aux images precedentes ($PREV)"
  for s in backend frontend; do
    docker image inspect "$PROJECT-$s:rollback" >/dev/null 2>&1 \
      && docker tag "$PROJECT-$s:rollback" "$PROJECT-$s:latest" || true
  done
  $C up -d --no-deps backend frontend || true
  $C exec -T nginx nginx -s reload || true
  # Le workflow a vérifié que le dépôt était propre avant le déploiement
  git reset --hard --quiet "$PREV" || true
}

# 0. Configuration compose + .env lisibles
$C config -q

# 1. Conserver les images actuelles pour un éventuel retour arrière
for s in backend frontend; do
  if docker image inspect "$PROJECT-$s:latest" >/dev/null 2>&1; then
    docker tag "$PROJECT-$s:latest" "$PROJECT-$s:rollback"
  fi
done

# 2. Build des nouvelles images — l'ancien site reste en ligne pendant ce temps
log "build des images ($SHA)"
$C build --pull backend frontend

# 3. Vérifier la configuration de production avec la nouvelle image
log "validation de l'environnement"
$C run --rm --no-deps -T backend node -e "require('./config/envValidator').validate()"

# 4. Suivi des migrations : si SequelizeMeta est vide, db:migrate rejouerait tout
#    l'historique sur une base existante. Le nouveau code a besoin des nouvelles
#    migrations : on s'arrête AVANT de toucher à la prod (l'ancien site reste en ligne).
log "verification du suivi des migrations"
MIG_STATUS="$($C run --rm --no-deps -T backend npx --no-install sequelize-cli db:migrate:status 2>&1)"
if ! grep -qE '^up ' <<<"$MIG_STATUS"; then
  warn "SequelizeMeta vide : deploiement arrete, prod inchangee. Initialiser la table une fois (voir docs/DEPLOYMENT.md)."
  echo "$MIG_STATUS" | tail -n 30
  exit 1
fi
log "migrations a appliquer : $(grep -cE '^down ' <<<"$MIG_STATUS" || true)"

# 5. Sauvegarde de la base avant toute modification
log "sauvegarde de la base"
$C exec -T backup /backup.sh

# A partir d'ici on modifie la prod : retour arrière automatique en cas d'erreur
trap rollback ERR

# 6. Migrations (uniquement celles pas encore appliquées)
log "migrations"
$C run --rm --no-deps -T backend npx --no-install sequelize-cli db:migrate

# 7. Bascule : uniquement backend puis frontend (MySQL, Redis, backup, certbot intacts)
log "redemarrage backend"
$C up -d --no-deps backend
wait_healthy eventculture-backend 180

log "redemarrage frontend"
$C up -d --no-deps frontend
wait_healthy eventculture-frontend 90

# 8. nginx résout les upstreams au chargement : recharger après recréation des conteneurs
$C exec -T nginx nginx -t
$C exec -T nginx nginx -s reload

# 9. Vérification de bout en bout à travers nginx
sleep 3
curl -fsS --max-time 10 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/health" | grep -q '"healthy"'
curl -fsS --max-time 10 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" | grep -q 'id="root"'

trap - ERR
docker image prune -f >/dev/null
log "deploiement OK : $SHA"
