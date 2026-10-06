#!/bin/bash
# ============================================
# Backup automatique — Tala DZ
# ============================================
# Dump MySQL + uploads, compression gzip, rotation des N dernières sauvegardes réussies.
# Lancé chaque nuit à 3h par le service Docker "backup", et avant chaque déploiement.
# Copie chiffrée hors du VPS : scripts/backup-offsite.sh (cron de l'hôte).
#
# Usage manuel : ./scripts/backup.sh
# Code retour : 0 si le dump MySQL est valide, 1 sinon (le déploiement s'arrête alors).
# ============================================

set -Eeuo pipefail

# ─── Configuration ───────────────────────────────────────────
BACKUP_DIR="/backups"
KEEP_COUNT="${BACKUP_KEEP_COUNT:-7}"   # nombre de sauvegardes réussies conservées
DATE=$(date +"%Y-%m-%d_%H-%M")
LOG_PREFIX="[backup ${DATE}]"

# Variables d'environnement (injectées par Docker ou .env)
DB_HOST="${DB_HOST:-mysql}"
DB_NAME="${DB_NAME:-eventculture}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${MYSQL_ROOT_PASSWORD:-${DB_PASSWORD:-}}"

# ─── Fonctions ───────────────────────────────────────────────

log() {
  echo "${LOG_PREFIX} $1"
}

error() {
  echo "${LOG_PREFIX} ❌ ERREUR: $1" >&2
}

# Garde les KEEP_COUNT fichiers les plus récents correspondant au motif
rotate() {
  local pattern="$1"
  # shellcheck disable=SC2012
  # "|| true" : aucun fichier ne doit pas être une erreur (pipefail)
  { ls -1t ${BACKUP_DIR}/${pattern} 2>/dev/null || true; } | tail -n +"$((KEEP_COUNT + 1))" | while read -r old; do
    rm -f -- "$old"
  done
}

# ─── Vérifications ───────────────────────────────────────────

if [ -z "${DB_PASSWORD}" ]; then
  error "Mot de passe MySQL non défini (MYSQL_ROOT_PASSWORD ou DB_PASSWORD)"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

# Identifiants dans un fichier temporaire (pas sur la ligne de commande : visible dans ps)
CNF="$(mktemp)"
chmod 600 "${CNF}"
trap 'rm -f "${CNF}" "${BACKUP_DIR}"/*.partial' EXIT
printf '[client]\nuser=%s\npassword=%s\nhost=%s\n' "${DB_USER}" "${DB_PASSWORD}" "${DB_HOST}" > "${CNF}"

# ─── 1. Dump MySQL ──────────────────────────────────────────

DUMP_FILE="${BACKUP_DIR}/db_${DATE}.sql.gz"
ERR_FILE="${BACKUP_DIR}/last_mysqldump.err"

log "Dump MySQL '${DB_NAME}' → ${DUMP_FILE}"

# Pipeline dans un "if" : pipefail donne le bon statut (mysqldump OU gzip en échec)
if mysqldump \
     --defaults-extra-file="${CNF}" \
     --databases "${DB_NAME}" \
     --add-drop-database \
     --add-drop-table \
     --routines \
     --triggers \
     --single-transaction \
     --quick \
     2>"${ERR_FILE}" | gzip > "${DUMP_FILE}.partial" \
   && gzip -t "${DUMP_FILE}.partial" \
   && zcat "${DUMP_FILE}.partial" | tail -n 1 | grep -q 'Dump completed'; then
  mv "${DUMP_FILE}.partial" "${DUMP_FILE}"
  log "✅ Dump MySQL OK ($(du -h "${DUMP_FILE}" | cut -f1))"
else
  error "Dump MySQL échoué : $(tail -n 3 "${ERR_FILE}" 2>/dev/null | tr '\n' ' ')"
  exit 1
fi

# ─── 2. Backup uploads ─────────────────────────────────────

UPLOADS_DIR="/app/uploads"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${DATE}.tar.gz"

if [ -d "${UPLOADS_DIR}" ] && [ -n "$(ls -A "${UPLOADS_DIR}" 2>/dev/null)" ]; then
  log "Backup uploads → ${UPLOADS_FILE}"
  if tar -czf "${UPLOADS_FILE}.partial" -C /app uploads && [ -s "${UPLOADS_FILE}.partial" ]; then
    mv "${UPLOADS_FILE}.partial" "${UPLOADS_FILE}"
    log "✅ Backup uploads OK ($(du -h "${UPLOADS_FILE}" | cut -f1))"
  else
    # Non bloquant : la base est l'élément critique (les médias sont sur Cloudinary)
    error "Backup uploads échoué"
  fi
else
  log "ℹ️ Pas d'uploads à sauvegarder"
fi

# ─── 3. Rotation — garder les N dernières sauvegardes réussies ──
# (par nombre et non par âge : si les dumps échouent plusieurs jours,
#  les dernières bonnes sauvegardes ne sont pas supprimées)

rotate "db_*.sql.gz"
rotate "uploads_*.tar.gz"

REMAINING=$({ ls "${BACKUP_DIR}"/*.gz 2>/dev/null || true; } | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1 || true)
log "✅ Backup terminé — ${REMAINING} fichiers, ${TOTAL_SIZE} total"
