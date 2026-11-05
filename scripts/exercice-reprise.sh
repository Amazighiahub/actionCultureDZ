#!/usr/bin/env bash
# ============================================================================
# Exercice de reprise : une sauvegarde peut-elle vraiment être restaurée, et en combien de temps ?
# À lancer sur le serveur, depuis le dossier du projet, de préférence la nuit :
#
#   bash scripts/exercice-reprise.sh                 dernière sauvegarde de nuit du volume
#   bash scripts/exercice-reprise.sh db_nuit_….sql.gz  ou un fichier local
#   bash scripts/exercice-reprise.sh --comparer      compare aussi les totaux avec la base en ligne
#
# Ce que fait le script :
#   - restaure dans une base MySQL JETABLE, sans réseau, supprimée à la fin ;
#   - ne modifie ni la base en ligne, ni le site, ni les sauvegardes ;
#   - utilise scripts/restaurer-sauvegarde.sh : c'est bien la procédure réelle qui est testée ;
#   - contrôle aussi l'âge des sauvegardes et la présence de la copie hors serveur.
# N'affiche que des totaux par table, aucune donnée personnelle et aucun mot de passe.
# Mémoire : la base jetable est limitée à EXERCICE_MEMOIRE (défaut 1g).
# Code retour : 0 réussi, 1 échec. La sauvegarde hors serveur reste à déchiffrer sur un poste
# qui détient la clé privée (voir docs/PLAN_REPRISE.md) : par conception, le serveur ne l'a pas.
# ============================================================================
set -Eeuo pipefail

DEPART="$(date +%s)"
CONTENEUR="tala-exercice-reprise-$$"
BACKUP_CONTAINER="${BACKUP_CONTAINER:-eventculture-backup}"
MYSQL_EN_LIGNE="${MYSQL_EN_LIGNE:-eventculture-mysql}"
AGE_MAX_HEURES="${EXERCICE_AGE_MAX_HEURES:-26}"
CONF_COPIE="${BACKUP_OFFSITE_CONF:-/etc/eventculture-backup.env}"
DOSSIER_SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { echo "[exercice $(date +%T)] $*"; }
fail() { echo "[exercice] ÉCHEC : $*" >&2; exit 1; }

COMPARER=0
SOURCE=""
for argument in "$@"; do
  case "$argument" in
    --comparer) COMPARER=1 ;;
    *) SOURCE="$argument" ;;
  esac
done

TRAVAIL="$(mktemp -d)"
nettoyer() {
  docker rm -fv "$CONTENEUR" >/dev/null 2>&1 || true
  rm -rf -- "$TRAVAIL"
}
trap nettoyer EXIT

# Âge d'un fichier du volume des sauvegardes, en heures
age_dans_volume() {
  docker exec "$BACKUP_CONTAINER" sh -c "echo \$(( (\$(date +%s) - \$(stat -c %Y '$1')) / 3600 ))"
}

# ─── 1. Quelle sauvegarde ? ──────────────────────────────────
if [ -z "$SOURCE" ]; then
  DERNIERE="$(docker exec "$BACKUP_CONTAINER" sh -c 'ls -1t /backups/db_nuit_*.sql.gz /backups/db_[0-9]*.sql.gz 2>/dev/null | head -n 1')" \
    || fail "conteneur des sauvegardes injoignable ($BACKUP_CONTAINER)"
  [ -n "$DERNIERE" ] || fail "aucune sauvegarde de nuit dans le volume"
  AGE="$(age_dans_volume "$DERNIERE")"
  log "dernière sauvegarde de nuit : $(basename "$DERNIERE"), âgée de ${AGE} h"
  [ "$AGE" -le "$AGE_MAX_HEURES" ] || fail "sauvegarde de plus de ${AGE_MAX_HEURES} h : la sauvegarde de nuit ne tourne plus"
  docker cp "$BACKUP_CONTAINER:$DERNIERE" "$TRAVAIL/sauvegarde.sql.gz" >/dev/null

  # Archive des fichiers envoyés de la même nuit
  ARCHIVE="$(docker exec "$BACKUP_CONTAINER" sh -c 'ls -1t /backups/uploads_*.tar.gz 2>/dev/null | head -n 1')" || true
  if [ -z "$ARCHIVE" ]; then
    log "ATTENTION : aucune archive des fichiers envoyés"
  else
    AGE_ARCHIVE="$(age_dans_volume "$ARCHIVE")"
    docker exec "$BACKUP_CONTAINER" gzip -t "$ARCHIVE" || fail "archive des fichiers envoyés corrompue"
    log "archive des fichiers envoyés : intacte, âgée de ${AGE_ARCHIVE} h"
    [ "$AGE_ARCHIVE" -le "$AGE_MAX_HEURES" ] || log "ATTENTION : archive des fichiers envoyés trop ancienne"
  fi
else
  if [ -f "$SOURCE" ]; then
    cp -- "$SOURCE" "$TRAVAIL/sauvegarde.sql.gz"
  else
    docker cp "$BACKUP_CONTAINER:/backups/$(basename "$SOURCE")" "$TRAVAIL/sauvegarde.sql.gz" >/dev/null \
      || fail "sauvegarde introuvable : $SOURCE"
  fi
fi

BASE="$(zcat "$TRAVAIL/sauvegarde.sql.gz" | grep -m1 -oE '^CREATE DATABASE /\*[^*]*\*/ `[^`]+`' | grep -oE '`[^`]+`' | tr -d '`' || true)"
[ -n "$BASE" ] || fail "nom de la base introuvable dans la sauvegarde"

