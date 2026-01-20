@echo off
REM Script pour exécuter les seeds de la base de données (Windows)
REM Fichier: run-seeds.bat
REM Date: 2024-01-20

echo 🌱 Démarrage de l'exécution des seeds...

REM Vérifier si nous sommes dans le bon répertoire
if not exist "artisanat-seeds.sql" (
    echo ❌ Erreur: artisanat-seeds.sql non trouvé dans %CD%
    pause
    exit /b 1
)

REM Vérifier si PostgreSQL est disponible
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erreur: PostgreSQL n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer PostgreSQL et ajouter psql au PATH
    pause
    exit /b 1
)

REM Variables de connexion à la base de données
set DB_NAME=eventculture
set DB_USER=postgres
set DB_PASSWORD=password
set DB_HOST=localhost
set DB_PORT=5432

REM Vérifier si la base de données existe
echo 🔍 Vérification de la base de données %DB_NAME%...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt | findstr %DB_NAME% >nul
if %errorlevel% neq 0 (
    echo ❌ La base de données %DB_NAME% n'existe pas. Création de la base de données...
    createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
    if %errorlevel% neq 0 (
        echo ❌ Erreur lors de la création de la base de données
        pause
        exit /b 1
    )
    echo ✅ Base de données %DB_NAME% créée avec succès
)

REM Exécuter le script de seeds
echo 🌱 Exécution du script artisanat-seeds.sql...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f artisanat-seeds.sql

if %errorlevel% equ 0 (
    echo ✅ Seeds exécutés avec succès !
    echo.
    echo 📊 Résumé des données insérées :
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT (SELECT COUNT(*) FROM materiaux) as materiaux, (SELECT COUNT(*) FROM techniques) as techniques, (SELECT COUNT(*) FROM types_oeuvres) as types_oeuvres, (SELECT COUNT(*) FROM wilayas) as wilayas, (SELECT COUNT(*) FROM users) as utilisateurs, (SELECT COUNT(*) FROM oeuvres) as oeuvres, (SELECT COUNT(*) FROM artisanats) as artisanats, (SELECT COUNT(*) FROM medias) as medias, (SELECT COUNT(*) FROM tags) as tags, (SELECT COUNT(*) FROM commentaires) as commentaires, (SELECT COUNT(*) FROM favoris) as favoris, (SELECT COUNT(*) FROM statistiques_artisanats) as statistiques_artisanats;"
) else (
    echo ❌ Erreur lors de l'exécution des seeds
    pause
    exit /b 1
)

echo.
echo 🎉 Opération terminée ! Les données de test sont maintenant dans la base de données.
pause
