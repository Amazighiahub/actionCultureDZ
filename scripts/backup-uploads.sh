#!/bin/bash
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
UPLOADS_DIR="backend/uploads"

mkdir -p "$BACKUP_DIR"

if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" "$UPLOADS_DIR"
  echo "Uploads backed up to $BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

  # Keep last 10 backups
  ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
  echo "Old upload backups cleaned"
else
  echo "No uploads directory found"
fi