# ─── 2. Base jetable ─────────────────────────────────────────
IMAGE="$(docker inspect "$MYSQL_EN_LIGNE" --format '{{.Config.Image}}' 2>/dev/null || true)"
IMAGE="${IMAGE:-mysql:8.0}"
MOT_DE_PASSE="$(openssl rand -hex 24)"
log "démarrage d'une base jetable ($IMAGE), sans réseau"
docker run -d --name "$CONTENEUR" --network none --memory "${EXERCICE_MEMOIRE:-1g}" \
  -e MYSQL_ROOT_PASSWORD="$MOT_DE_PASSE" "$IMAGE" >/dev/null || fail "base jetable impossible à démarrer"

# MySQL redémarre une fois après sa première initialisation : attendre qu'il réponde vraiment
pret=0
LIMITE=$(( $(date +%s) + 600 ))
while [ "$(date +%s)" -lt "$LIMITE" ]; do
  if docker exec -e MYSQL_PWD="$MOT_DE_PASSE" "$CONTENEUR" mysql -uroot -e 'SELECT 1' >/dev/null 2>&1; then
    pret=$((pret + 1))
    [ "$pret" -ge 3 ] && break
  else
    pret=0
  fi
  sleep 2
done
[ "$pret" -ge 3 ] || fail "la base jetable ne répond pas"

# ─── 3. Restauration, avec le script réel ────────────────────
DEBUT_IMPORT="$(date +%s)"
MYSQL_CONTAINER="$CONTENEUR" BACKEND_CONTAINER="" DB_NAME="$BASE" MYSQL_ROOT_PASSWORD="$MOT_DE_PASSE" \
  SANS_MIGRATIONS=1 SANS_SAUVEGARDE_AVANT=1 CONFIRMER="$BASE" \
  bash "$DOSSIER_SCRIPTS/restaurer-sauvegarde.sh" "$TRAVAIL/sauvegarde.sql.gz" \
  || fail "la restauration a échoué"
DUREE_IMPORT=$(( $(date +%s) - DEBUT_IMPORT ))

# ─── 4. La base restaurée est-elle complète ? ────────────────
requete() {
  docker exec -e MYSQL_PWD="$3" "$1" mysql -uroot -N --default-character-set=utf8mb4 -e "$2" </dev/null
}
compter_tables() {
  # $1 conteneur, $2 mot de passe, $3 base : « table nombre », une par ligne
  local conteneur="$1" secret="$2" base="$3" table
  for table in $(requete "$conteneur" "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$base' AND TABLE_TYPE='BASE TABLE' ORDER BY 1" "$secret"); do
    echo "$table $(requete "$conteneur" "SELECT COUNT(*) FROM \`$base\`.\`$table\`" "$secret")"
  done
}
compter_tables "$CONTENEUR" "$MOT_DE_PASSE" "$BASE" > "$TRAVAIL/restauree.txt"
TABLES="$(wc -l < "$TRAVAIL/restauree.txt" | tr -d ' ')"
LIGNES="$(awk '{ s += $2 } END { print s + 0 }' "$TRAVAIL/restauree.txt")"
[ "$TABLES" -gt 0 ] && [ "$LIGNES" -gt 0 ] || fail "la base restaurée est vide"

# Les textes arabes ont-ils survécu ? (lettres arabes dans les œuvres)
ARABE="$(requete "$CONTENEUR" "SELECT COUNT(*) FROM \`$BASE\`.oeuvre WHERE CAST(titre AS CHAR CHARACTER SET utf8mb4) REGEXP '[ء-ي]'" "$MOT_DE_PASSE" 2>/dev/null || echo '?')"

log "contrôle : $TABLES tables, $LIGNES lignes, $ARABE œuvre(s) avec un titre en arabe"

# ─── 5. Comparaison avec la base en ligne (totaux seulement) ─
if [ "$COMPARER" = "1" ]; then
  [ -f .env ] || fail ".env introuvable : lancer depuis le dossier du projet"
  # Lecture des seules variables utiles, sans les afficher
  SECRET="$(grep -E '^MYSQL_ROOT_PASSWORD=' .env | head -n 1 | cut -d= -f2- | tr -d '"'"'"'\r')"
  [ -n "$SECRET" ] || fail "MYSQL_ROOT_PASSWORD absent de .env"
  compter_tables "$MYSQL_EN_LIGNE" "$SECRET" "$BASE" > "$TRAVAIL/enligne.txt"
  log "écarts avec la base en ligne (normaux s'il y a eu de l'activité depuis la sauvegarde) :"
  join "$TRAVAIL/restauree.txt" "$TRAVAIL/enligne.txt" \
    | awk '$2 != $3 { printf "    %s : sauvegarde %s, en ligne %s\n", $1, $2, $3; n++ } END { if (!n) print "    aucun" }'
fi

# ─── 6. Copie hors serveur ───────────────────────────────────
if [ -r "$CONF_COPIE" ] && command -v rclone >/dev/null 2>&1; then
  DESTINATION="$(grep -E '^BACKUP_RCLONE_DEST=' "$CONF_COPIE" | head -n 1 | cut -d= -f2- | tr -d '"'"'"'')"
  if [ -n "$DESTINATION" ]; then
    RECENT="$(rclone lsl "$DESTINATION" --include 'db_*' 2>/dev/null | sort -k2,3 | tail -n 1 | awk '{ print $2, $NF }')" || RECENT=""
    if [ -n "$RECENT" ]; then
      log "copie hors serveur la plus récente : $RECENT"
    else
      log "ATTENTION : copie hors serveur introuvable ou inaccessible"
    fi
  fi
else
  log "copie hors serveur : non contrôlée (configuration ou rclone absents sur cette machine)"
fi

DUREE=$(( $(date +%s) - DEPART ))
log "RÉUSSI : import en ${DUREE_IMPORT} s, exercice complet en ${DUREE} s"
log "à noter dans docs/PLAN_REPRISE.md, section 5 (date, durée, tables, lignes)"
