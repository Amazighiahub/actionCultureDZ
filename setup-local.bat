@echo off
echo ============================================
echo   EventCulture - Installation Locale Automatique
echo ============================================
echo.

REM Vérifier les prérequis
echo [1/6] Verification des prerequis...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installe. Installez Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm n'est pas installe.
    pause
    exit /b 1
)

mysql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ MySQL n'est pas detecte. Assurez-vous que MySQL est installe et demarre.
    echo.
    set /p continue="Continuer quand meme? (o/n): "
    if /i not "%continue%"=="o" exit /b 1
)

echo ✅ Prérequis verifies
echo.

REM Installation des dépendances backend
echo [2/6] Installation des dependances backend...
cd backend
if not exist node_modules (
    npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation des dependances backend
        pause
        exit /b 1
    )
    echo ✅ Dependances backend installees
) else (
    echo ✅ Dependances backend deja presentes
)

REM Configuration du fichier .env
echo [3/6] Configuration de l'environnement backend...
if not exist .env (
    copy .env.example .env >nul
    echo ✅ Fichier .env cree a partir de .env.example
    echo.
    echo ⚠️ IMPORTANT: Modifiez le fichier backend\.env avec vos identifiants MySQL:
    echo    - DB_USER=votre_utilisateur_mysql
    echo    - DB_PASSWORD=votre_mot_de_passe_mysql
    echo    - DB_NAME=actionculture
    echo.
    pause
) else (
    echo ✅ Fichier .env deja existant
)

REM Installation des dépendances frontend
echo [4/6] Installation des dependances frontend...
cd ..\frontEnd
if not exist node_modules (
    npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation des dependances frontend
        pause
        exit /b 1
    )
    echo ✅ Dependances frontend installees
) else (
    echo ✅ Dependances frontend deja presentes
)

REM Configuration de la base de données
echo [5/6] Configuration de la base de donnees...
echo.
echo ⚠️ Assurez-vous que MySQL est demarre et executez ces commandes:
echo.
echo mysql -u root -p
echo CREATE DATABASE actionculture;
echo CREATE USER 'actionculture_user'@'localhost' IDENTIFIED BY 'password123';
echo GRANT ALL PRIVILEGES ON actionculture.* TO 'actionculture_user'@'localhost';
echo FLUSH PRIVILEGES;
echo EXIT;
echo.
set /p dbready="Base de donnees configuree? (o/n): "
if /i not "%dbready%"=="o" (
    echo ❌ Configurez la base de donnees avant de continuer
    pause
    exit /b 1
)

echo ✅ Base de donnees configuree
echo.

REM Finalisation
echo [6/6] Finalisation...
cd ..
echo.
echo ============================================
echo           INSTALLATION TERMINEE !
echo ============================================
echo.
echo Prochaines etapes:
echo.
echo 1. Demarrer le backend:
echo    cd backend && npm start
echo.
echo 2. Dans un AUTRE terminal, demarrer le frontend:
echo    cd frontEnd && npm run dev
echo.
echo 3. Acceder a l'application:
echo    Frontend: http://localhost:8080
echo    Backend:  http://localhost:3001
echo.
echo 4. Creer un compte utilisateur sur http://localhost:8080
echo.
echo 📚 Documentation complete: README_LOCAL_DEV.md
echo.
echo Bon test ! 🎉
echo.
pause
