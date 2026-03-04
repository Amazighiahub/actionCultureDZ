#!/bin/bash

# Script pour exécuter les seeds de la base de données
# Fichier: run-seeds.sh
# Date: 2024-01-20

echo "🌱 Démarrage de l'exécution des seeds..."

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "artisanat-seeds.sql" ]; then
    echo "❌ Erreur: artisanat-seeds.sql non trouvé dans $(pwd)"
    exit 1
fi

# Vérifier si PostgreSQL est disponible
if ! command -v psql &> /dev/null; then
    echo "❌ Erreur: PostgreSQL n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Variables de connexion à la base de données
DB_NAME="eventculture"
DB_USER="postgres"
DB_PASSWORD="password"
DB_HOST="localhost"
DB_PORT="5432"

# Vérifier si la base de données existe
echo "🔍 Vérification de la base de données $DB_NAME..."
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | grep -q $DB_NAME; then
    echo "❌ La base de données $DB_NAME n'existe pas. Création de la base de données..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    echo "✅ Base de données $DB_NAME créée avec succès"
fi

# Exécuter le script de seeds
echo "🌱 Exécution du script artisanat-seeds.sql..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f artisanat-seeds.sql

if [ $? -eq 0 ]; then
    echo "✅ Seeds exécutés avec succès !"
    echo ""
    echo "📊 Résumé des données insérées :"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
      (SELECT COUNT(*) as materiaux FROM materiaux) as materiaux,
      (SELECT COUNT(*) as techniques FROM techniques) as techniques,
      (SELECT COUNT(*) as types_oeuvres FROM types_oeuvres) as types_oeuvres,
      (SELECT COUNT(*) as wilayas FROM wilayas) as wilayas,
      (SELECT COUNT(*) as utilisateurs FROM users) as utilisateurs,
      (SELECT COUNT(*) as oeuvres FROM oeuvres) as oeuvres,
      (SELECT COUNT(*) as artisanats FROM artisanats) as artisanats,
      (SELECT COUNT(*) as medias FROM medias) as medias,
      (SELECT COUNT(*) as tags FROM tags) as tags,
      (SELECT COUNT(*) as commentaires FROM commentaires) as commentaires,
      (SELECT COUNT(*) as favoris FROM favoris) as favoris,
      (SELECT COUNT(*) as statistiques_artisanats FROM statistiques_artisanats) as statistiques_artisanats;
    "
else
    echo "❌ Erreur lors de l'exécution des seeds"
    exit 1
fi

echo ""
echo "🎉 Opération terminée ! Les données de test sont maintenant dans la base de données."
