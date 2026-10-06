#!/usr/bin/env bash
# ============================================================================
# Copie chiffrée HORS DU VPS de la dernière sauvegarde de la base.
# À lancer sur l'HÔTE (pas dans un conteneur), par cron, après le backup de 3h :
#   30 3 * * * /home/actionCultureDZ/scripts/backup-offsite.sh >> /var/log/backup-offsite.log 2>&1
#
# Prérequis sur l'hôte (une seule fois) :
#   apt install age rclone
#   rclone config                      # créer un remote (S3, Backblaze B2, OVH, Scaleway...)
#   age-keygen -o backup-key.txt       # SUR UN AUTRE POSTE : garder la clé privée hors du VPS
#   # ne copier sur le VPS que la clé PUBLIQUE (age1...)
#
# Configuration (fichier /etc/eventculture-backup.env, chmod 600) :
#   BACKUP_AGE_RECIPIENT=age1xxxxxxxx          # clé publique age
#   BACKUP_RCLONE_DEST=monremote:mon-bucket/eventculture
#   BACKUP_ALERT_URL=https://hc-ping.com/xxx    # optionnel : ping en cas de succès (healthchecks.io)
#
# Restauration :
#   rclone copy monremote:mon-bucket/eventculture/db_XXXX.sql.gz.age .
#   age -d -i backup-key.txt db_XXXX.sql.gz.age | gunzip | mysql -u root -p
# ============================================================================
set -Eeuo pipefail

CONF="${BACKUP_OFFSITE_CONF:-/etc/eventculture-backup.env}"
CONTAINER="${BACKUP_CONTAINER:-eventculture-backup}"
MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"

log() { echo "[offsite $(date '+%F %T')] $*"; }
fail() { log "ERREUR: $*" >&2; exit 1; }

[ -r "$CONF" ] || fail "configuration absente : $CONF (voir l'en-tête du script)"
# shellcheck disable=SC1090
source "$CONF"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT manquant dans $CONF}"
: "${BACKUP_RCLONE_DEST:?BACKUP_RCLONE_DEST manquant dans $CONF}"
command -v age >/dev/null || fail "age non installé (apt install age)"
command -v rclone >/dev/null || fail "rclone non installé (apt install rclone)"

# Dernier dump produit dans le volume du conteneur de sauvegarde
LATEST="$(docker exec "$CONTAINER" sh -c 'ls -1t /backups/db_*.sql.gz 2>/dev/null | head -n 1')"
[ -n "$LATEST" ] || fail "aucun dump trouvé dans $CONTAINER:/backups"

# Refuser d'envoyer une sauvegarde trop ancienne : signale un backup nocturne en échec
AGE_HOURS="$(docker exec "$CONTAINER" sh -c "echo \$(( (\$(date +%s) - \$(stat -c %Y '$LATEST')) / 3600 ))")"
[ "$AGE_HOURS" -le "$MAX_AGE_HOURS" ] || fail "dernier dump vieux de ${AGE_HOURS}h (> ${MAX_AGE_HOURS}h) : backup nocturne en échec ?"

WORK="$(mktemp -d)"
trap 'rm -rf -- "$WORK"' EXIT
NAME="$(basename "$LATEST")"

docker cp "$CONTAINER:$LATEST" "$WORK/$NAME"
gzip -t "$WORK/$NAME" || fail "archive corrompue : $NAME"

# Chiffrement avec la clé publique : un VPS compromis ne peut pas relire les sauvegardes
age -r "$BACKUP_AGE_RECIPIENT" -o "$WORK/$NAME.age" "$WORK/$NAME"
rclone copy "$WORK/$NAME.age" "$BACKUP_RCLONE_DEST" --immutable
log "OK : $NAME.age -> $BACKUP_RCLONE_DEST"

if [ -n "${BACKUP_ALERT_URL:-}" ]; then
  curl -fsS --max-time 10 "$BACKUP_ALERT_URL" >/dev/null || log "ping de supervision échoué"
fi
