#!/bin/bash
# ============================================================
# run-seeds-mysql.sh - Setup complet: seeds + DB_SYNC=false
# ============================================================
# Usage:
#   bash backend/database/seeds/run-seeds-mysql.sh
#   ou depuis la racine du projet: make seed
#
# Ce script:
#   1. Attend que MySQL soit prêt
#   2. Charge les données de référence
#   3. Met DB_SYNC=false dans les .env (tables déjà créées)
#   4. Redémarre le backend
# ============================================================

set -e

CONTAINER="eventculture-mysql"
BACKEND_CONTAINER="eventculture-backend"
DB_NAME="${DB_NAME:-actionculture}"
ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"

# Chemin absolu vers la racine du projet (2 niveaux au-dessus de seeds/)
PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SEEDS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "============================================"
echo "  EventCulture - Chargement des seeds MySQL"
echo "============================================"
echo ""

# --- Vérifier que Docker est actif ---
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas démarré."
    exit 1
fi

# --- Vérifier que le conteneur MySQL tourne ---
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "❌ Conteneur '${CONTAINER}' non trouvé ou arrêté."
    echo "   Lancez d'abord: docker compose up -d"
    exit 1
fi

# --- Attendre que MySQL soit prêt ---
echo "⏳ Attente que MySQL soit prêt..."
RETRIES=30
until docker exec "${CONTAINER}" mysqladmin ping \
    -h localhost -u root -p"${ROOT_PASSWORD}" \
    --silent 2>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        echo "❌ MySQL ne répond pas après 30 tentatives."
        exit 1
    fi
    echo "   ... attente (${RETRIES} essais restants)"
    sleep 2
done
echo "✅ MySQL est prêt."

# --- Attendre que le backend ait créé les tables (DB_SYNC=true) ---
echo ""
echo "⏳ Attente que le backend crée les tables (DB_SYNC=true)..."
RETRIES=60
until curl -sf http://localhost:3001/health > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        echo "❌ Backend non disponible après 60 tentatives."
        echo "   Vérifiez les logs: docker compose logs backend"
        exit 1
    fi
    echo "   ... attente backend (${RETRIES} essais restants)"
    sleep 3
done
echo "✅ Backend prêt - tables créées par Sequelize."

# --- Fonction: chargement obligatoire (arrête si erreur) ---
run_sql_required() {
    local file="$1"
    local label="$2"
    if [ -f "$file" ]; then
        echo ""
        echo "🌱 Chargement: ${label}..."
        if docker exec -i "${CONTAINER}" mysql \
            -u root -p"${ROOT_PASSWORD}" \
            --default-character-set=utf8mb4 \
            "${DB_NAME}" < "$file" 2>&1 | grep -v "Warning"; then
            echo "   ✅ OK"
        else
            echo "   ❌ Erreur lors du chargement de ${label}"
            exit 1
        fi
    else
        echo "   ⚠️  Fichier non trouvé: ${file} (ignoré)"
    fi
}

# --- Fonction: chargement optionnel (continue si erreur) ---
run_sql_optional() {
    local file="$1"
    local label="$2"
    if [ -f "$file" ]; then
        echo ""
        echo "🌱 Chargement optionnel: ${label}..."
        result=$(docker exec -i "${CONTAINER}" mysql \
            -u root -p"${ROOT_PASSWORD}" \
            --default-character-set=utf8mb4 \
            "${DB_NAME}" < "$file" 2>&1)
        if echo "$result" | grep -q "ERROR"; then
            echo "   ⚠️  Ignoré (tables incompatibles): $label"
            echo "      Erreur: $(echo "$result" | grep ERROR | head -1)"
        else
            echo "   ✅ OK"
        fi
    else
        echo "   ⚠️  Fichier non trouvé: ${file} (ignoré)"
    fi
}

echo ""
echo "--- Chargement des données ---"

# Données de référence: OBLIGATOIRES
run_sql_required "${SEEDS_DIR}/seed-reference-data.sql" "Données de référence (catégories, genres, wilayas...)"

# NOTE: Les anciens seeds (artisanat-seeds.sql, users-exposition.sql,
# exposition-art-contemporain.sql) utilisent des noms de tables incompatibles
# avec les modèles Sequelize actuels. Ils ne sont pas chargés automatiquement.

# --- Résumé ---
echo ""
echo "============================================"
echo "  Résumé des données insérées"
echo "============================================"
docker exec "${CONTAINER}" mysql \
    -u root -p"${ROOT_PASSWORD}" \
    --default-character-set=utf8mb4 \
    "${DB_NAME}" \
    -e "
SELECT 'role'            AS \`table\`, COUNT(*) AS lignes FROM role            UNION ALL
SELECT 'type_user',                   COUNT(*)           FROM type_user        UNION ALL
SELECT 'type_oeuvre',                 COUNT(*)           FROM type_oeuvre      UNION ALL
SELECT 'type_evenement',              COUNT(*)           FROM type_evenement   UNION ALL
SELECT 'genre',                       COUNT(*)           FROM genre            UNION ALL
SELECT 'categorie',                   COUNT(*)           FROM categorie        UNION ALL
SELECT 'langue',                      COUNT(*)           FROM langue           UNION ALL
SELECT 'materiau',                    COUNT(*)           FROM materiau         UNION ALL
SELECT 'technique',                   COUNT(*)           FROM technique        UNION ALL
SELECT 'editeur',                     COUNT(*)           FROM editeur          UNION ALL
SELECT 'tagmotcle',                   COUNT(*)           FROM tagmotcle        UNION ALL
SELECT 'specialites',                 COUNT(*)           FROM specialites      UNION ALL
SELECT 'typeorganisation',            COUNT(*)           FROM typeorganisation  UNION ALL
SELECT 'wilayas',                     COUNT(*)           FROM wilayas          UNION ALL
SELECT 'dairas',                      COUNT(*)           FROM dairas;
" 2>/dev/null

# ============================================================
# IMPORTANT: Désactiver DB_SYNC=true → false
# Les tables sont créées, on n'a plus besoin de sync au démarrage
# ============================================================
echo ""
echo "🔧 Passage de DB_SYNC=true → DB_SYNC=false dans les .env..."

ENV_ROOT="${PROJECT_ROOT}/.env"
ENV_BACKEND="${PROJECT_ROOT}/backend/.env"

if [ -f "$ENV_ROOT" ]; then
    sed -i 's/^DB_SYNC=true/DB_SYNC=false/' "$ENV_ROOT"
    echo "   ✅ ${ENV_ROOT}"
fi

if [ -f "$ENV_BACKEND" ]; then
    sed -i 's/^DB_SYNC=true/DB_SYNC=false/' "$ENV_BACKEND"
    echo "   ✅ ${ENV_BACKEND}"
fi

# --- Redémarrer le backend pour prendre en compte DB_SYNC=false ---
echo ""
echo "🔄 Redémarrage du backend (DB_SYNC=false maintenant)..."
docker compose -f "${PROJECT_ROOT}/docker-compose.yml" restart backend 2>/dev/null || \
    docker restart "${BACKEND_CONTAINER}" 2>/dev/null || \
    echo "   ⚠️  Redémarrage manuel requis: docker compose restart backend"

echo ""
echo "============================================"
echo "  🎉 Setup terminé avec succès !"
echo "============================================"
echo ""
echo "  Frontend : http://localhost:3000"
echo "  API      : http://localhost:3001"
echo "  Health   : http://localhost:3001/health"
echo ""
echo "  DB_SYNC  : false (tables déjà créées)"
echo ""
