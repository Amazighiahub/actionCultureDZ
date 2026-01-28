@echo off
REM Script pour charger les données de test MySQL (Windows)
REM EventCulture - Données de test pour étudiants

echo 🌱 Chargement des données de test MySQL...

REM Vérifier si nous sommes dans le bon répertoire
if not exist "test-data-mysql.sql" (
    echo ❌ Erreur: test-data-mysql.sql non trouvé dans %CD%
    echo Création du fichier de données de test...
    call :createTestData
)

REM Variables de connexion à la base de données
set DB_NAME=actionculture
set DB_USER=actionculture_user
set DB_PASSWORD=password123
set DB_HOST=localhost
set DB_PORT=3306

echo 🔍 Connexion à la base de données %DB_NAME%...

REM Vérifier la connexion
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% -e "USE %DB_NAME%;" 2>nul
if errorlevel 1 (
    echo ❌ Erreur de connexion à la base de données
    echo Vérifiez que:
    echo 1. MySQL est démarré
    echo 2. La base de données %DB_NAME% existe
    echo 3. L'utilisateur %DB_USER% a les permissions
    pause
    exit /b 1
)

REM Exécuter le script de données de test
echo 🌱 Chargement des données de test...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < test-data-mysql.sql

if errorlevel 0 (
    echo ✅ Données de test chargées avec succès !
    echo.
    echo 📊 Résumé des données insérées :
    mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% -e "
    SELECT 
        (SELECT COUNT(*) FROM evenements) as evenements,
        (SELECT COUNT(*) FROM lieux) as lieux,
        (SELECT COUNT(*) FROM oeuvres) as oeuvres,
        (SELECT COUNT(*) FROM users) as utilisateurs,
        (SELECT COUNT(*) FROM wilayas) as wilayas;
    "
) else (
    echo ❌ Erreur lors du chargement des données de test
    pause
    exit /b 1
)

echo.
echo 🎉 Données de test chargées avec succès !
echo.
echo 👤 Utilisateurs de test:
echo    Email: admin@test.com / Mot de passe: admin123
echo    Email: user@test.com  / Mot de passe: user123
echo.
echo 🌐 Accès à l'application: http://localhost:8080
pause
goto :eof

