# 🚀 Guide Rapide - EventCulture (Étudiants)

> Installation et test rapide du projet en 5 minutes

---

## ⚡ Installation Express

### 1️⃣ Cloner le Projet
```bash
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ
```

### 2️⃣ Installation Automatique (Windows)
```bash
# Double-cliquer sur le fichier
setup-local.bat
```

### 3️⃣ Installation Manuelle
```bash
# Backend
cd backend
npm install
copy .env.example .env

# Frontend  
cd ../frontEnd
npm install
```

---

## 🗄️ Base de Données MySQL

### Créer la Base (une seule fois)
```sql
mysql -u root -p

CREATE DATABASE actionculture;
CREATE USER 'actionculture_user'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON actionculture.* TO 'actionculture_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 🚀 Démarrage

### Terminal 1 - Backend
```bash
cd backend
npm start
```

### Terminal 2 - Frontend
```bash
cd frontEnd
npm run dev
```

---

## 🌐 Accès

- **Application** : http://localhost:8080
- **API** : http://localhost:3001
- **Health Check** : http://localhost:3001/health

---

## 👤 Premier Utilisateur

1. **Ouvrir** http://localhost:8080
2. **Cliquer** sur "S'inscrire"
3. **Remplir** :
   - Email : `test@email.com`
   - Nom : `Test User`
   - Mot de passe : `password123`
4. **Se connecter** avec ces identifiants

---

## 🧪 Tests à Faire

### ✅ Pages Principales
- [ ] Page d'accueil
- [ ] Événements
- [ ] Patrimoine
- [ ] Œuvres
- [ ] Artisanat

### ✅ Fonctionnalités
- [ ] Navigation
- [ ] Recherche
- [ ] Carte interactive
- [ ] Inscription/Connexion
- [ ] Upload images

---

## 🔧 Problèmes Communs

### "Port déjà utilisé"
```bash
# Changer le port dans backend\.env
PORT=3002
```

### "MySQL connection failed"
```bash
# Vérifier que MySQL est démarré
# Vérifier les identifiants dans .env
```

### "Module not found"
```bash
npm install  # dans backend et frontend
```

---

## 📚 Documentation Complète

Voir `README_LOCAL_DEV.md` pour :
- Installation détaillée
- Dépannage avancé
- Tests complets
- Données de test

---

## 🎯 Tips Pro

### Vérifier l'API
```bash
curl http://localhost:3001/health
```

### Voir les logs
- **Backend** : Terminal où vous avez lancé `npm start`
- **Frontend** : F12 → Console dans le navigateur

### Redémarrer après modification
```bash
# Ctrl+C dans chaque terminal
# Relancer npm start et npm run dev
```

---

**🎉 C'est prêt !** Testez maintenant toutes les fonctionnalités !

---

*Pour l'aide complète : `README_LOCAL_DEV.md`*
