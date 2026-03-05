#!/bin/bash
# ============================================
# 🔁 SCRIPT DE RESTAURATION
# Réimporte le dump dans le conteneur MySQL
# Usage : ./restore.sh [fichier.sql]
# ============================================

set -e

# Charger les variables d'environnement depuis .env
if [ -f .env ]; then
    set -a
    . ./.env
    set +a
else
    echo "❌ Fichier .env introuvable !"
    exit 1
fi

# Vérifier les variables critiques
if [ -z "${DB_NAME:-}" ] || [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
    echo "❌ Variables DB_NAME ou MYSQL_ROOT_PASSWORD manquantes dans .env"
    exit 1
fi

# Récupérer le conteneur MySQL depuis docker compose
MYSQL_CONTAINER="${MYSQL_CONTAINER:-$(docker compose ps -q mysql)}"
if [ -z "${MYSQL_CONTAINER}" ]; then
    echo "❌ Conteneur MySQL introuvable. Lance d'abord: docker compose up -d"
    exit 1
fi

# Fichier SQL à restaurer (par défaut : backend/database/init.sql)
SQL_FILE="${1:-backend/database/init.sql}"

if [ ! -f "${SQL_FILE}" ]; then
    echo "❌ Fichier ${SQL_FILE} introuvable !"
    exit 1
fi

echo "🔄 Restauration de '${SQL_FILE}' dans la base '${DB_NAME}'..."

# Importer le dump dans le conteneur
docker exec -i "${MYSQL_CONTAINER}" mysql \
    -u root \
    -p"${MYSQL_ROOT_PASSWORD}" \
    "${DB_NAME}" \
    < "${SQL_FILE}"

echo "✅ Restauration terminée !"
echo "   La base '${DB_NAME}' est à jour."
