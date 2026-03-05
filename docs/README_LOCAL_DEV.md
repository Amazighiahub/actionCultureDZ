# 📚 Guide d'Installation et d'Utilisation Locale - EventCulture

> **Pour les étudiants et développeurs** qui veulent tester le projet sur leur ordinateur local sans Docker

## 🎯 Objectif

Ce guide vous permet de :
- Cloner le projet EventCulture
- Installer toutes les dépendances
- Configurer la base de données locale
- Lancer le backend et frontend
- Tester toutes les fonctionnalités

---

## 📋 Prérequis

### Logiciels Requis
- **Node.js** (version 18 ou supérieure)
- **npm** (vient avec Node.js)
- **MySQL** (version 8.0 recommandée)
- **Git**
- **VS Code** ou un autre éditeur de code

### Vérification des Prérequis
```bash
# Vérifier Node.js
node --version  # Doit afficher v18.x.x ou supérieur

# Vérifier npm
npm --version   # Doit afficher 9.x.x ou supérieur

# Vérifier MySQL
mysql --version  # Doit afficher MySQL 8.x.x

# Vérifier Git
git --version   # Doit afficher 2.x.x ou supérieur
```

---

## 🚀 Étape 1: Clonage du Projet

### 1.1 Cloner le Repository
```bash
# Ouvrir un terminal/cmd
cd C:\Users\votre-nom\Documents  # ou votre dossier de travail

# Cloner le projet
git clone https://github.com/Amazighiahub/actionCultureDZ.git

# Entrer dans le dossier du projet
cd actionCultureDZ
```

### 1.2 Vérifier la Structure
```bash
# Vous devriez voir cette structure
ls
# backend/  frontEnd/  docs/  docker-compose.yml  README.md
```

---

## 🗄️ Étape 2: Configuration de la Base de Données

### 2.1 Installer MySQL
Si MySQL n'est pas installé :
1. **Télécharger MySQL** : https://dev.mysql.com/downloads/mysql/
2. **Installer** avec les options par défaut
3. **Noter le mot de passe root** pendant l'installation

### 2.2 Créer la Base de Données
```bash
# Se connecter à MySQL
mysql -u root -p

# Créer la base de données
CREATE DATABASE actionculture;

# Créer un utilisateur dédié (recommandé)
CREATE USER 'actionculture_user'@'localhost' IDENTIFIED BY 'password123';

# Donner les permissions
GRANT ALL PRIVILEGES ON actionculture.* TO 'actionculture_user'@'localhost';
FLUSH PRIVILEGES;

# Quitter MySQL
EXIT;
```

### 2.3 Importer les Données de Test
```bash
# Aller dans le dossier backend
cd backend

# Importer le fichier de données de test (s'il existe)
mysql -u actionculture_user -p actionculture < database/init.sql

# Si le fichier n'existe pas, les tables seront créées automatiquement au démarrage
```

---

## ⚙️ Étape 3: Configuration du Backend

### 3.1 Installer les Dépendances Backend
```bash
# Dans le dossier backend
cd backend

# Installer toutes les dépendances
npm install

# Vérifier l'installation
npm list --depth=0
```

### 3.2 Configurer les Variables d'Environnement
```bash
# Copier le fichier d'exemple
copy .env.example .env

# Éditer le fichier .env avec un éditeur de texte
notepad .env
```

**Contenu du fichier `.env` à configurer :**
```env
# Environnement
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Base de données
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=password123
DB_HOST=localhost
DB_PORT=3306

# JWT (garder la valeur par défaut pour le développement)
JWT_SECRET=dev-secret-key-only-for-development
JWT_EXPIRES_IN=24h

# URLs locales
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Email (optionnel pour le développement)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe
EMAIL_FROM=noreply@localhost
EMAIL_PAUSED=true  # Mettre à true pour ne pas envoyer d'emails

# Autres configurations (garder les valeurs par défaut)
BCRYPT_ROUNDS=10
DEFAULT_LANGUAGE=fr
SUPPORTED_LANGUAGES=fr,ar,en
DEFAULT_TIMEZONE=Africa/Algiers
```

### 3.3 Générer un Secret JWT (Optionnel)
```bash
# Générer un secret plus sécurisé
node scripts/generateSecret.js

# Copier le secret généré dans votre .env
```

---

## 🎨 Étape 4: Configuration du Frontend

### 4.1 Installer les Dépendances Frontend
```bash
# Aller dans le dossier frontend
cd ../frontEnd

# Installer toutes les dépendances
npm install

# Vérifier l'installation
npm list --depth=0
```

