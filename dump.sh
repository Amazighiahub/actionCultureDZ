#!/bin/bash
# ============================================
# 📦 SCRIPT DE DUMP AUTOMATIQUE
# Exporte la base MySQL du conteneur Docker
# Usage : ./dump.sh
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

# Créer le dossier de dumps s'il n'existe pas
mkdir -p backend/database/dumps

# Nom du fichier avec date
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DUMP_FILE="backend/database/dumps/dump_${DATE}.sql"
LATEST_FILE="backend/database/init.sql"

echo "🔄 Dump de la base '${DB_NAME}' en cours..."

# Faire le dump depuis le conteneur MySQL
docker exec "${MYSQL_CONTAINER}" mysqldump \
    -u root \
    -p"${MYSQL_ROOT_PASSWORD}" \
    --databases "${DB_NAME}" \
    --add-drop-database \
    --add-drop-table \
    --routines \
    --triggers \
    > "${DUMP_FILE}"

# Copier aussi en tant que init.sql (utilisé au premier lancement)
cp "${DUMP_FILE}" "${LATEST_FILE}"

echo "✅ Dump terminé !"
echo "   📄 Fichier daté  : ${DUMP_FILE}"
echo "   📄 Fichier init  : ${LATEST_FILE}"
echo ""
echo "💡 Pense à committer le fichier init.sql :"
echo "   git add backend/database/init.sql"
echo "   git commit -m 'Mise à jour du dump de la base'"
echo "   git push"
