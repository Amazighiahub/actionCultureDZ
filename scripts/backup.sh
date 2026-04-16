#!/bin/bash
# ============================================
# Backup automatique — Tala DZ
# ============================================
# Dump MySQL + uploads, compression gzip, rotation 7 jours
# Lancé chaque nuit à 3h par le service Docker "backup"
#
# Usage manuel : ./scripts/backup.sh
# ============================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
BACKUP_DIR="/backups"
KEEP_DAYS=7
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

# ─── Vérifications ───────────────────────────────────────────

if [ -z "${DB_PASSWORD}" ]; then
  error "Mot de passe MySQL non défini (MYSQL_ROOT_PASSWORD ou DB_PASSWORD)"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

# ─── 1. Dump MySQL ──────────────────────────────────────────

DUMP_FILE="${BACKUP_DIR}/db_${DATE}.sql.gz"

log "Dump MySQL '${DB_NAME}' → ${DUMP_FILE}"

mysqldump \
  -h "${DB_HOST}" \
  -u "${DB_USER}" \
  -p"${DB_PASSWORD}" \
  --databases "${DB_NAME}" \
  --add-drop-database \
  --add-drop-table \
  --routines \
  --triggers \
  --single-transaction \
  --quick \
  2>/dev/null | gzip > "${DUMP_FILE}"

if [ $? -eq 0 ] && [ -s "${DUMP_FILE}" ]; then
  SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
  log "✅ Dump MySQL OK (${SIZE})"
else
  error "Dump MySQL échoué ou fichier vide"
  rm -f "${DUMP_FILE}"
fi

# ─── 2. Backup uploads ─────────────────────────────────────

UPLOADS_DIR="/app/uploads"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${DATE}.tar.gz"

if [ -d "${UPLOADS_DIR}" ] && [ "$(ls -A ${UPLOADS_DIR} 2>/dev/null)" ]; then
  log "Backup uploads → ${UPLOADS_FILE}"
  tar -czf "${UPLOADS_FILE}" -C /app uploads 2>/dev/null

  if [ $? -eq 0 ] && [ -s "${UPLOADS_FILE}" ]; then
    SIZE=$(du -h "${UPLOADS_FILE}" | cut -f1)
    log "✅ Backup uploads OK (${SIZE})"
  else
    error "Backup uploads échoué"
    rm -f "${UPLOADS_FILE}"
  fi
else
  log "ℹ️ Pas d'uploads à sauvegarder"
fi

# ─── 3. Rotation — garder les N derniers jours ──────────────

log "Rotation : suppression des backups > ${KEEP_DAYS} jours"

find "${BACKUP_DIR}" -name "db_*.sql.gz" -mtime +${KEEP_DAYS} -delete 2>/dev/null
find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -mtime +${KEEP_DAYS} -delete 2>/dev/null

REMAINING=$(ls "${BACKUP_DIR}"/*.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "✅ Backup terminé — ${REMAINING} fichiers, ${TOTAL_SIZE} total"
