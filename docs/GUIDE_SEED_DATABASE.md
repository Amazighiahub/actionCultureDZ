# Guide de Génération des Données de Test

## 🚀 Commande Rapide (Script Unifié)

```bash
cd backend
node scripts/seed-all-data.js
```

Ce script unique génère **TOUTES** les données de test en une seule commande :
- ✅ Utilisateurs et rôles
- ✅ Événements et programmes
- ✅ Participants aux événements
- ✅ Œuvres (livres, films, albums, artisanat)
- ✅ Lieux patrimoniaux
- ✅ Classifications (genres, catégories, langues...)

---

## Prérequis

1. **MySQL** installé et en cours d'exécution
2. **Node.js** (version 14+)
3. Base de données `actionculture` créée
4. Fichier `.env` configuré dans le dossier `backend/`

### Configuration du fichier .env

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=actionculture
DB_USER=root
DB_PASSWORD=root
NODE_ENV=development
```

---

## Étapes pour remplir la base de données

### Étape 1 : Installer les dépendances

```bash
cd backend
npm install
```

### Étape 2 : Créer la base de données (si elle n'existe pas)

```sql
CREATE DATABASE IF NOT EXISTS actionculture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Étape 3 : Synchroniser les tables (créer la structure)

Lancez le serveur une première fois pour créer les tables :

```bash
cd backend
npm start
```

Arrêtez le serveur après que les tables soient créées (Ctrl+C).

---

## Étape 4 : Exécuter les scripts de seed

### Option A : Seed complet (Recommandé)

Exécutez les scripts dans cet ordre :

```bash
cd backend

# 1. Données de base (rôles, utilisateurs, types, lieux, événements)
node scripts/seedDatabaseEvent.js

# 2. Œuvres culturelles (livres, films, albums, artisanat, articles)
node scripts/seed-database.js
```

### Option B : Seed minimal (uniquement les données de base)

```bash
cd backend
node scripts/seedDatabaseEvent.js
```

---

## Résumé des données créées

### Par `seedDatabaseEvent.js` :

| Type | Quantité | Exemples |
|------|----------|----------|
| Rôles | 3 | User, Professionnel, Administrateur |
| Types d'utilisateurs | 22 | auteur, réalisateur, compositeur, etc. |
| Types d'événements | 8 | Festival, Exposition, Concert, etc. |
| Utilisateurs | 7 | Admin, professionnels, visiteurs |
| Lieux | 4 | Palais de la Culture, Musée Zabana, etc. |
| Événements | 4 | Festival Andalou, Exposition Art, etc. |

### Par `seed-database.js` :

| Type | Quantité | Exemples |
|------|----------|----------|
| Langues | 4 | Arabe, Français, Tamazight, Anglais |
| Types d'œuvres | 7 | Livre, Film, Album Musical, etc. |
| Genres | 30+ | Roman, Drame, Chaâbi, Raï, etc. |
| Catégories | 7 | Patrimoine culturel, Art contemporain, etc. |
| Livres | 5 | Nedjma, Le Fils du pauvre, etc. |
| Films | 3 | La Bataille d'Alger, Chronique des années de braise |
| Albums | 2 | El Menfi, Ya Rayah |
| Artisanat | 2 | Tapis des Ait Hichem, Poterie de Maâtkas |
| Œuvres d'art | 2 | Les Femmes d'Alger, La Ville |
| Articles | 2 | Articles culturels |

---

## Identifiants de connexion

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@actionculture.dz` | `admin123` | Administrateur |
| `m.benali@test.dz` | `password123` | Professionnel (auteur) |
| `f.saidi@test.com` | `password123` | Utilisateur |
| `a.khedda@musee.dz` | `password123` | Professionnel (artiste) |
| `k.mammeri@cinema.dz` | `password123` | Professionnel (réalisateur) |
| `s.boudiaf@music.dz` | `password123` | Professionnel (compositeur) |
| `a.ziani@journal.dz` | `password123` | Professionnel (journaliste) |

---

## Dépannage

### Erreur : "Admin non trouvé"

**Cause** : Le script `seed-database.js` a été exécuté avant `seedDatabaseEvent.js`.

**Solution** : Exécutez d'abord `seedDatabaseEvent.js`.

### Erreur : "Connection refused"

**Cause** : MySQL n'est pas démarré ou les identifiants sont incorrects.

**Solution** : 
1. Vérifiez que MySQL est en cours d'exécution
2. Vérifiez les identifiants dans `.env` ou dans le script

### Erreur : "Table doesn't exist"

**Cause** : Les tables n'ont pas été créées.

**Solution** : Lancez le serveur une fois avec `npm start` pour créer les tables.

### Erreur : "Duplicate entry"

**Cause** : Les données existent déjà.

**Solution** : C'est normal si vous relancez le script. Les données existantes sont ignorées.

---

## Scripts disponibles

| Script | Description |
|--------|-------------|
| **`seed-all-data.js`** | ⭐ **RECOMMANDÉ** - Script complet unifié |
| `seedDatabaseEvent.js` | Données de base (users, rôles, événements) |
| `seed-database.js` | Œuvres culturelles complètes |
| `seedTypeUsers.js` | Types d'utilisateurs uniquement |
| `seedOeuvres.js` | Œuvres uniquement (plus de données) |
| `seedProCom.js` | Professionnels et communautés |

---

## Commandes rapides

### Option 1 : Script unifié (RECOMMANDÉ)
```bash
cd backend
node scripts/seed-all-data.js
```

### Option 2 : Scripts séparés
```bash
cd backend && node scripts/seedDatabaseEvent.js && node scripts/seed-database.js
```

---

## Support

En cas de problème, vérifiez :
1. La connexion MySQL
2. Le fichier `.env`
3. L'ordre d'exécution des scripts
