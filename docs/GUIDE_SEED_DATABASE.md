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

# 1. Géographie (wilayas, dairas, communes) - OBLIGATOIRE en premier
node scripts/seed-geography.js

# 2. Données complètes (rôles, types, utilisateurs, lieux, événements, œuvres)
node scripts/seed-all-data.js
```

### Option B : Seed enrichi (œuvres algériennes réelles - optionnel)

Après Option A, pour ajouter Nedjma, Bataille d'Alger, etc. :

```bash
node scripts/seed-database.js
```

---

## Résumé des données créées

### Par `seed-geography.js` :

| Type | Contenu |
|------|---------|
| Wilayas | 58 wilayas d'Algérie (depuis algeria_cities.json) |
| Dairas | Toutes les daïras |
| Communes | Toutes les communes |

### Par `seed-all-data.js` :

| Type | Quantité | Exemples |
|------|----------|----------|
| Rôles | 3 | User, Professionnel, Administrateur |
| Types d'utilisateurs | 14 | auteur, réalisateur, artisan, etc. |
| Types d'événements | 9 | Festival, Exposition, Concert, etc. |
| Utilisateurs | 10 | admin@actionculture.dz, m.benali@test.dz, etc. |
| Lieux | 6 | Palais Culture, Musée Zabana, Casbah, Timgad, etc. |
| Événements | 7 | Festival Andalou, Exposition Art, etc. |
| Œuvres | Livres, films, albums, artisanat (données seed-data-reference) |

### Par `seed-database.js` (optionnel) :

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

### Erreur : "Admin non trouvé" ou clés étrangères

**Cause** : `seed-all-data.js` exécuté avant `seed-geography.js`, ou ordre incorrect.

**Solution** : Exécutez d'abord `seed-geography.js`, puis `seed-all-data.js`.

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
| **`seed-geography.js`** | Wilayas, dairas, communes (algeria_cities.json) — **obligatoire en premier** |
| **`seed-all-data.js`** | ⭐ **RECOMMANDÉ** — Script complet unifié |
| `seed-data-reference.js` | Données (non exécutable, utilisé par seed-all-data) |
| `seed-database.js` | Œuvres algériennes réelles (Nedjma, Bataille d'Alger...) — optionnel |

### Scripts supprimés (remplacés par seed-all-data)
- ~~seedDatabaseEvent.js~~, ~~seedOeuvres.js~~, ~~seedTypeUsers.js~~, ~~seedProCom.js~~

---

## Commandes rapides

### Option 1 : Complet (RECOMMANDÉ)
```bash
cd backend
node scripts/seed-geography.js
node scripts/seed-all-data.js
```

### Option 2 : Avec œuvres culturelles détaillées
```bash
cd backend
node scripts/seed-geography.js
node scripts/seed-all-data.js
node scripts/seed-database.js
```

---

## Support

En cas de problème, vérifiez :
1. La connexion MySQL
2. Le fichier `.env`
3. L'ordre d'exécution des scripts