### 4.2 Configurer l'API URL
Le frontend est déjà configuré pour se connecter au backend local (`http://localhost:3001`).

---

## 🚀 Étape 5: Démarrage des Applications

### 5.1 Démarrer le Backend
```bash
# Dans le dossier backend
cd backend

# Démarrer le serveur backend
npm start

# Vous devriez voir :
# 🚀 Démarrage du serveur Action Culture...
# ✅ Validation des variables d'environnement réussie
# 📋 RAPPORT DE CONFIGURATION
# Environnement: development
# Port: 3001
# Base de données: localhost/actionculture
# 🗄️ Base de données connectée avec succès
# 🌐 Serveur démarré sur http://0.0.0.0:3001
```

### 5.2 Démarrer le Frontend (dans un autre terminal)
```bash
# Ouvrir un NOUVEAU terminal
cd C:\Users\votre-nom\Documents\actionCultureDZ\frontEnd

# Démarrer le serveur frontend
npm run dev

# Vous devriez voir :
#   VITE v7.3.1  ready in 500 ms
# 
#   ➜  Local:   http://localhost:8080/
#   ➜  Network: http://192.168.1.100:8080/
#   ➜  press h + enter to show help
```

---

## 🌐 Étape 6: Accès à l'Application

### 6.1 URLs d'Accès
- **Frontend** : http://localhost:8080
- **Backend API** : http://localhost:3001
- **API Documentation** : http://localhost:3001/api

### 6.2 Vérifier le Fonctionnement
```bash
# Tester le backend
curl http://localhost:3001/health

# Réponse attendue :
# {"status":"healthy","environment":"development","version":"1.0.0"}
```

---

## 👤 Étape 7: Création d'un Compte Utilisateur

### 7.1 S'inscrire sur l'Application
1. **Ouvrir** http://localhost:8080 dans votre navigateur
2. **Cliquer** sur "S'inscrire" ou "Register"
3. **Remplir** le formulaire :
   - Email : `test@example.com`
   - Nom : `Test User`
   - Mot de passe : `password123`
4. **Valider** l'inscription

### 7.2 Se Connecter
1. **Utiliser** les mêmes identifiants pour vous connecter
2. **Explorer** les différentes fonctionnalités

---

## 🧪 Étape 8: Tester les Fonctionnalités

### 8.1 Pages Principales à Tester
- **Page d'accueil** : http://localhost:8080/
- **Événements** : http://localhost:8080/evenements
- **Patrimoine** : http://localhost:8080/patrimoine
- **Œuvres** : http://localhost:8080/oeuvres
- **Artisanat** : http://localhost:8080/artisanat

### 8.2 Fonctionnalités à Tester
- ✅ **Navigation** entre les pages
- ✅ **Recherche** d'événements/patrimoine
- ✅ **Inscription** et **connexion**
- ✅ **Carte interactive** du patrimoine
- ✅ **Parcours intelligent**
- ✅ **Upload** de fichiers (images)

### 8.3 Tester l'API Directement
```bash
# Lister les événements
curl http://localhost:3001/api/evenements

# Lister les sites patrimoniaux
curl http://localhost:3001/api/patrimoine

# Lister les œuvres
curl http://localhost:3001/api/oeuvres
```

---

## 🔧 Étape 9: Dépannage Commun

### 9.1 Problèmes Fréquents

#### "EACCES: permission denied"
```bash
# Solution : Exécuter en administrateur ou changer de port
# Dans .env, changer PORT=3002
```

#### "Cannot connect to MySQL"
```bash
# Vérifier que MySQL est démarré
# Windows : Services → MySQL → Démarrer

# Vérifier les identifiants dans .env
mysql -u actionculture_user -p actionculture
```

#### "Port déjà utilisé"
```bash
# Trouver le processus qui utilise le port
netstat -ano | findstr :3001

# Tuer le processus
taskkill /PID <numero_du_processus> /F
```

#### "Module not found"
```bash
# Réinstaller les dépendances
cd backend && npm install
cd ../frontEnd && npm install
```

### 9.2 Logs Utiles

#### Backend Logs
```bash
# Dans le terminal backend, vous voyez les logs en temps réel
# Erreurs de connexion DB, requêtes API, etc.
```

#### Frontend Logs
```bash
# Ouvrir les outils de développement (F12) dans le navigateur
# Voir l'onglet "Console" pour les erreurs JavaScript
```

---

## Étape 10: Chargement des Données de Test

