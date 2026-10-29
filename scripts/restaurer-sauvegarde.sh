#!/usr/bin/env bash
# ============================================================================
# Restauration d'une sauvegarde de la base (fichier db_….sql.gz produit par scripts/backup.sh).
# À lancer sur le serveur, depuis le dossier du projet (là où se trouve .env).
#
#   scripts/restaurer-sauvegarde.sh --liste
#       liste les sauvegardes du volume (conteneur eventculture-backup)
#   scripts/restaurer-sauvegarde.sh db_nuit_2026-10-29_03-00.sql.gz
#       restaure une sauvegarde du volume
#   scripts/restaurer-sauvegarde.sh /chemin/vers/db_….sql.gz
#       restaure un fichier local (par exemple une copie hors serveur déchiffrée avec age)
#
# Étapes : archive vérifiée (gzip, « Dump completed ») → sauvegarde « manuel » de l'état actuel
# → confirmation (taper le nom de la base) → import → nombre de tables affiché.
# Options (variables d'environnement) :
#   MYSQL_CONTAINER   conteneur MySQL cible (défaut : eventculture-mysql)
#   BACKUP_CONTAINER  conteneur des sauvegardes (défaut : eventculture-backup)
#   DB_NAME, MYSQL_ROOT_PASSWORD   lus dans .env s'ils ne sont pas déjà définis
#   SANS_SAUVEGARDE_AVANT=1        ne pas sauvegarder l'état actuel (base vide, essai)
#   CONFIRMER=<nom de la base>     confirmation sans question (essai automatisé)
# Le mot de passe n'est jamais affiché ni passé en ligne de commande.
# ============================================================================
set -Eeuo pipefail

MYSQL_CONTAINER="${MYSQL_CONTAINER:-eventculture-mysql}"
BACKUP_CONTAINER="${BACKUP_CONTAINER:-eventculture-backup}"

log()  { echo "[restauration $(date +%T)] $*"; }
fail() { echo "[restauration] ERREUR : $*" >&2; exit 1; }

if [ "${1:-}" = "--liste" ]; then
  docker exec "$BACKUP_CONTAINER" sh -c 'ls -1t /backups/db_*.sql.gz 2>/dev/null' \
    | while read -r f; do echo "$(basename "$f")"; done
  exit 0
fi

SOURCE="${1:?Usage : $0 --liste | <db_….sql.gz du volume> | <chemin local .sql.gz>}"

# Identifiants : .env du projet, sans les afficher
if [ -z "${MYSQL_ROOT_PASSWORD:-}" ] || [ -z "${DB_NAME:-}" ]; then
  [ -f .env ] || fail ".env introuvable : lancer le script depuis le dossier du projet"
  set -a; . ./.env; set +a
fi
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD manquant}"
: "${DB_NAME:?DB_NAME manquant}"

WORK="$(mktemp -d)"
trap 'rm -rf -- "$WORK"' EXIT
FICHIER="$WORK/sauvegarde.sql.gz"

# 1. Récupérer l'archive (volume des sauvegardes ou fichier local)
if [ -f "$SOURCE" ]; then
  cp -- "$SOURCE" "$FICHIER"
else
  NOM="$(basename "$SOURCE")"
  case "$NOM" in db_*.sql.gz) ;; *) fail "nom de sauvegarde inattendu : $NOM" ;; esac
  docker cp "$BACKUP_CONTAINER:/backups/$NOM" "$FICHIER" || fail "sauvegarde introuvable : $NOM (voir --liste)"
fi

# 2. Archive complète ? (un dump interrompu ne se termine pas par « Dump completed »)
gzip -t "$FICHIER" || fail "archive corrompue"
zcat "$FICHIER" | tail -n 1 | grep -q 'Dump completed' || fail "dump incomplet (pas de « Dump completed »)"
BASE_DU_DUMP="$(zcat "$FICHIER" | grep -m1 -oE '^CREATE DATABASE /\*[^*]*\*/ `[^`]+`' | grep -oE '`[^`]+`' | tr -d '`' || true)"
log "archive vérifiée : $(du -h "$FICHIER" | cut -f1), base « ${BASE_DU_DUMP:-?} »"
[ -z "$BASE_DU_DUMP" ] || [ "$BASE_DU_DUMP" = "$DB_NAME" ] \
  || fail "la sauvegarde contient la base « $BASE_DU_DUMP », pas « $DB_NAME »"

# Requête simple (sans lire l'entrée standard : la confirmation tapée y est attendue)
mysql_cible() { docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER" mysql -uroot "$@" </dev/null; }
# Import : le dump arrive par l'entrée standard
mysql_import() { docker exec -i -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER" mysql -uroot; }
mysql_cible -e 'SELECT 1' >/dev/null || fail "connexion impossible à MySQL ($MYSQL_CONTAINER)"

# 3. Sauvegarde de l'état actuel : on peut revenir en arrière si la restauration déçoit
if [ "${SANS_SAUVEGARDE_AVANT:-0}" != "1" ]; then
  log "sauvegarde de l'état actuel (catégorie « manuel »)"
  docker compose -f docker-compose.prod.yml run --rm --no-deps -T --entrypoint /bin/bash backup /backup.sh manuel </dev/null \
    | tail -n 3 || fail "sauvegarde de l'état actuel impossible : restauration annulée"
fi

# 4. Confirmation : la base actuelle est remplacée entièrement
if [ "${CONFIRMER:-}" != "$DB_NAME" ]; then
  echo "La base « $DB_NAME » ($MYSQL_CONTAINER) va être REMPLACÉE par cette sauvegarde."
  REPONSE=""
  read -r -p "Tapez le nom de la base pour confirmer : " REPONSE || true
  [ "$REPONSE" = "$DB_NAME" ] || fail "confirmation incorrecte : rien n'a été modifié"
fi

# 5. Import (le dump contient DROP DATABASE / CREATE DATABASE / USE)
log "import en cours…"
zcat "$FICHIER" | mysql_import
TABLES="$(mysql_cible -N -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME'")"
log "restauration terminée : $TABLES tables dans « $DB_NAME »"
log "pensez à redémarrer le backend (cache) : docker compose -f docker-compose.prod.yml restart backend"