:createTestData
echo -- Création du fichier de données de test MySQL
(
echo -- Données de test pour EventCulture - MySQL
echo -- Généré automatiquement pour les étudiants
echo.
echo -- Insérer des wilayas de test
echo INSERT IGNORE INTO wilayas ^(id_wilaya, nom_wilaya, code_wilaya^) VALUES
echo ^(1, 'Alger', '16'^),
echo ^(2, 'Oran', '31'^),
echo ^(3, 'Tizi Ouzou', '15'^),
echo ^(4, 'Constantine', '25'^),
echo ^(5, 'Batna', '5'^);
echo.
echo -- Insérer des types de lieux
echo INSERT IGNORE INTO types_lieux ^(id_type_lieu, nom_type^) VALUES
echo ^(1, 'Monument historique'^),
echo ^(2, 'Musée'^),
echo ^(3, 'Site archéologique'^),
echo ^(4, 'Mosquée'^),
echo ^(5, 'Casbah'^);
echo.
echo -- Insérer des lieux de test
echo INSERT IGNORE INTO lieux ^(id_lieu, nom, latitude, longitude, description, id_wilaya, id_type_lieu^) VALUES
echo ^(1, 'Casbah d''Alger', 36.7828, 3.0594, 'Ancienne médina d''Alger, site classé UNESCO', 1, 5^),
echo ^(2, 'Musée National des Beaux-Arts', 36.7528, 3.0420, 'Musée d''art algérien', 1, 2^),
echo ^(3, 'Timgad', 35.4833, 6.4667, 'Ancienne cité romaine', 5, 3^),
echo ^(4, 'Mosquée Ketchaoua', 36.7833, 3.0583, 'Mosquée historique d''Alger', 1, 4^),
echo ^(5, 'Palais des Raïs', 36.7811, 3.0611, 'Palais historique sur la mer', 1, 1^);
echo.
echo -- Insérer des types d'événements
echo INSERT IGNORE INTO types_evenements ^(id_type_evenement, nom_type^) VALUES
echo ^(1, 'Festival'^),
echo ^(2, 'Exposition'^),
echo ^(3, 'Conférence'^),
echo ^(4, 'Atelier'^),
echo ^(5, 'Visite guidée'^);
echo.
echo -- Insérer des événements de test
echo INSERT IGNORE INTO evenements ^(nom_evenement, date_debut, date_fin, description, id_lieu, id_type_evenement, id_user_createur^) VALUES
echo ^('Festival de la Casbah', '2024-06-15 10:00:00', '2024-06-17 18:00:00', 'Festival annuel célébrant la culture de la Casbah', 1, 1, 1^),
echo ^('Exposition Art Berbère', '2024-07-01 09:00:00', '2024-07-15 18:00:00', 'Exposition d''art berbère traditionnel', 2, 2, 1^),
echo ^('Journées Patrimoine', '2024-09-20 08:00:00', '2024-09-22 20:00:00', 'Visites gratuites des sites patrimoniaux', 3, 5, 2^),
echo ^('Conférence Histoire Alger', '2024-08-10 14:00:00', '2024-08-10 17:00:00', 'Conférence sur l''histoire d''Alger', 4, 3, 1^),
echo ^('Atelier Calligraphie', '2024-07-20 10:00:00', '2024-07-20 16:00:00', 'Atelier d''initiation à la calligraphie arabe', 5, 4, 2^);
echo.
echo -- Insérer des types d'œuvres
echo INSERT IGNORE INTO types_oeuvres ^(id_type_oeuvre, nom_type^) VALUES
echo ^(1, 'Peinture'^),
echo ^(2, 'Sculpture'^),
echo ^(3, 'Artisanat'^),
echo ^(4, 'Photographie'^),
echo ^(5, 'Art numérique'^);
echo.
echo -- Insérer des œuvres de test
echo INSERT IGNORE INTO oeuvres ^(titre, description, id_type_oeuvre, id_user_createur, id_lieu, date_creation^) VALUES
echo ^('Vase Berbère', 'Vase traditionnel décoré de motifs berbères', 3, 1, 1, '2024-01-15'^),
echo ^('Portrait Kasbah', 'Photographie de la Casbah au coucher du soleil', 4, 2, 1, '2024-02-20'^),
echo ^('Sculpture Timgad', 'Sculpture inspirée des ruines de Timgad', 2, 1, 3, '2024-03-10'^),
echo ^('Peinture Méditerranée', 'Peinture représentant la côte méditerranéenne', 1, 2, 2, '2024-04-05'^),
echo ^('Art Numérique Casbah', 'Création numérique de la Casbah', 5, 1, 1, '2024-05-12'^);
echo.
echo -- Insérer des utilisateurs de test
echo INSERT IGNORE INTO users ^(nom, email, password, role, date_creation^) VALUES
echo ^('Admin Test', 'admin@test.com', '$2b$10$rQ8kGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGW', 'admin', NOW()^),
echo ^('User Test', 'user@test.com', '$2b$10$rQ8kGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGW', 'user', NOW()^),
echo ^('Artisan Test', 'artisan@test.com', '$2b$10$rQ8kGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGWZjGW', 'artisan', NOW()^);
echo.
echo -- Insérer des commentaires
echo INSERT IGNORE INTO commentaires ^(contenu, id_user, id_oeuvre, date_creation^) VALUES
echo ^('Magnifique œuvre !', 1, 1, NOW()^),
echo ^('Très belle photographie', 2, 2, NOW()^),
echo ^('Sculpture impressionnante', 1, 3, NOW()^),
echo ^('Couleurs magnifiques', 2, 4, NOW()^),
echo ^('Art moderne intéressant', 1, 5, NOW()^);
echo.
) > test-data-mysql.sql
echo ✅ Fichier test-data-mysql.sql créé
goto :eof
