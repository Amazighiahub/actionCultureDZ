# 🌱 Seeds de la Base de Données EventCulture

## 📋 Description

Ce dossier contient les scripts et fichiers SQL pour insérer les données de test dans la base de données EventCulture.

> **Recommandé** : Pour une installation complète, utiliser les scripts Node.js à la racine du backend : `node scripts/seed-geography.js` puis `node scripts/seed-all-data.js`. Voir [GUIDE_SEED_DATABASE.md](../../../GUIDE_SEED_DATABASE.md).

## 🗂️ Fichiers Disponibles

### **1. artisanat-seeds.sql**
- **Description**: Script SQL complet pour insérer toutes les données de test relatives à l'artisanat
- **Contenu**:
  - Matériaux (céramique, argent, tissu, bois, pierre)
  - Techniques (tournage, forge, tissage, sculpture, peinture)
  - Types d'œuvres (artisanat, bijou, textile, art, décoration)
  - Wilayas (toutes les wilayas d'Algérie)
  - Utilisateurs (artisans professionnels)
  - Œuvres (avec données multilingues)
  - Artisanats (produits artisanaux)
  - Médias (images)
  - Tags (mots-clés)
  - Commentaires (avis sur les œuvres)
  - Favoris (marquages)
  - Statistiques (vues, favoris, commentaires)

### **2. run-seeds.sh**
- **Description**: Script bash pour exécuter les seeds
- **Fonctionnalités**:
  - Vérification de l'environnement MySQL
  - Création de la base de données si nécessaire
  - Exécution du script SQL
  - Affichage d'un résumé des données insérées

## 🚀 Comment Utiliser

### **Prérequis**
- MySQL 8+ installé et en cours d'exécution
- Base de données `actionculture` créée
- Accès administrateur à la base de données

### **Étape 1: Navigation**
```bash
cd backend/database/seeds
```

### **Étape 2: Exécution**

**Sur Linux/Mac:**
```bash
chmod +x run-seeds.sh
./run-seeds.sh
```

**Sur Windows:**
```cmd
run-seeds.bat
```

**Ou directement avec MySQL:**
```bash
mysql -u actionculture_user -p actionculture < artisanat-seeds.sql
```

### **Étape 3: Vérification**
```bash
# Se connecter à MySQL
mysql -u actionculture_user -p actionculture

# Vérifier les données
SELECT COUNT(*) as artisanats FROM artisanats;
SELECT COUNT(*) as oeuvres FROM oeuvres;
SELECT COUNT(*) as commentaires FROM commentaires;
```

## 📊 Données de Test Inclues

### **Artisans**
- **Karim Benali** - Spécialiste en art berbère (Tizi Ouzou)
- **Marie Dupont** - Spécialiste en textiles berbères
- **Paul Martin** - Spécialiste en bijoux en argent
- **Fatima Leila** - Spécialisée en tissage et broderie

### **Produits Artisanaux**
- **Vase Berbère Traditionnel** - 7 000 - 8 000 DA
- **Plat Berbère Céramique** - 2 500 - 3 000 DA
- **Bijou Berbère en Argent** - 8 500 - 9 000 DA
- **Poterie Artisanale** - 3 500 - 4 000 DA
- **Coussin Berbère** - 5 000 - 6 000 DA

### **Données Multilingues**
- **Français** : Langue principale
- **Arabe** : ⵜⴰⴱⴲⴳ
- **Anglais** : English

### **Images**
- Photos des produits artisanats
- Photos des artisans
- Miniatures pour les galeries

## 🔧 Configuration

### **Variables d'Environnement**
Le script utilise les variables suivantes (voir `.env` à la racine) :
- `DB_NAME="actionculture"`
- `DB_USER="actionculture_user"`
- `DB_PASSWORD="votre_mot_de_passe"`
- `DB_HOST="localhost"`
- `DB_PORT="3306"`

### **Personnalisation**
Pour adapter les données à votre environnement :
1. Modifier les chemins des images dans `artisanat-seeds.sql`
2. Ajuster les prix et descriptions selon vos besoins
3. Ajouter ou supprimer des artisans et produits
4. Adapter les informations de contact (emails, téléphones)

## 🔄 Mise à Jour

### **Pour ajouter de nouvelles données**
1. Ajoutez les lignes SQL correspondantes dans `artisanat-seeds.sql`
2. Ré-exécutez le script `run-seeds.sh`

### **Pour réinitialiser les données**
1. Supprime les tables existantes (optionnel)
2. Réexécutez le script `run-seeds.sh`

### **Pour les environnements de production**
1. Adaptez les variables de connexion dans `run-seeds.sh`
2. Assurez-vous que les chemins des images sont corrects
3. Testez sur un environnement de staging d'abord

## 🐛 Dépannage

### **Erreurs Connexions**
- Vérifiez que MySQL est en cours d'exécution
- Vérifiez les identifiants de base de données
- Assurez-vous que la base de données existe

### **Erreurs de Permissions**
- Donnez les droits d'exécution au script : `chmod +x run-seeds.sh`
- Vérifiez que l'utilisateur MySQL a les droits d'écriture

### **Erreurs de Données**
- Vérifiez que les contraintes sont respectées (unicité des clés primaires)
- Vérifiez que les références entre les tables existent
- Corrige les erreurs de syntaxe SQL avant réexécution

## 📈 Support

Pour toute question sur l'utilisation ou la personnalisation des seeds, contactez l'équipe technique EventCulture.
