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

# Identifiants admin pour la validation post-seed
# Surcharger via: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... bash run-seeds-mysql.sh
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@actionculture.dz}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-}"

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

# --- Sécuriser le mot de passe admin (REQUIS en production) ---
# Le seed SQL contient un hash bcrypt du mot de passe par défaut.
# Cette étape le remplace par un mot de passe fort fourni par l'opérateur.
echo ""
if [ "${NODE_ENV}" = "production" ] && [ -z "${SEED_ADMIN_PASSWORD}" ]; then
    echo "❌ ERREUR: SEED_ADMIN_PASSWORD est obligatoire en production."
    echo "   Le seed SQL contient un mot de passe par défaut non sécurisé."
    echo "   Lancez: SEED_ADMIN_PASSWORD='<mot_de_passe_fort>' bash run-seeds-mysql.sh"
    exit 1
fi

if [ -n "${SEED_ADMIN_PASSWORD}" ]; then
    echo "🔐 Mise à jour du hash admin en base..."
    # Générer le hash bcrypt via Node.js dans le conteneur backend
    NEW_HASH=$(docker exec \
        -e "ADMIN_PW=${SEED_ADMIN_PASSWORD}" \
        "${BACKEND_CONTAINER}" \
        node -e "require('bcrypt').hash(process.env.ADMIN_PW, 12).then(h => process.stdout.write(h))" \
        2>/dev/null)
    if [ -z "${NEW_HASH}" ]; then
        echo "   ❌ Impossible de générer le hash (conteneur backend non disponible)"
        exit 1
    fi
    # Écrire le UPDATE dans un fichier tmp pour éviter les problèmes d'échappement
    TMPFILE=$(mktemp)
    printf "UPDATE user SET password='%s', doit_changer_mdp=0 WHERE email='%s';\n" \
        "${NEW_HASH}" "${ADMIN_EMAIL}" > "${TMPFILE}"
    docker exec -i "${CONTAINER}" mysql \
        -u root -p"${ROOT_PASSWORD}" \
        --default-character-set=utf8mb4 \
        "${DB_NAME}" < "${TMPFILE}" 2>/dev/null
    rm -f "${TMPFILE}"
    echo "   ✅ Mot de passe admin mis à jour pour ${ADMIN_EMAIL}"
else
    echo "⚠️  Mot de passe admin par défaut (seeds) — environnement de développement uniquement"
    echo "   Sur VPS: SEED_ADMIN_PASSWORD='<mdp_fort>' bash run-seeds-mysql.sh"
fi

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

# sed -i.bak + rm : compatible macOS (BSD sed) et Linux (GNU sed)
if [ -f "$ENV_ROOT" ]; then
    sed -i.bak 's/^DB_SYNC=true/DB_SYNC=false/' "$ENV_ROOT" && rm -f "${ENV_ROOT}.bak"
    echo "   ✅ ${ENV_ROOT}"
fi

if [ -f "$ENV_BACKEND" ]; then
    sed -i.bak 's/^DB_SYNC=true/DB_SYNC=false/' "$ENV_BACKEND" && rm -f "${ENV_BACKEND}.bak"
    echo "   ✅ ${ENV_BACKEND}"
fi

# --- Redémarrer le backend pour prendre en compte DB_SYNC=false ---
echo ""
echo "🔄 Redémarrage du backend (DB_SYNC=false maintenant)..."
docker compose -f "${PROJECT_ROOT}/docker-compose.yml" restart backend 2>/dev/null || \
    docker restart "${BACKEND_CONTAINER}" 2>/dev/null || \
    echo "   ⚠️  Redémarrage manuel requis: docker compose restart backend"

# --- Attendre que le backend soit de nouveau prêt ---
echo ""
echo "⏳ Attente du redémarrage du backend..."
sleep 5
RETRIES=30
until curl -sf http://localhost:3001/health > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        echo "   ⚠️  Backend non prêt après redémarrage (validation admin ignorée)"
        break
    fi
    sleep 2
done

# --- Validation des identifiants admin ---
if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    if [ -n "$ADMIN_PASSWORD" ]; then
        echo ""
        echo "🔐 Validation des identifiants admin..."
        ADMIN_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/users/login \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")
        if echo "$ADMIN_LOGIN_RESPONSE" | grep -q '"success":true'; then
            echo "   ✅ Admin OK : ${ADMIN_EMAIL}"
        else
            echo "   ❌ Échec connexion admin (email/mot de passe invalides ou utilisateur absent)"
            echo "      Vérifiez que seed-reference-data.sql a bien chargé l'utilisateur admin."
        fi
    else
        echo ""
        echo "ℹ️  Validation admin ignorée (SEED_ADMIN_PASSWORD non défini)"
        echo "   Pour valider: SEED_ADMIN_PASSWORD=<mdp> bash run-seeds-mysql.sh"
    fi
fi

echo ""
echo "============================================"
echo "  🎉 Setup terminé avec succès !"
echo "============================================"
echo ""
echo "  Frontend : http://localhost:3000"
echo "  API      : http://localhost:3001"
echo "  Health   : http://localhost:3001/health"
echo ""
echo "  Admin    : ${ADMIN_EMAIL} (mot de passe dans .env ou SEED_ADMIN_PASSWORD)"
echo "  DB_SYNC  : false (tables déjà créées)"
echo ""
