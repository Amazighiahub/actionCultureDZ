#!/bin/sh
set -e

# Dossiers requis par uploadService.js (doit être exécuté en root pour chown)
UPLOAD_DIR="/app/uploads"
for subdir in images documents videos audios oeuvres oeuvres/images oeuvres/videos oeuvres/audios oeuvres/documents profiles temp; do
  mkdir -p "$UPLOAD_DIR/$subdir"
done
chown -R node:node "$UPLOAD_DIR"

# Lancer l'app en tant qu'utilisateur node
exec su-exec node "$@"
