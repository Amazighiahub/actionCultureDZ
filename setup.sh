#!/bin/bash
# ============================================
# 🚀 SCRIPT DE SETUP (pour les collègues)
# Lance tout le projet en une seule commande
# Usage : ./setup.sh
# ============================================

set -e

echo "🚀 Installation du projet..."
echo ""

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé !"
    echo "   Installe-le ici : https://docs.docker.com/get-docker/"
    exit 1
fi

# Vérifier que docker-compose est disponible
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas disponible !"
    exit 1
fi

# Vérifier le fichier .env
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant !"
    echo "   Copie le fichier exemple : cp .env.example .env"
    exit 1
fi

echo "📦 Construction des conteneurs..."
docker compose build

echo ""
echo "🔄 Démarrage des conteneurs..."
docker compose up -d --build

echo ""
echo "⏳ Attente que MySQL soit prêt..."
sleep 10

echo ""
echo "✅ Tout est prêt !"
echo ""
echo "   🌐 Frontend     : http://localhost:3000"
echo "   🔌 Backend API  : http://localhost:3001/api"
echo "   ❤️  Health API   : http://localhost:3001/health"
echo "   🗄️  MySQL        : localhost:3306"
echo ""
echo "📋 Commandes utiles :"
echo "   docker compose up -d     → Démarrer"
echo "   docker compose down      → Arrêter"
echo "   docker compose logs -f   → Voir les logs"
echo "   ./dump.sh                → Exporter la base"
echo "   ./restore.sh             → Réimporter la base"