### 10.1 Option 1: Script Automatique (Recommandé)
```bash
# Dans le dossier backend/seeds
cd backend/database/seeds

# Exécuter le script de chargement
load-test-data-mysql.bat
```

### 10.2 Option 2: Manuellement
```bash
# Se connecter à MySQL
mysql -u actionculture_user -p actionculture

# Copier-coller les requêtes SQL depuis backend/database/seeds/test-data-mysql.sql
```

### 10.3 Données de Test Inclues

#### Œuvres et Patrimoine
- **5 lieux patrimoniaux** (Casbah d'Alger, Musée National, Timgad, etc.)
- **5 œuvres d'art** (vases, peintures, sculptures, photos)
- **5 événements culturels** (festivals, expositions, ateliers)

#### Utilisateurs de Test
- **Admin** : `admin@test.com` / `admin123`
- **User** : `user@test.com` / `user123`  
- **Artisan** : `artisan@test.com` / `user123`

#### Données Géographiques
- **5 wilayas** (Alger, Oran, Tizi Ouzou, Constantine, Batna)
- **Types de lieux** (monuments, musées, sites archéologiques)
- **Coordonnées GPS** pour la carte interactive

#### Contenu Interactif
- **Commentaires** sur les œuvres
- **Types d'événements** (festivals, conférences, ateliers)
- **Types d'œuvres** (peinture, sculpture, artisanat, etc.)

### 10.4 Vérification des Données
```bash
# Vérifier que les données sont bien chargées
mysql -u actionculture_user -p actionculture

# Compter les enregistrements
SELECT COUNT(*) as total FROM evenements;     -- Doit afficher 5
SELECT COUNT(*) as total FROM lieux;          -- Doit afficher 5  
SELECT COUNT(*) as total FROM oeuvres;         -- Doit afficher 5
SELECT COUNT(*) as total FROM users;          -- Doit afficher 3
```

---

## Étape 11: Tester les Fonctionnalités

### 11.1 Tester le Parcours Intelligent
1. **Aller** sur la page d'un événement
2. **Cliquer** sur "Générer un parcours"
3. **Configurer** les options (rayon, types de sites, etc.)
4. **Voir** le parcours généré sur la carte

### 11.2 Tester l'Upload
1. **Se connecter** avec un compte utilisateur
2. **Aller** sur une page d'édition
3. **Uploader** une image pour tester
4. **Vérifier** que l'image s'affiche correctement

### 11.3 Tester l'Admin (si disponible)
1. **Se connecter** avec un compte admin
2. **Accéder** au dashboard admin
3. **Tester** les fonctionnalités de gestion

---

## 🔄 Étape 12: Mettre à Jour le Projet

### 12.1 Récupérer les Mises à Jour
```bash
# Dans le dossier du projet
git pull origin develop

# Mettre à jour les dépendances
cd backend && npm install
cd ../frontEnd && npm install
```

### 12.2 Redémarrer après Mise à Jour
```bash
# Arrêter les serveurs (Ctrl+C dans chaque terminal)
# Redémarrer :
npm start    # Backend
npm run dev  # Frontend
```

---

## 📝 Résumé Rapide

```bash
# 1. Cloner
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ

# 2. Configurer MySQL
mysql -u root -p
CREATE DATABASE actionculture;
CREATE USER 'actionculture_user'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON actionculture.* TO 'actionculture_user'@'localhost';

# 3. Installer backend
cd backend
npm install
copy .env.example .env
# Éditer .env avec les identifiants MySQL

# 4. Installer frontend
cd ../frontEnd
npm install

# 5. Démarrer
cd ../backend && npm start
# Dans un autre terminal :
cd ../frontEnd && npm run dev

# 6. Accéder
# Frontend : http://localhost:8080
# Backend : http://localhost:3001
```

---

## 🆘 Besoin d'Aide ?

### Ressources Utiles
- **Documentation complète** : `docs/` dossier du projet
- **Issues GitHub** : https://github.com/Amazighiahub/actionCultureDZ/issues
- **Guide de production** : `PRODUCTION.md` (backend)

### Commandes Utiles
```bash
# Vérifier l'état du projet
git status

# Voir les logs d'erreur
npm run lint

# Nettoyer les dépendances
rm -rf node_modules package-lock.json && npm install
```

---

**🎉 Félicitations !** Vous pouvez maintenant tester EventCulture localement et explorer toutes ses fonctionnalités !

---

*Dernière mise à jour : 28 janvier 2026*  
*Pour toute question, créer une issue sur le repository GitHub*
