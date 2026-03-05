# 🎨 Exposition "Art Contemporain Algérien" - Données de Test

## 📋 Description

Ce dossier contient les données de test complètes pour l'exposition **"Art Contemporain Algérien"** afin de valider le fonctionnement complet du système multilingue avec les programmes d'événements.

## 🗂️ Fichiers Inclus

### 1. `exposition-art-contemporain.sql`
- **Événement principal** avec toutes les traductions (5 langues)
- **Lieu** : Musée National des Beaux-Arts d'Alger
- **6 programmes** sur 3 jours avec horaires et intervenants
- **Inscriptions** des participants
- **Médias** de l'événement

### 2. `users-exposition.sql`
- **5 artistes** professionnels avec biographies multilingues
- **5 participants/utilisateurs** pour tester les inscriptions
- **6 œuvres** originales avec descriptions multilingues
- **Médias** associés aux œuvres

### 3. `README-EXPOSITION.md` (ce fichier)
- Documentation complète de l'installation

---

## 🎯 Programme de l'Exposition (3 Jours)

### 📅 **Jour 1 - 1er Février 2024**
1. **18:00-20:00** : Vernissage - Ouverture Officielle
2. **20:30-22:00** : Visite Guidée - Art Abstrait Algérien

### 📅 **Jour 2 - 2 Février 2024**
3. **10:00-13:00** : Atelier - Peinture Contemporaine
4. **15:00-17:00** : Conférence - L'Art Contemporain et la Société

### 📅 **Jour 3 - 3 Février 2024**
5. **18:00-20:30** : Performance - Art Vivant Algérien
6. **21:00-23:00** : Clôture - Remise des Prix et Cocktail

---

## 🌍 Contenu Multilingue

### **Langues Supportées**
- 🇫🇷 **Français** : Langue principale
- 🇩🇿 **العربية** : Traduction arabe complète
- 🇬🇧 **English** : Traduction anglaise complète
- ⵣ **Tamaziɣt** : Traduction tamazight latin
- ⵣ **ⵜⴰⵎⴰⵣⵉⵖⵜ** : Traduction tifinagh

### **Champs Multilingues**
- Titres des événements et programmes
- Descriptions détaillées
- Noms des lieux
- Biographies des artistes
- Descriptions des œuvres

---

## 👥 Participants

### **Artistes Principaux**
1. **Bachir Hachemi** : Artiste peintre (art abstrait)
2. **Fatma Zohra** : Artiste multidisciplinaire
3. **Mohamed Cherif** : Artiste performeur
4. **Leila Mansouri** : Conservatrice du musée
5. **Yacine Boudiaf** : Historien de l'art

### **Participants Inscrits**
- Ahmed Benmohamed (collectionneur)
- Sofia Rabehi (étudiante)
- Rachid Kaci (photographe)
- Nadia Belkacem (professeure)
- Omar Taleb (architecte)

---

## 🖼️ Œuvres Exposées

1. **"Mémoires d'Alger"** - Bachir Hachemi (Triptyque abstrait)
2. **"Horizons Bleus"** - Bachir Hachemi (Série de toiles)
3. **"Racines et Ailes"** - Fatma Zohra (Installation mixte)
4. **"Échos Feminins"** - Fatma Zohra (Série photographique)
5. **"Transition Urbaine"** - Mohamed Cherif (Vidéo installation)
6. **"Dialogues Silencieux"** - Mohamed Cherif (Performance)

---

## 🚀 Installation

### **Étape 1 : Importer les données SQL**

```bash
# Depuis le dossier backend/database/seeds/
mysql -u votre_user -p votre_database < exposition-art-contemporain.sql
mysql -u votre_user -p votre_database < users-exposition.sql
```

### **Étape 2 : Vérifier l'installation**

```sql
-- Vérifier l'événement
SELECT id_evenement, nom_evenement->>'fr' as titre_fr, nom_evenement->>'ar' as titre_ar 
FROM evenement WHERE id_evenement = 1;

-- Vérifier les programmes
SELECT id_programme, titre->>'fr' as titre_fr, date_programme, heure_debut 
FROM programme WHERE id_evenement = 1 ORDER BY ordre;

-- Vérifier les utilisateurs
SELECT id_user, nom, prenom, role 
FROM users WHERE id_user BETWEEN 6 AND 15;
```

---

## 🧪 Tests à Effectuer

### **1. Test Frontend - Navigation**
- ✅ Accéder à la page de l'événement
- ✅ Vérifier l'affichage multilingue
- ✅ Tester le changement de langue
- ✅ Consulter les détails des programmes

### **2. Test Frontend - Formulaires**
- ✅ Inscription à l'événement
- ✅ Modification des programmes (si admin)
- ✅ Saisie multilingue dans les formulaires
- ✅ Upload de médias

### **3. Test API**
- ✅ `GET /api/evenements/1` : Détails événement
- ✅ `GET /api/evenements/1/programmes` : Programmes
- ✅ `GET /api/oeuvres` : Liste des œuvres
- ✅ `POST /api/evenements/1/inscription` : Inscription

### **4. Test Multilingue**
- ✅ Traduction automatique selon la langue
- ✅ Support RTL pour l'arabe
- ✅ Affichage Tifinagh/Latin
- ✅ Fallback si traduction manquante

---

## 📊 Statistiques Attendues

### **Événement**
- **Capacité** : 500 personnes max
- **Programmes** : 6 activités
- **Durée** : 3 jours (1-15 Février 2024)
- **Lieu** : Musée National des Beaux-Arts

### **Participants**
- **Artistes** : 5 professionnels
- **Inscrits** : 10+ utilisateurs
- **Intervenants** : 12 confirmés

### **Contenu**
- **Œuvres** : 6 originales
- **Médias** : 13+ fichiers
- **Traductions** : 5 langues complètes

---

## 🎯 Validation du Système

Cette simulation permet de tester :

1. **✅ Le multilingue complet** avec 5 langues
2. **✅ Les programmes d'événements** multi-jours
3. **✅ Les formulaires multilingues**
4. **✅ L'inscription des participants**
5. **✅ La gestion des médias**
6. **✅ L'affichage RTL/LTR**
7. **✅ Le support Tamazight**

---

## 🔧 Dépannage

### **Problèmes Communs**
- **Encodage UTF-8** : Vérifier que la base de données est en UTF-8
- **JSON invalide** : Valider la syntaxe JSON des traductions
- **Clés étrangères** : S'assurer que les IDs existent
- **Permissions** : Vérifier les droits d'accès à la base

### **Requêtes de Test**
```sql
-- Vérifier l'encodage
SHOW VARIABLES LIKE 'character_set%';

-- Vérifier les clés étrangères
SELECT * FROM programme WHERE id_evenement NOT IN (SELECT id_evenement FROM evenement);

-- Compter les traductions
SELECT 
  COUNT(CASE WHEN titre->>'fr' != '' THEN 1 END) as fr_count,
  COUNT(CASE WHEN titre->>'ar' != '' THEN 1 END) as ar_count,
  COUNT(CASE WHEN titre->>'en' != '' THEN 1 END) as en_count
FROM programme WHERE id_evenement = 1;
```

---

## 🎉 Résultat Attendu

Après installation, vous devriez avoir une **exposition complète et fonctionnelle** qui démontre toutes les capacités multilingues de votre plateforme EventCulture !

**Bon test !** 🚀🎨🌍
