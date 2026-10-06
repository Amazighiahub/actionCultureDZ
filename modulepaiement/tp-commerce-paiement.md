# TPs Commerce & Paiement — Module Vente Livres & Artisanat
## Backend EventCulture — Node.js / Express / Sequelize / MySQL

> **Niveau :** Intermédiaire-Avancé (connaît Express, Sequelize, JWT)  
> **Durée totale :** ~35 heures (10 TPs progressifs)  
> **Repo :** EventCulture (backend existant, port 3001)  
> **Objectif final :** Module e-commerce complet — panier → commande → paiement Stripe + CIB/BaridiMob → facture PDF → livraison

---

## Contexte

Tu vas greffer un module de vente sur le backend **EventCulture** déjà en place.  
Les modèles `Oeuvre`, `Artisanat`, `Livre`, `User` existent — tu **ne les recréés pas**, tu les **étends**.

Produits vendables : **Livres** (papier + numérique) et **Artisanat** uniquement.

---

## Architecture cible à la fin des 10 TPs

```
Panier (Cart)
  └── LignePanier (CartItem) → Oeuvre
        ↓ checkout
Commande (Order)
  ├── LigneCommande (OrderItem) → Oeuvre
  ├── AdresseLivraison
  ├── Transaction → Stripe / Slick-Pay
  ├── Facture (PDF Cloudinary)
  └── Livraison (suivi transporteur)
```

---

## Variables d'environnement à ajouter dans `.env`

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Slick-Pay (CIB/BaridiMob Algérie)
SLICKPAY_API_KEY=...
SLICKPAY_BASE_URL=https://api.slick-pay.com/v2

# Commerce
COMMISSION_PLATFORM_PERCENT=20
TVA_PERCENT=19
FRAIS_PORT_BASE_DZD=500
DEVISE_DEFAUT=DZD

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
```

---

---

# TP 1 — Analyse du code existant & Setup
**Durée :** 1h30

## Objectifs pédagogiques
- Lire et comprendre un modèle Sequelize existant
- Identifier ce qui peut être réutilisé
- Installer les nouvelles dépendances
- Préparer l'environnement de développement

## Prérequis
- Backend EventCulture cloné et fonctionnel (`npm run dev`)
- MySQL démarré, base de données créée
- Compte Stripe créé sur [stripe.com](https://stripe.com) (gratuit, mode test)

---

## Étapes

### 1.1 — Lire les modèles existants

Ouvre et lis attentivement ces fichiers :

```
backend/models/oeuvres/oeuvre.js       ← modèle principal
backend/models/oeuvres/livre.js        ← spécialisation livre
backend/models/oeuvres/artisanat.js    ← spécialisation artisanat
backend/models/users/user.js           ← acheteur/vendeur
backend/models/associations/oeuvreEditeur.js  ← prix de vente éditeur
```

**Questions à répondre par écrit :**
1. Quel champ dans `Oeuvre` stocke le prix ? Est-il en DZD ou non précisé ?
2. `Artisanat` a-t-il un champ `prix` ? Est-ce un doublon avec `Oeuvre.prix` ?
3. Quel champ de `Oeuvre` indique si une œuvre est publiée/disponible ?
4. Dans `OeuvreEditeur`, quels champs concernent le commerce (`prix_vente`, `statut_edition`…) ?
5. `User` a-t-il un champ pour l'adresse de livraison ? Si non, comment vas-tu le gérer ?

### 1.2 — Installer les dépendances

```bash
cd backend
npm install stripe
npm install slick-pay  # ou axios pour appels manuels à l'API Slick-Pay
npm install uuid       # identifiants uniques pour numéros de commande
```

Vérifier dans `package.json` que ces dépendances sont bien présentes.

### 1.3 — Ajouter les variables d'environnement

Ajoute le bloc "Commerce" dans ton fichier `.env` (voir en-tête du document).

Pour les clés Stripe : va sur [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) et copie les clés **test**.

### 1.4 — Créer la structure de dossiers

```bash
mkdir -p backend/models/commerce
mkdir -p backend/routes
mkdir -p backend/services
mkdir -p backend/repositories
mkdir -p backend/tests/commerce
```

Ces dossiers existent peut-être déjà — vérifie avant de les créer.

### 1.5 — Créer un fichier de constantes commerce

Créer `backend/constants/commerce.js` :

```javascript
// Statuts de commande
const STATUT_COMMANDE = {
  EN_ATTENTE: 'en_attente',
  CONFIRMEE: 'confirmee',
  EN_PREPARATION: 'en_preparation',
  EXPEDIEE: 'expediee',
  LIVREE: 'livree',
  ANNULEE: 'annulee',
  REMBOURSEE: 'remboursee',
};

// Statuts de paiement
const STATUT_PAIEMENT = {
  EN_ATTENTE: 'en_attente',
  SUCCES: 'succes',
  ECHEC: 'echec',
  REMBOURSE: 'rembourse',
  EXPIRE: 'expire',
};

// Types de produit vendable
const TYPE_PRODUIT = {
  LIVRE_PAPIER: 'livre_papier',
  LIVRE_NUMERIQUE: 'livre_numerique',
  ARTISANAT: 'artisanat',
};

// Méthodes de paiement
const METHODE_PAIEMENT = {
  STRIPE: 'stripe',
  CIB: 'cib',
  BARIDIMOB: 'baridimob',
  DAHABIA: 'dahabia',
};

// Statuts de livraison
const STATUT_LIVRAISON = {
  EN_ATTENTE: 'en_attente',
  EN_COURS: 'en_cours',
  LIVREE: 'livree',
  ECHEC: 'echec',
  RETOUR: 'retour',
};

module.exports = {
  STATUT_COMMANDE,
  STATUT_PAIEMENT,
  TYPE_PRODUIT,
  METHODE_PAIEMENT,
  STATUT_LIVRAISON,
};
```

## Livrable
- Réponses écrites aux 5 questions (fichier `tp1-reponses.md`)
- `package.json` avec `stripe` et `uuid` installés
- Fichier `.env` avec les variables commerce remplies
- Fichier `backend/constants/commerce.js` créé

## Critères de notation
| Critère | Points |
|---------|--------|
| Réponses aux 5 questions pertinentes | 5 |
| Dépendances installées + vérifiées | 2 |
| Constantes complètes et bien organisées | 3 |
| **Total** | **10** |

---

---

# TP 2 — Modèles Sequelize : Panier & Commande
**Durée :** 3h

## Objectifs pédagogiques
- Créer des modèles Sequelize en suivant les conventions du projet
- Comprendre les relations entre modèles (1:1, 1:N, N:M)
- Ajouter des champs à un modèle existant (`Oeuvre`)
- Déclarer les associations dans le fichier central

## Prérequis
- TP 1 terminé
- Comprendre `DataTypes.DECIMAL`, `DataTypes.ENUM`, `DataTypes.JSON`

---

## Étapes

### 2.1 — Ajouter des champs à `Oeuvre`

Ouvre `backend/models/oeuvres/oeuvre.js` et ajoute ces champs dans la définition :

```javascript
// À ajouter dans la liste des champs existants
en_vente: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
  comment: 'Ce produit est-il disponible à la vente ?',
},
quantite_stock: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
  validate: { min: 0 },
},
type_produit: {
  type: DataTypes.ENUM('livre_papier', 'livre_numerique', 'artisanat'),
  allowNull: true,
},
prix_vente: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: true,
  comment: 'Prix en DZD',
},
reduction_pourcentage: {
  type: DataTypes.DECIMAL(5, 2),
  defaultValue: 0,
  validate: { min: 0, max: 100 },
},
frais_port: {
  type: DataTypes.DECIMAL(10, 2),
  defaultValue: 0,
  comment: 'Frais de port spécifiques à ce produit',
},
fichier_numerique_url: {
  type: DataTypes.STRING(1000),
  allowNull: true,
  comment: 'URL Cloudinary du fichier (PDF/EPUB) — livre numérique uniquement',
},
stripe_product_id: {
  type: DataTypes.STRING(100),
  allowNull: true,
},
stripe_price_id: {
  type: DataTypes.STRING(100),
  allowNull: true,
},
```

> ⚠️ Tu modifies un modèle existant. Vérifie d'abord que ces champs n'existent PAS déjà.  
> Pour créer les colonnes en base : `ALTER TABLE oeuvres ADD COLUMN ...` ou via une migration Sequelize.

### 2.2 — Créer le modèle `Panier`

Créer `backend/models/commerce/panier.js` :

```javascript
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Panier extends Model {
    static associate(models) {
      Panier.belongsTo(models.User, { foreignKey: 'id_user', as: 'acheteur' });
      Panier.hasMany(models.LignePanier, { foreignKey: 'id_panier', as: 'lignes', onDelete: 'CASCADE' });
    }

    // Calcule le total du panier
    async getTotal() {
      const lignes = await this.getLignes({ include: ['oeuvre'] });
      return lignes.reduce((total, ligne) => {
        const prix = parseFloat(ligne.prix_unitaire_snapshot);
        return total + prix * ligne.quantite;
      }, 0);
    }
  }

  Panier.init({
    id_panier: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id_user' },
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'false = panier converti en commande ou abandonné',
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Pour paniers anonymes (optionnel)',
    },
  }, {
    sequelize,
    modelName: 'Panier',
    tableName: 'paniers',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
  });

  return Panier;
};
```

### 2.3 — Créer le modèle `LignePanier`

Créer `backend/models/commerce/lignePanier.js` :

```javascript
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class LignePanier extends Model {
    static associate(models) {
      LignePanier.belongsTo(models.Panier, { foreignKey: 'id_panier' });
      LignePanier.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', as: 'oeuvre' });
    }

    getPrixTotal() {
      return parseFloat(this.prix_unitaire_snapshot) * this.quantite;
    }
  }

  LignePanier.init({
    id_ligne: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_panier: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'paniers', key: 'id_panier' },
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'oeuvres', key: 'id_oeuvre' },
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1, max: 99 },
    },
    // Snapshot du prix au moment de l'ajout (important : le prix peut changer)
    prix_unitaire_snapshot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Prix capturé au moment de l\'ajout au panier',
    },
    type_produit_snapshot: {
      type: DataTypes.ENUM('livre_papier', 'livre_numerique', 'artisanat'),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'LignePanier',
    tableName: 'lignes_panier',
    timestamps: true,
    createdAt: 'date_ajout',
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['id_panier', 'id_oeuvre'] },
    ],
  });

  return LignePanier;
};
```

### 2.4 — Créer le modèle `Commande`

Créer `backend/models/commerce/commande.js` :

```javascript
'use strict';
const { Model, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  class Commande extends Model {
    static associate(models) {
      Commande.belongsTo(models.User, { foreignKey: 'id_user', as: 'acheteur' });
      Commande.hasMany(models.LigneCommande, { foreignKey: 'id_commande', as: 'lignes', onDelete: 'CASCADE' });
      Commande.hasOne(models.Transaction, { foreignKey: 'id_commande', as: 'transaction' });
      Commande.hasOne(models.Facture, { foreignKey: 'id_commande', as: 'facture' });
      Commande.hasOne(models.Livraison, { foreignKey: 'id_commande', as: 'livraison' });
    }

    // Vérifie si la commande peut encore être annulée
    peutEtreAnnulee() {
      return ['en_attente', 'confirmee'].includes(this.statut);
    }
  }

  Commande.init({
    id_commande: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numero_commande: {
      type: DataTypes.STRING(50),
      unique: true,
      defaultValue: () => `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id_user' },
    },
    statut: {
      type: DataTypes.ENUM(
        'en_attente', 'confirmee', 'en_preparation',
        'expediee', 'livree', 'annulee', 'remboursee'
      ),
      defaultValue: 'en_attente',
    },
    // Montants
    montant_produits: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Somme des produits HT',
    },
    montant_livraison: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    montant_reduction: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    montant_tva: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    montant_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total TTC final payé',
    },
    devise: {
      type: DataTypes.STRING(3),
      defaultValue: 'DZD',
    },
    // Adresse de livraison (snapshot au moment de la commande)
    adresse_livraison: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '{ nom, prenom, adresse, wilaya, code_postal, telephone }',
    },
    // Notes
    notes_client: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes_interne: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Coupon appliqué
    coupon_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Dates
    date_confirmation: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    date_livraison_estimee: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Commande',
    tableName: 'commandes',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      { fields: ['id_user'] },
      { fields: ['statut'] },
      { unique: true, fields: ['numero_commande'] },
    ],
  });

  return Commande;
};
```

### 2.5 — Créer le modèle `LigneCommande`

Créer `backend/models/commerce/ligneCommande.js` :

```javascript
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class LigneCommande extends Model {
    static associate(models) {
      LigneCommande.belongsTo(models.Commande, { foreignKey: 'id_commande' });
      LigneCommande.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', as: 'oeuvre' });
    }
  }

  LigneCommande.init({
    id_ligne: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_commande: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'commandes', key: 'id_commande' },
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'oeuvres', key: 'id_oeuvre' },
    },
    // Snapshots immuables (la commande garde l'état au moment de l'achat)
    titre_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '{ fr, ar, en }',
    },
    type_produit: {
      type: DataTypes.ENUM('livre_papier', 'livre_numerique', 'artisanat'),
      allowNull: false,
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    prix_unitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    prix_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // Pour livre numérique : URL de téléchargement sécurisée
    lien_telechargement: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    lien_expire_le: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Pour artisan/auteur : commission
    commission_vendeur: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    id_vendeur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id_user' },
    },
  }, {
    sequelize,
    modelName: 'LigneCommande',
    tableName: 'lignes_commande',
    timestamps: false,
  });

  return LigneCommande;
};
```

### 2.6 — Enregistrer les modèles dans l'index

Ouvre le fichier principal qui charge les modèles (souvent `backend/models/index.js` ou `backend/config/database.js`) et ajoute :

```javascript
// Dans la section qui charge les modèles
const Panier       = require('./commerce/panier')(sequelize);
const LignePanier  = require('./commerce/lignePanier')(sequelize);
const Commande     = require('./commerce/commande')(sequelize);
const LigneCommande = require('./commerce/ligneCommande')(sequelize);

// Exporter
module.exports = {
  // ... modèles existants ...
  Panier,
  LignePanier,
  Commande,
  LigneCommande,
};

// Appeler les associations APRÈS la définition de tous les modèles
[Panier, LignePanier, Commande, LigneCommande].forEach(model => {
  if (model.associate) model.associate(module.exports);
});
```

### 2.7 — Créer les tables en base de données

```bash
# Option 1 : sync avec Sequelize (développement seulement)
# Dans un fichier temporaire backend/scripts/syncDb.js :
const { sequelize } = require('../models');
sequelize.sync({ alter: true }).then(() => {
  console.log('Tables mises à jour');
  process.exit(0);
});

node backend/scripts/syncDb.js
```

Vérifier dans MySQL que les tables `paniers`, `lignes_panier`, `commandes`, `lignes_commande` ont été créées.

## Livrable
- 4 fichiers modèles créés
- `Oeuvre` modifié avec les nouveaux champs
- Tables présentes dans la base de données (capture d'écran MySQL Workbench)

## Critères de notation
| Critère | Points |
|---------|--------|
| Modèle Panier correct (champs + associations) | 2 |
| Modèle LignePanier avec snapshot prix | 2 |
| Modèle Commande avec tous les montants | 3 |
| Modèle LigneCommande avec snapshots | 2 |
| Tables créées en base de données | 1 |
| **Total** | **10** |

---

---

# TP 3 — Modèles Transaction & Facture + Migrations
**Durée :** 2h30

## Objectifs pédagogiques
- Modéliser correctement un paiement (état machine)
- Créer un modèle de facture lié à une commande
- Comprendre les webhooks et pourquoi on stocke la réponse brute du gateway

---

## Étapes

### 3.1 — Créer le modèle `Transaction`

Créer `backend/models/commerce/transaction.js` :

```javascript
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.Commande, { foreignKey: 'id_commande', as: 'commande' });
      Transaction.belongsTo(models.User, { foreignKey: 'id_user', as: 'acheteur' });
    }

    estSucces() {
      return this.statut === 'succes';
    }
  }

  Transaction.init({
    id_transaction: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_commande: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'commandes', key: 'id_commande' },
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'succes', 'echec', 'rembourse', 'expire'),
      defaultValue: 'en_attente',
    },
    methode_paiement: {
      type: DataTypes.ENUM('stripe', 'cib', 'baridimob', 'dahabia'),
      allowNull: false,
    },
    montant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    devise: {
      type: DataTypes.STRING(3),
      defaultValue: 'DZD',
    },
    // Références externes (ID chez Stripe / Slick-Pay)
    reference_externe: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'stripe: payment_intent_id | slick-pay: transaction_id',
    },
    reference_client: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Identifiant visible par le client (numéro de reçu)',
    },
    // Réponse brute du payment gateway (pour debug et audit)
    gateway_response: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Réponse complète de Stripe/Slick-Pay — NE JAMAIS modifier',
    },
    // Pour Stripe : client_secret envoyé au frontend
    client_secret: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Stripe PaymentIntent client_secret',
    },
    // Remboursement
    montant_rembourse: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    raison_remboursement: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    date_remboursement: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Adresse IP (sécurité anti-fraude)
    ip_acheteur: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      { fields: ['id_commande'] },
      { fields: ['reference_externe'] },
      { fields: ['statut'] },
    ],
  });

  return Transaction;
};
```

### 3.2 — Créer le modèle `Facture`

Créer `backend/models/commerce/facture.js` :

```javascript
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Facture extends Model {
    static associate(models) {
      Facture.belongsTo(models.Commande, { foreignKey: 'id_commande', as: 'commande' });
      Facture.belongsTo(models.User, { foreignKey: 'id_user', as: 'acheteur' });
    }
  }

  Facture.init({
    id_facture: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_commande: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numero_facture: {
      type: DataTypes.STRING(50),
      unique: true,
      comment: 'Ex: FACT-2024-000123',
    },
    url_pdf: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: 'URL Cloudinary du PDF de facture',
    },
    // Montants de facturation
    montant_ht: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    taux_tva: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 19,
    },
    montant_tva: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    montant_ttc: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // Coordonnées de facturation (snapshot)
    nom_acheteur: DataTypes.STRING(200),
    adresse_facturation: DataTypes.TEXT,
    email_acheteur: DataTypes.STRING(255),
    // Coordonnées vendeur/plateforme
    nom_vendeur: { type: DataTypes.STRING(200), defaultValue: 'EventCulture Algérie' },
    adresse_vendeur: DataTypes.TEXT,
    date_emission: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'Facture',
    tableName: 'factures',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: false,
  });

  return Facture;
};
```

### 3.3 — Créer le modèle `Livraison`

Créer `backend/models/commerce/livraison.js` :

```javascript
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Livraison extends Model {
    static associate(models) {
      Livraison.belongsTo(models.Commande, { foreignKey: 'id_commande' });
    }
  }

  Livraison.init({
    id_livraison: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_commande: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'en_cours', 'livree', 'echec', 'retour'),
      defaultValue: 'en_attente',
    },
    transporteur: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Ex: Algérie Poste, Yalidine, Zr Express',
    },
    numero_suivi: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    frais_livraison: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    wilaya_destination: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    adresse_complete: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date_expedition: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    date_livraison_reelle: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Livraison',
    tableName: 'livraisons',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
  });

  return Livraison;
};
```

### 3.4 — Enregistrer les 3 nouveaux modèles

Ajouter dans le fichier d'index des modèles :

```javascript
const Transaction   = require('./commerce/transaction')(sequelize);
const Facture       = require('./commerce/facture')(sequelize);
const Livraison     = require('./commerce/livraison')(sequelize);
```

Ne pas oublier d'appeler `.associate()` pour chacun.

### 3.5 — Synchroniser la base de données

```bash
node backend/scripts/syncDb.js
```

**Vérifier dans MySQL :** `SHOW TABLES;` doit afficher `transactions`, `factures`, `livraisons`.

**Vérifier les colonnes de `transactions` :**
```sql
DESCRIBE transactions;
```

## Livrable
- 3 nouveaux modèles créés et enregistrés
- 7 tables commerce présentes dans MySQL
- Capture d'écran `SHOW TABLES` dans le livrable

## Critères de notation
| Critère | Points |
|---------|--------|
| Modèle Transaction avec gateway_response | 3 |
| Modèle Facture avec montants HT/TVA/TTC | 3 |
| Modèle Livraison | 2 |
| Tables créées vérifiées en base | 2 |
| **Total** | **10** |

---

---

# TP 4 — API Panier (Routes & Service)
**Durée :** 3h

## Objectifs pédagogiques
- Créer un service métier avec logique de panier
- Comprendre pourquoi on snapshote le prix
- Gérer le stock (décrémentation optimiste)
- Structurer les routes REST d'un panier

## Prérequis
- TPs 1, 2, 3 terminés
- Tables `paniers` et `lignes_panier` en base

---

## Étapes

### 4.1 — Créer le service `PanierService`

Créer `backend/services/panierService.js` :

```javascript
'use strict';
const { Panier, LignePanier, Oeuvre, Livre, Artisanat, sequelize } = require('../models');

class PanierService {
  
  // Récupère le panier actif de l'utilisateur, le crée si inexistant
  async getPanierActif(userId) {
    let panier = await Panier.findOne({
      where: { id_user: userId, actif: true },
      include: [{
        model: LignePanier,
        as: 'lignes',
        include: [{
          model: Oeuvre,
          as: 'oeuvre',
          attributes: ['id_oeuvre', 'titre', 'prix_vente', 'quantite_stock',
                       'type_produit', 'en_vente', 'reduction_pourcentage'],
        }],
      }],
    });

    if (!panier) {
      panier = await Panier.create({ id_user: userId });
      panier.lignes = [];
    }

    return this._formatPanier(panier);
  }

  // Ajouter ou incrémenter un produit
  async ajouterProduit(userId, idOeuvre, quantite = 1) {
    const oeuvre = await Oeuvre.findByPk(idOeuvre);

    if (!oeuvre) throw new Error('Produit introuvable');
    if (!oeuvre.en_vente) throw new Error('Ce produit n\'est pas disponible à la vente');
    if (oeuvre.quantite_stock < quantite) {
      throw new Error(`Stock insuffisant. Disponible : ${oeuvre.quantite_stock}`);
    }

    const panier = await Panier.findOne({ where: { id_user: userId, actif: true } })
      || await Panier.create({ id_user: userId });

    // Cherche si ce produit est déjà dans le panier
    const ligneExistante = await LignePanier.findOne({
      where: { id_panier: panier.id_panier, id_oeuvre: idOeuvre },
    });

    const prixActuel = this._calculerPrixAvecReduction(oeuvre);

    if (ligneExistante) {
      const nouvelleQte = ligneExistante.quantite + quantite;
      if (oeuvre.quantite_stock < nouvelleQte) {
        throw new Error(`Stock insuffisant pour cette quantité`);
      }
      await ligneExistante.update({ quantite: nouvelleQte });
    } else {
      await LignePanier.create({
        id_panier: panier.id_panier,
        id_oeuvre: idOeuvre,
        quantite,
        prix_unitaire_snapshot: prixActuel,
        type_produit_snapshot: oeuvre.type_produit,
      });
    }

    return this.getPanierActif(userId);
  }

  // Modifier la quantité d'une ligne
  async modifierQuantite(userId, idLigne, quantite) {
    if (quantite < 1) throw new Error('La quantité doit être au moins 1');

    const panier = await Panier.findOne({ where: { id_user: userId, actif: true } });
    if (!panier) throw new Error('Panier introuvable');

    const ligne = await LignePanier.findOne({
      where: { id_ligne: idLigne, id_panier: panier.id_panier },
      include: [{ model: Oeuvre, as: 'oeuvre' }],
    });
    if (!ligne) throw new Error('Ligne de panier introuvable');

    if (ligne.oeuvre.quantite_stock < quantite) {
      throw new Error(`Stock insuffisant. Disponible : ${ligne.oeuvre.quantite_stock}`);
    }

    await ligne.update({ quantite });
    return this.getPanierActif(userId);
  }

  // Supprimer une ligne
  async supprimerLigne(userId, idLigne) {
    const panier = await Panier.findOne({ where: { id_user: userId, actif: true } });
    if (!panier) throw new Error('Panier introuvable');

    const deleted = await LignePanier.destroy({
      where: { id_ligne: idLigne, id_panier: panier.id_panier },
    });
    if (!deleted) throw new Error('Ligne introuvable');

    return this.getPanierActif(userId);
  }

  // Vider le panier
  async viderPanier(userId) {
    const panier = await Panier.findOne({ where: { id_user: userId, actif: true } });
    if (panier) {
      await LignePanier.destroy({ where: { id_panier: panier.id_panier } });
    }
    return { success: true, message: 'Panier vidé' };
  }

  // Calcule le prix en tenant compte de la réduction
  _calculerPrixAvecReduction(oeuvre) {
    const prix = parseFloat(oeuvre.prix_vente || 0);
    const reduction = parseFloat(oeuvre.reduction_pourcentage || 0);
    if (reduction > 0) {
      return prix * (1 - reduction / 100);
    }
    return prix;
  }

  // Formate le panier avec les totaux calculés
  _formatPanier(panier) {
    const lignes = panier.lignes || [];
    const sousTotal = lignes.reduce((acc, l) => acc + parseFloat(l.prix_unitaire_snapshot) * l.quantite, 0);
    const nbArticles = lignes.reduce((acc, l) => acc + l.quantite, 0);

    return {
      id_panier: panier.id_panier,
      nb_articles: nbArticles,
      sous_total: sousTotal.toFixed(2),
      lignes: lignes.map(l => ({
        id_ligne: l.id_ligne,
        id_oeuvre: l.id_oeuvre,
        quantite: l.quantite,
        prix_unitaire: parseFloat(l.prix_unitaire_snapshot).toFixed(2),
        prix_total: (parseFloat(l.prix_unitaire_snapshot) * l.quantite).toFixed(2),
        type_produit: l.type_produit_snapshot,
        oeuvre: l.oeuvre ? {
          id: l.oeuvre.id_oeuvre,
          titre: l.oeuvre.titre,
          prix_actuel: l.oeuvre.prix_vente,
          stock: l.oeuvre.quantite_stock,
          // Alerte si le prix a changé depuis l'ajout
          prix_change: parseFloat(l.oeuvre.prix_vente) !== parseFloat(l.prix_unitaire_snapshot),
        } : null,
      })),
    };
  }
}

module.exports = new PanierService();
```

### 4.2 — Créer les routes panier

Créer `backend/routes/panierRoutes.js` :

```javascript
'use strict';
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');
const panierService = require('../services/panierService');

// GET /api/panier — Récupérer le panier de l'utilisateur connecté
router.get('/', authenticate, async (req, res) => {
  try {
    const panier = await panierService.getPanierActif(req.user.id_user);
    res.json({ success: true, data: panier });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/panier/ajouter — Ajouter un produit
router.post('/ajouter',
  authenticate,
  [
    body('id_oeuvre').isInt({ min: 1 }).withMessage('ID produit invalide'),
    body('quantite').optional().isInt({ min: 1, max: 99 }).withMessage('Quantité invalide'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id_oeuvre, quantite = 1 } = req.body;
      const panier = await panierService.ajouterProduit(req.user.id_user, id_oeuvre, quantite);
      res.status(201).json({ success: true, data: panier });
    } catch (err) {
      const code = err.message.includes('Stock') ? 409 : 400;
      res.status(code).json({ success: false, error: err.message });
    }
  }
);

// PUT /api/panier/ligne/:idLigne — Modifier la quantité d'une ligne
router.put('/ligne/:idLigne',
  authenticate,
  [
    param('idLigne').isInt({ min: 1 }),
    body('quantite').isInt({ min: 1, max: 99 }).withMessage('Quantité invalide (1-99)'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const panier = await panierService.modifierQuantite(
        req.user.id_user,
        parseInt(req.params.idLigne),
        req.body.quantite
      );
      res.json({ success: true, data: panier });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

// DELETE /api/panier/ligne/:idLigne — Supprimer une ligne
router.delete('/ligne/:idLigne',
  authenticate,
  param('idLigne').isInt({ min: 1 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const panier = await panierService.supprimerLigne(
        req.user.id_user,
        parseInt(req.params.idLigne)
      );
      res.json({ success: true, data: panier });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

// DELETE /api/panier — Vider le panier
router.delete('/', authenticate, async (req, res) => {
  try {
    await panierService.viderPanier(req.user.id_user);
    res.json({ success: true, message: 'Panier vidé' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
```

### 4.3 — Brancher la route dans `app.js` ou `server.js`

Trouve le fichier principal qui déclare les routes et ajoute :

```javascript
const panierRoutes = require('./routes/panierRoutes');
app.use('/api/panier', panierRoutes);
```

### 4.4 — Tester avec curl ou Postman

```bash
# 1. Se connecter pour obtenir un token
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"motdepasse"}'

# 2. Récupérer le panier (remplacer TOKEN)
curl http://localhost:3001/api/panier \
  -H "Authorization: Bearer TOKEN"

# 3. Ajouter un produit (remplacer id_oeuvre par un ID réel)
curl -X POST http://localhost:3001/api/panier/ajouter \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id_oeuvre": 1, "quantite": 2}'
```

## Livrable
- Service `PanierService` complet
- 5 routes panier fonctionnelles
- Tests Postman avec captures d'écran

## Critères de notation
| Critère | Points |
|---------|--------|
| Service PanierService : logique métier (snapshot prix, vérif stock) | 4 |
| Routes REST correctes (codes HTTP, validation) | 4 |
| Tests Postman passants | 2 |
| **Total** | **10** |

---

---

# TP 5 — API Commande (Checkout)
**Durée :** 3h

## Objectifs pédagogiques
- Transformer un panier en commande (transaction atomique SQL)
- Calculer les frais de port par wilaya
- Décrémenter le stock de façon sécurisée
- Comprendre les transactions Sequelize

---

## Étapes

### 5.1 — Créer le service `CommandeService`

Créer `backend/services/commandeService.js` :

```javascript
'use strict';
const { Commande, LigneCommande, Panier, LignePanier, Oeuvre, Livraison, sequelize } = require('../models');
const { STATUT_COMMANDE } = require('../constants/commerce');

// Frais de port par région (DZD)
const FRAIS_PORT = {
  centre: 500,  // Alger, Blida, Boumerdes, Tipaza
  est: 700,     // Constantine, Annaba, Sétif, Béjaïa
  ouest: 700,   // Oran, Tlemcen, Sidi Bel Abbès
  sud: 1200,    // Tamanrasset, Adrar, Ghardaïa, Ouargla
  defaut: 600,
};

const WILAYAS_CENTRE = [16, 9, 35, 42]; // IDs wilaya du centre
const WILAYAS_SUD = [11, 1, 47, 30, 8, 44, 3]; // IDs wilaya du sud

class CommandeService {

  calculerFraisPort(idWilaya, lignes) {
    // Livre numérique = pas de livraison
    const toutNumerique = lignes.every(l => l.type_produit_snapshot === 'livre_numerique');
    if (toutNumerique) return 0;

    if (WILAYAS_CENTRE.includes(idWilaya)) return FRAIS_PORT.centre;
    if (WILAYAS_SUD.includes(idWilaya)) return FRAIS_PORT.sud;
    return FRAIS_PORT.defaut;
  }

  // Créer une commande depuis le panier — opération atomique
  async creerDepuisPanier(userId, adresseLivraison, notesClient = '') {
    return sequelize.transaction(async (t) => {

      // 1. Récupérer le panier actif
      const panier = await Panier.findOne({
        where: { id_user: userId, actif: true },
        include: [{ model: LignePanier, as: 'lignes',
          include: [{ model: Oeuvre, as: 'oeuvre' }]
        }],
        transaction: t,
      });

      if (!panier || panier.lignes.length === 0) {
        throw new Error('Panier vide ou introuvable');
      }

      // 2. Vérifier le stock pour chaque ligne (et verrouiller les lignes)
      for (const ligne of panier.lignes) {
        const oeuvre = await Oeuvre.findByPk(ligne.id_oeuvre, {
          lock: t.LOCK.UPDATE,  // Verrou SQL pour éviter les races
          transaction: t,
        });
        if (!oeuvre.en_vente) throw new Error(`"${oeuvre.titre?.fr}" n'est plus disponible`);
        if (oeuvre.quantite_stock < ligne.quantite) {
          throw new Error(`Stock insuffisant pour "${oeuvre.titre?.fr}"`);
        }
      }

      // 3. Calculer les montants
      const montantProduits = panier.lignes.reduce((acc, l) =>
        acc + parseFloat(l.prix_unitaire_snapshot) * l.quantite, 0);
      const fraisPort = this.calculerFraisPort(adresseLivraison.id_wilaya, panier.lignes);
      const tva = montantProduits * (parseFloat(process.env.TVA_PERCENT || 19) / 100);
      const montantTotal = montantProduits + fraisPort + tva;

      // 4. Créer la commande
      const commande = await Commande.create({
        id_user: userId,
        statut: STATUT_COMMANDE.EN_ATTENTE,
        montant_produits: montantProduits.toFixed(2),
        montant_livraison: fraisPort.toFixed(2),
        montant_tva: tva.toFixed(2),
        montant_total: montantTotal.toFixed(2),
        adresse_livraison: adresseLivraison,
        notes_client: notesClient,
      }, { transaction: t });

      // 5. Créer les lignes de commande + décrémenter le stock
      for (const ligne of panier.lignes) {
        const oeuvre = ligne.oeuvre;

        await LigneCommande.create({
          id_commande: commande.id_commande,
          id_oeuvre: ligne.id_oeuvre,
          titre_snapshot: oeuvre.titre,
          type_produit: ligne.type_produit_snapshot,
          quantite: ligne.quantite,
          prix_unitaire: parseFloat(ligne.prix_unitaire_snapshot).toFixed(2),
          prix_total: (parseFloat(ligne.prix_unitaire_snapshot) * ligne.quantite).toFixed(2),
        }, { transaction: t });

        // Décrémenter le stock
        await oeuvre.decrement('quantite_stock', { by: ligne.quantite, transaction: t });

        // Si stock atteint 0 → mettre en_vente = false automatiquement
        if (oeuvre.quantite_stock - ligne.quantite <= 0) {
          await oeuvre.update({ en_vente: false }, { transaction: t });
        }
      }

      // 6. Créer l'entrée livraison (sauf si tout est numérique)
      const toutNumerique = panier.lignes.every(l => l.type_produit_snapshot === 'livre_numerique');
      if (!toutNumerique) {
        await Livraison.create({
          id_commande: commande.id_commande,
          frais_livraison: fraisPort,
          wilaya_destination: adresseLivraison.wilaya,
          adresse_complete: `${adresseLivraison.adresse}, ${adresseLivraison.wilaya}`,
        }, { transaction: t });
      }

      // 7. Désactiver le panier
      await panier.update({ actif: false }, { transaction: t });

      return commande;
    });
  }

  async getCommande(idCommande, userId) {
    const commande = await Commande.findOne({
      where: { id_commande: idCommande, id_user: userId },
      include: [
        { model: LigneCommande, as: 'lignes' },
        { model: Livraison, as: 'livraison' },
      ],
    });
    if (!commande) throw new Error('Commande introuvable');
    return commande;
  }

  async getMesCommandes(userId) {
    return Commande.findAll({
      where: { id_user: userId },
      include: [{ model: LigneCommande, as: 'lignes' }],
      order: [['date_creation', 'DESC']],
    });
  }

  async annulerCommande(idCommande, userId) {
    const commande = await Commande.findOne({
      where: { id_commande: idCommande, id_user: userId },
      include: [{ model: LigneCommande, as: 'lignes' }],
    });
    if (!commande) throw new Error('Commande introuvable');
    if (!commande.peutEtreAnnulee()) {
      throw new Error('Cette commande ne peut plus être annulée');
    }

    return sequelize.transaction(async (t) => {
      // Remettre le stock
      for (const ligne of commande.lignes) {
        await Oeuvre.increment('quantite_stock', {
          by: ligne.quantite,
          where: { id_oeuvre: ligne.id_oeuvre },
          transaction: t,
        });
      }
      await commande.update({ statut: STATUT_COMMANDE.ANNULEE }, { transaction: t });
      return commande;
    });
  }
}

module.exports = new CommandeService();
```

### 5.2 — Créer les routes commande

Créer `backend/routes/commandeRoutes.js` :

```javascript
'use strict';
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticate } = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');
const commandeService = require('../services/commandeService');

// POST /api/commandes — Créer une commande depuis le panier
router.post('/',
  authenticate,
  [
    body('adresse_livraison').isObject().withMessage('Adresse de livraison requise'),
    body('adresse_livraison.nom').notEmpty(),
    body('adresse_livraison.adresse').notEmpty(),
    body('adresse_livraison.wilaya').notEmpty(),
    body('adresse_livraison.telephone').notEmpty(),
    body('notes_client').optional().isString().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const commande = await commandeService.creerDepuisPanier(
        req.user.id_user,
        req.body.adresse_livraison,
        req.body.notes_client
      );
      res.status(201).json({ success: true, data: commande });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

// GET /api/commandes — Mes commandes
router.get('/', authenticate, async (req, res) => {
  try {
    const commandes = await commandeService.getMesCommandes(req.user.id_user);
    res.json({ success: true, data: commandes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/commandes/:id — Détail d'une commande
router.get('/:id',
  authenticate,
  param('id').isInt({ min: 1 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const commande = await commandeService.getCommande(parseInt(req.params.id), req.user.id_user);
      res.json({ success: true, data: commande });
    } catch (err) {
      res.status(404).json({ success: false, error: err.message });
    }
  }
);

// DELETE /api/commandes/:id — Annuler une commande
router.delete('/:id',
  authenticate,
  param('id').isInt({ min: 1 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const commande = await commandeService.annulerCommande(parseInt(req.params.id), req.user.id_user);
      res.json({ success: true, data: commande, message: 'Commande annulée' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
```

### 5.3 — Brancher dans `app.js`

```javascript
const commandeRoutes = require('./routes/commandeRoutes');
app.use('/api/commandes', commandeRoutes);
```

## Livrable
- Service `CommandeService` avec transactions SQL atomiques
- 4 routes commande
- Décrémentation stock vérifiée en base

## Critères de notation
| Critère | Points |
|---------|--------|
| Transaction SQL atomique (sequelize.transaction) | 4 |
| Calcul frais de port par wilaya | 2 |
| Décrémentation stock + mise en_vente=false | 2 |
| Annulation avec remise en stock | 2 |
| **Total** | **10** |

---

---

# TP 6 — Intégration Stripe (Paiement en ligne)
**Durée :** 4h  
> C'est le TP le plus important du module

## Objectifs pédagogiques
- Créer un `PaymentIntent` Stripe côté serveur
- Comprendre le flux : serveur → client → Stripe → webhook
- Implémenter le webhook de confirmation (sécurisé par signature)
- Mettre à jour la commande après paiement confirmé

## Le flux Stripe en 4 étapes

```
1. Client clique "Payer"
       ↓
2. Serveur crée un PaymentIntent → retourne client_secret
       ↓
3. Client utilise client_secret dans le formulaire Stripe.js
       ↓
4. Stripe envoie un webhook → serveur confirme la commande
```

---

## Étapes

### 6.1 — Créer le service Stripe

Créer `backend/services/stripeService.js` :

```javascript
'use strict';
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { Transaction, Commande, LigneCommande, Facture } = require('../models');
const { STATUT_PAIEMENT, STATUT_COMMANDE } = require('../constants/commerce');

class StripeService {

  // Étape 2 : créer un PaymentIntent
  async creerPaymentIntent(idCommande, userId, ipClient) {
    const commande = await Commande.findOne({
      where: { id_commande: idCommande, id_user: userId },
    });

    if (!commande) throw new Error('Commande introuvable');
    if (commande.statut !== STATUT_COMMANDE.EN_ATTENTE) {
      throw new Error('Cette commande a déjà été payée ou annulée');
    }

    // Stripe travaille en centimes (DZD = pas supporté nativement → utiliser EUR)
    // Note : Stripe ne supporte pas DZD — utiliser EUR ou USD pour les tests
    const montantCentimes = Math.round(parseFloat(commande.montant_total) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: montantCentimes,
      currency: 'eur', // Changer selon votre configuration Stripe
      metadata: {
        id_commande: String(idCommande),
        id_user: String(userId),
        numero_commande: commande.numero_commande,
      },
      description: `Commande EventCulture ${commande.numero_commande}`,
    });

    // Sauvegarder la transaction en base
    await Transaction.create({
      id_commande: idCommande,
      id_user: userId,
      statut: STATUT_PAIEMENT.EN_ATTENTE,
      methode_paiement: 'stripe',
      montant: commande.montant_total,
      devise: 'EUR',
      reference_externe: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      ip_acheteur: ipClient,
    });

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      montant: commande.montant_total,
    };
  }

  // Étape 4 : traiter le webhook Stripe
  async traiterWebhook(payload, signature) {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new Error(`Webhook signature invalide: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this._onPaiementSucces(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this._onPaiementEchec(event.data.object);
        break;
      case 'charge.refunded':
        await this._onRemboursement(event.data.object);
        break;
      default:
        console.log(`Webhook Stripe non géré : ${event.type}`);
    }

    return { received: true };
  }

  async _onPaiementSucces(paymentIntent) {
    const transaction = await Transaction.findOne({
      where: { reference_externe: paymentIntent.id },
    });
    if (!transaction) return;

    await transaction.update({
      statut: STATUT_PAIEMENT.SUCCES,
      gateway_response: paymentIntent,
    });

    await Commande.update(
      { statut: STATUT_COMMANDE.CONFIRMEE, date_confirmation: new Date() },
      { where: { id_commande: transaction.id_commande } }
    );

    // Déclencher la génération de facture (TP 8)
    // await factureService.generer(transaction.id_commande);
  }

  async _onPaiementEchec(paymentIntent) {
    const transaction = await Transaction.findOne({
      where: { reference_externe: paymentIntent.id },
    });
    if (!transaction) return;

    await transaction.update({
      statut: STATUT_PAIEMENT.ECHEC,
      gateway_response: paymentIntent,
    });
  }

  async _onRemboursement(charge) {
    const transaction = await Transaction.findOne({
      where: { reference_externe: charge.payment_intent },
    });
    if (!transaction) return;

    await transaction.update({
      statut: STATUT_PAIEMENT.REMBOURSE,
      montant_rembourse: charge.amount_refunded / 100,
      date_remboursement: new Date(),
    });

    await Commande.update(
      { statut: STATUT_COMMANDE.REMBOURSEE },
      { where: { id_commande: transaction.id_commande } }
    );
  }
}

module.exports = new StripeService();
```

### 6.2 — Créer les routes paiement

Créer `backend/routes/paiementRoutes.js` :

```javascript
'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');
const stripeService = require('../services/stripeService');

// POST /api/paiements/stripe/initier — Créer un PaymentIntent
router.post('/stripe/initier',
  authenticate,
  [body('id_commande').isInt({ min: 1 })],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await stripeService.creerPaymentIntent(
        req.body.id_commande,
        req.user.id_user,
        req.ip
      );
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

// POST /api/paiements/stripe/webhook — Webhook Stripe
// ⚠️ IMPORTANT : ce endpoint doit recevoir le body RAW (pas JSON parsé)
router.post('/stripe/webhook',
  express.raw({ type: 'application/json' }),  // body brut requis pour la vérification de signature
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    try {
      await stripeService.traiterWebhook(req.body, signature);
      res.json({ received: true });
    } catch (err) {
      console.error('Webhook Stripe error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
);

// GET /api/paiements/:idCommande/statut — Vérifier le statut d'un paiement
router.get('/:idCommande/statut',
  authenticate,
  async (req, res) => {
    try {
      const { Transaction, Commande } = require('../models');
      const transaction = await Transaction.findOne({
        where: { id_commande: req.params.idCommande },
        include: [{ model: Commande, as: 'commande', where: { id_user: req.user.id_user } }],
      });
      if (!transaction) return res.status(404).json({ success: false, error: 'Introuvable' });
      res.json({ success: true, data: { statut: transaction.statut, methode: transaction.methode_paiement } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
```

### 6.3 — Brancher dans `app.js`

```javascript
const paiementRoutes = require('./routes/paiementRoutes');

// ⚠️ Le webhook Stripe doit être monté AVANT le middleware JSON global
// car il nécessite le body RAW
app.use('/api/paiements', paiementRoutes);
```

### 6.4 — Tester avec Stripe CLI

```bash
# Installer Stripe CLI : https://stripe.com/docs/stripe-cli
# Puis écouter les webhooks en local :
stripe listen --forward-to http://localhost:3001/api/paiements/stripe/webhook

# Dans un autre terminal, simuler un paiement réussi :
stripe trigger payment_intent.succeeded
```

## Livrable
- `StripeService` avec PaymentIntent + webhook
- Webhook sécurisé par signature
- Commande mise à jour automatiquement après paiement
- Test avec Stripe CLI passant

## Critères de notation
| Critère | Points |
|---------|--------|
| PaymentIntent créé et retourné correctement | 3 |
| Webhook avec vérification de signature | 4 |
| Commande confirmée après webhook succes | 2 |
| Gestion échec + remboursement | 1 |
| **Total** | **10** |

---

---

# TP 7 — Intégration Slick-Pay (CIB / BaridiMob Algérie)
**Durée :** 3h

## Objectifs pédagogiques
- Intégrer une API de paiement locale algérienne
- Comprendre le flux de redirection (différent de Stripe)
- Gérer les callbacks de paiement

## Le flux Slick-Pay

```
1. Serveur crée une session de paiement → reçoit une URL
2. Client est redirigé vers la page de paiement Slick-Pay
3. Client paie (CIB, BaridiMob, Dahabia)
4. Slick-Pay redirige vers success_url ou cancel_url
5. Serveur vérifie le statut via l'API
```

---

## Étapes

### 7.1 — Service Slick-Pay

Créer `backend/services/slickPayService.js` :

```javascript
'use strict';
const axios = require('axios');
const { Transaction, Commande } = require('../models');
const { STATUT_PAIEMENT, STATUT_COMMANDE } = require('../constants/commerce');

const SLICKPAY_BASE_URL = process.env.SLICKPAY_BASE_URL || 'https://api.slick-pay.com/v2';

class SlickPayService {

  _headers() {
    return {
      'Authorization': `Bearer ${process.env.SLICKPAY_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  // Créer une session de paiement
  async creerSession(idCommande, userId) {
    const commande = await Commande.findOne({
      where: { id_commande: idCommande, id_user: userId },
    });
    if (!commande) throw new Error('Commande introuvable');

    const payload = {
      amount: parseFloat(commande.montant_total),
      currency: 'DZD',
      order_id: commande.numero_commande,
      description: `Commande EventCulture ${commande.numero_commande}`,
      success_url: `${process.env.FRONTEND_URL}/commande/${idCommande}/succes`,
      cancel_url: `${process.env.FRONTEND_URL}/commande/${idCommande}/annule`,
      callback_url: `${process.env.BACKEND_URL}/api/paiements/slickpay/callback`,
      customer: {
        email: commande.adresse_livraison?.email || '',
        phone: commande.adresse_livraison?.telephone || '',
      },
    };

    const response = await axios.post(
      `${SLICKPAY_BASE_URL}/payment/create`,
      payload,
      { headers: this._headers() }
    );

    const { transaction_id, payment_url } = response.data;

    // Sauvegarder la transaction
    await Transaction.create({
      id_commande: idCommande,
      id_user: userId,
      statut: STATUT_PAIEMENT.EN_ATTENTE,
      methode_paiement: 'cib',  // Sera mis à jour par le callback
      montant: commande.montant_total,
      devise: 'DZD',
      reference_externe: transaction_id,
      gateway_response: response.data,
    });

    return { payment_url, transaction_id };
  }

  // Vérifier le statut d'une transaction via l'API
  async verifierStatut(transactionId) {
    const response = await axios.get(
      `${SLICKPAY_BASE_URL}/payment/${transactionId}/status`,
      { headers: this._headers() }
    );
    return response.data;
  }

  // Traiter le callback de Slick-Pay
  async traiterCallback(data) {
    const { transaction_id, status, payment_method } = data;

    const transaction = await Transaction.findOne({
      where: { reference_externe: transaction_id },
    });
    if (!transaction) throw new Error('Transaction introuvable');

    // Vérifier le statut en double (ne pas faire confiance au callback seul)
    const statut = await this.verifierStatut(transaction_id);

    if (statut.status === 'paid') {
      await transaction.update({
        statut: STATUT_PAIEMENT.SUCCES,
        methode_paiement: payment_method || 'cib',
        gateway_response: statut,
      });
      await Commande.update(
        { statut: STATUT_COMMANDE.CONFIRMEE, date_confirmation: new Date() },
        { where: { id_commande: transaction.id_commande } }
      );
    } else if (statut.status === 'failed') {
      await transaction.update({
        statut: STATUT_PAIEMENT.ECHEC,
        gateway_response: statut,
      });
    }

    return transaction;
  }
}

module.exports = new SlickPayService();
```

### 7.2 — Ajouter les routes Slick-Pay

Dans `backend/routes/paiementRoutes.js`, ajouter après les routes Stripe :

```javascript
const slickPayService = require('../services/slickPayService');

// POST /api/paiements/slickpay/initier
router.post('/slickpay/initier',
  authenticate,
  [body('id_commande').isInt({ min: 1 })],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await slickPayService.creerSession(req.body.id_commande, req.user.id_user);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

// POST /api/paiements/slickpay/callback — Callback de Slick-Pay
router.post('/slickpay/callback', async (req, res) => {
  try {
    await slickPayService.traiterCallback(req.body);
    res.json({ received: true });
  } catch (err) {
    console.error('Callback Slick-Pay error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/paiements/slickpay/succes — Page de retour succès
router.get('/slickpay/succes', authenticate, async (req, res) => {
  res.json({ success: true, message: 'Paiement en cours de vérification' });
});
```

## Livrable
- Service `SlickPayService` complet
- Routes initier + callback opérationnelles
- Vérification du statut en double côté serveur

## Critères de notation
| Critère | Points |
|---------|--------|
| Session de paiement créée | 3 |
| Callback traité avec vérification double | 4 |
| Commande mise à jour après paiement | 3 |
| **Total** | **10** |

---

---

# TP 8 — Génération de Factures PDF
**Durée :** 2h30

## Objectifs pédagogiques
- Utiliser `pdfkit` (déjà installé) pour générer une facture professionnelle
- Uploader le PDF sur Cloudinary (déjà configuré)
- Envoyer la facture par email (nodemailer déjà installé)
- Générer des liens de téléchargement sécurisés (livres numériques)

---

## Étapes

### 8.1 — Service de génération de factures

Créer `backend/services/factureService.js` :

```javascript
'use strict';
const PDFDocument = require('pdfkit');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const { Commande, LigneCommande, User, Facture } = require('../models');
const { v4: uuidv4 } = require('uuid');

class FactureService {

  async generer(idCommande) {
    const commande = await Commande.findByPk(idCommande, {
      include: [
        { model: LigneCommande, as: 'lignes' },
        { model: User, as: 'acheteur', attributes: ['email', 'nom', 'prenom'] },
      ],
    });
    if (!commande) throw new Error('Commande introuvable');

    const numeroFacture = `FACT-${new Date().getFullYear()}-${String(idCommande).padStart(6, '0')}`;

    // Générer le PDF en mémoire
    const pdfBuffer = await this._genererPDF(commande, numeroFacture);

    // Uploader sur Cloudinary
    const url = await this._uploaderCloudinary(pdfBuffer, numeroFacture);

    // Sauvegarder en base
    const adresse = commande.adresse_livraison || {};
    const nomAcheteur = typeof commande.acheteur.nom === 'object'
      ? commande.acheteur.nom.fr
      : commande.acheteur.nom;

    const facture = await Facture.create({
      id_commande: idCommande,
      id_user: commande.id_user,
      numero_facture: numeroFacture,
      url_pdf: url,
      montant_ht: parseFloat(commande.montant_produits),
      taux_tva: parseFloat(process.env.TVA_PERCENT || 19),
      montant_tva: parseFloat(commande.montant_tva),
      montant_ttc: parseFloat(commande.montant_total),
      nom_acheteur: `${adresse.prenom || ''} ${adresse.nom || nomAcheteur}`.trim(),
      adresse_facturation: adresse.adresse || '',
      email_acheteur: commande.acheteur.email,
    });

    // Envoyer par email
    await this._envoyerEmail(commande.acheteur.email, facture, url);

    return facture;
  }

  async _genererPDF(commande, numeroFacture) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(22).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`N° ${numeroFacture}`, { align: 'center' });
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
      doc.moveDown(1);

      // Vendeur
      doc.font('Helvetica-Bold').text('EventCulture Algérie');
      doc.font('Helvetica').text('contact@eventculture.dz');
      doc.moveDown(1);

      // Acheteur
      const adresse = commande.adresse_livraison || {};
      doc.font('Helvetica-Bold').text('Facturé à :');
      doc.font('Helvetica')
        .text(`${adresse.prenom || ''} ${adresse.nom || ''}`)
        .text(adresse.adresse || '')
        .text(adresse.wilaya || '');
      doc.moveDown(1);

      // Ligne de séparation
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Tableau des produits
      doc.font('Helvetica-Bold');
      doc.text('Produit', 50, doc.y, { width: 250 });
      doc.text('Qté', 310, doc.y - doc.currentLineHeight(), { width: 50 });
      doc.text('Prix unit.', 370, doc.y - doc.currentLineHeight(), { width: 80 });
      doc.text('Total', 460, doc.y - doc.currentLineHeight(), { width: 80 });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica');
      for (const ligne of commande.lignes) {
        const titre = typeof ligne.titre_snapshot === 'object'
          ? ligne.titre_snapshot.fr || ''
          : ligne.titre_snapshot;
        const y = doc.y;
        doc.text(titre.substring(0, 40), 50, y, { width: 250 });
        doc.text(String(ligne.quantite), 310, y, { width: 50 });
        doc.text(`${parseFloat(ligne.prix_unitaire).toFixed(2)} DZD`, 370, y, { width: 80 });
        doc.text(`${parseFloat(ligne.prix_total).toFixed(2)} DZD`, 460, y, { width: 80 });
        doc.moveDown();
      }

      // Totaux
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      const montantProduits = parseFloat(commande.montant_produits);
      const fraisPort = parseFloat(commande.montant_livraison);
      const tva = parseFloat(commande.montant_tva);
      const total = parseFloat(commande.montant_total);

      doc.text(`Sous-total HT : ${montantProduits.toFixed(2)} DZD`, { align: 'right' });
      if (fraisPort > 0) doc.text(`Frais de port : ${fraisPort.toFixed(2)} DZD`, { align: 'right' });
      doc.text(`TVA (19%) : ${tva.toFixed(2)} DZD`, { align: 'right' });
      doc.font('Helvetica-Bold').text(`TOTAL TTC : ${total.toFixed(2)} DZD`, { align: 'right' });

      doc.end();
    });
  }

  async _uploaderCloudinary(buffer, numeroFacture) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'factures', public_id: numeroFacture, resource_type: 'raw', format: 'pdf' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });
  }

  async _envoyerEmail(email, facture, urlPdf) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: '"EventCulture" <noreply@eventculture.dz>',
      to: email,
      subject: `Votre facture ${facture.numero_facture}`,
      html: `
        <h2>Merci pour votre commande !</h2>
        <p>Votre facture <strong>${facture.numero_facture}</strong> est disponible.</p>
        <p><a href="${urlPdf}">Télécharger la facture PDF</a></p>
        <p>Montant total : <strong>${facture.montant_ttc} DZD</strong></p>
      `,
    });
  }

  // Générer un lien de téléchargement sécurisé pour livre numérique
  genererLienTelechargement(urlFichier, expirationHeures = 48) {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + expirationHeures);

    // Utiliser un lien Cloudinary signé (expire après X heures)
    const lienSigne = cloudinary.url(urlFichier, {
      sign_url: true,
      expires_at: Math.floor(expiration.getTime() / 1000),
    });

    return { url: lienSigne, expire_le: expiration };
  }
}

module.exports = new FactureService();
```

### 8.2 — Appeler la génération après paiement

Dans `stripeService.js`, décommenter la ligne dans `_onPaiementSucces` :

```javascript
const factureService = require('./factureService');

async _onPaiementSucces(paymentIntent) {
  // ... code existant ...
  
  // Générer la facture automatiquement
  await factureService.generer(transaction.id_commande);
}
```

### 8.3 — Route pour télécharger sa facture

Dans `backend/routes/commandeRoutes.js`, ajouter :

```javascript
const factureService = require('../services/factureService');

// GET /api/commandes/:id/facture
router.get('/:id/facture', authenticate, async (req, res) => {
  try {
    const { Facture } = require('../models');
    const facture = await Facture.findOne({
      where: { id_commande: req.params.id, id_user: req.user.id_user },
    });
    if (!facture) return res.status(404).json({ success: false, error: 'Facture introuvable' });
    res.json({ success: true, data: { url_pdf: facture.url_pdf, numero: facture.numero_facture } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

## Livrable
- PDF de facture généré et uploadé sur Cloudinary
- Email envoyé à l'acheteur
- Capture d'écran d'une facture générée

## Critères de notation
| Critère | Points |
|---------|--------|
| PDF généré avec pdfkit (mise en page propre) | 4 |
| Upload Cloudinary réussi | 3 |
| Email envoyé avec lien facture | 2 |
| Lien de téléchargement signé pour livre numérique | 1 |
| **Total** | **10** |

---

---

# TP 9 — Tableau de Bord Vendeur & Commissions
**Durée :** 3h

## Objectifs pédagogiques
- Construire des requêtes Sequelize d'agrégation (SUM, COUNT, GROUP BY)
- Calculer les commissions artisan/auteur/plateforme
- Créer un dashboard vendeur avec statistiques

---

## Étapes

### 9.1 — Service dashboard vendeur

Créer `backend/services/vendeurService.js` :

```javascript
'use strict';
const { sequelize, Commande, LigneCommande, Transaction, Oeuvre } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

const COMMISSION_PLATEFORME = parseFloat(process.env.COMMISSION_PLATFORM_PERCENT || 20) / 100;

class VendeurService {

  // Calculer la commission du vendeur sur une ligne
  calculerCommission(prixTotal) {
    const commissionPlateforme = prixTotal * COMMISSION_PLATEFORME;
    return {
      commission_plateforme: commissionPlateforme.toFixed(2),
      revenu_vendeur: (prixTotal - commissionPlateforme).toFixed(2),
    };
  }

  // Statistiques globales du vendeur
  async getStatistiquesVendeur(userId, periode = '30j') {
    const dateDebut = new Date();
    if (periode === '7j') dateDebut.setDate(dateDebut.getDate() - 7);
    else if (periode === '30j') dateDebut.setDate(dateDebut.getDate() - 30);
    else if (periode === '1an') dateDebut.setFullYear(dateDebut.getFullYear() - 1);

    // Commandes confirmées contenant des produits de ce vendeur
    const lignes = await LigneCommande.findAll({
      where: { id_vendeur: userId },
      include: [{
        model: Commande,
        as: 'commande',
        where: {
          statut: { [Op.in]: ['confirmee', 'en_preparation', 'expediee', 'livree'] },
          date_creation: { [Op.gte]: dateDebut },
        },
        attributes: [],
      }],
      attributes: [
        [fn('COUNT', col('LigneCommande.id_ligne')), 'nb_ventes'],
        [fn('SUM', col('quantite')), 'nb_articles'],
        [fn('SUM', col('prix_total')), 'chiffre_affaires'],
        [fn('SUM', col('commission_vendeur')), 'total_commissions'],
      ],
      raw: true,
    });

    const stats = lignes[0] || {};

    return {
      periode,
      nb_ventes: parseInt(stats.nb_ventes || 0),
      nb_articles: parseInt(stats.nb_articles || 0),
      chiffre_affaires: parseFloat(stats.chiffre_affaires || 0).toFixed(2),
      revenus_nets: parseFloat(stats.total_commissions || 0).toFixed(2),
    };
  }

  // Top produits du vendeur
  async getTopProduits(userId, limit = 5) {
    return LigneCommande.findAll({
      where: { id_vendeur: userId },
      include: [{
        model: Commande,
        as: 'commande',
        where: { statut: { [Op.in]: ['confirmee', 'livree'] } },
        attributes: [],
      }],
      attributes: [
        'id_oeuvre',
        'titre_snapshot',
        [fn('SUM', col('quantite')), 'total_vendu'],
        [fn('SUM', col('prix_total')), 'total_ca'],
      ],
      group: ['id_oeuvre', 'titre_snapshot'],
      order: [[literal('total_vendu'), 'DESC']],
      limit,
      raw: true,
    });
  }

  // Mes commandes à traiter (en_preparation → à expédier)
  async getCommandesATraiter(userId) {
    const lignes = await LigneCommande.findAll({
      where: { id_vendeur: userId },
      include: [{
        model: Commande,
        as: 'commande',
        where: { statut: 'en_preparation' },
      }],
    });

    // Regrouper par commande
    const commandesMap = {};
    for (const ligne of lignes) {
      const id = ligne.id_commande;
      if (!commandesMap[id]) {
        commandesMap[id] = { commande: ligne.commande, lignes: [] };
      }
      commandesMap[id].lignes.push(ligne);
    }

    return Object.values(commandesMap);
  }
}

module.exports = new VendeurService();
```

### 9.2 — Routes dashboard vendeur

Créer `backend/routes/vendeurRoutes.js` :

```javascript
'use strict';
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const vendeurService = require('../services/vendeurService');

// GET /api/vendeur/stats?periode=30j
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await vendeurService.getStatistiquesVendeur(
      req.user.id_user,
      req.query.periode || '30j'
    );
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vendeur/top-produits
router.get('/top-produits', authenticate, async (req, res) => {
  try {
    const produits = await vendeurService.getTopProduits(req.user.id_user);
    res.json({ success: true, data: produits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vendeur/commandes-a-traiter
router.get('/commandes-a-traiter', authenticate, async (req, res) => {
  try {
    const commandes = await vendeurService.getCommandesATraiter(req.user.id_user);
    res.json({ success: true, data: commandes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
```

## Livrable
- Endpoint `/api/vendeur/stats` retournant les vraies statistiques
- Top 5 produits les plus vendus
- Liste des commandes à traiter

## Critères de notation
| Critère | Points |
|---------|--------|
| Requêtes Sequelize SUM/COUNT correctes | 4 |
| Calcul commissions correct | 3 |
| Routes vendeur sécurisées | 3 |
| **Total** | **10** |

---

---

# TP 10 — Tests & Sécurité
**Durée :** 3h

## Objectifs pédagogiques
- Écrire des tests d'intégration pour les routes critiques
- Identifier et corriger les vulnérabilités du module commerce
- Tester les cas d'erreur (stock insuffisant, double paiement, etc.)

---

## Étapes

### 10.1 — Tests d'intégration du panier

Créer `backend/tests/commerce/panier.test.js` :

```javascript
'use strict';
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Oeuvre } = require('../../models');

let token;
let idOeuvreTest;

beforeAll(async () => {
  // Créer un user de test et obtenir un token
  const loginRes = await request(app)
    .post('/api/users/login')
    .send({ email: 'test@eventculture.dz', password: 'Test1234!' });
  token = loginRes.body.token;

  // Créer un produit de test
  const oeuvre = await Oeuvre.create({
    titre: { fr: 'Livre test', ar: '', en: '' },
    en_vente: true,
    quantite_stock: 10,
    prix_vente: 1500,
    type_produit: 'livre_papier',
    statut: 'publie',
  });
  idOeuvreTest = oeuvre.id_oeuvre;
});

afterAll(async () => {
  await Oeuvre.destroy({ where: { id_oeuvre: idOeuvreTest } });
  await sequelize.close();
});

describe('Panier - GET /api/panier', () => {
  test('Retourne 401 sans token', async () => {
    const res = await request(app).get('/api/panier');
    expect(res.status).toBe(401);
  });

  test('Retourne le panier vide pour user authentifié', async () => {
    const res = await request(app)
      .get('/api/panier')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lignes).toBeInstanceOf(Array);
  });
});

describe('Panier - Ajouter produit', () => {
  test('Ajoute un produit au panier', async () => {
    const res = await request(app)
      .post('/api/panier/ajouter')
      .set('Authorization', `Bearer ${token}`)
      .send({ id_oeuvre: idOeuvreTest, quantite: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.nb_articles).toBe(2);
  });

  test('Rejette une quantité supérieure au stock', async () => {
    const res = await request(app)
      .post('/api/panier/ajouter')
      .set('Authorization', `Bearer ${token}`)
      .send({ id_oeuvre: idOeuvreTest, quantite: 999 });
    expect(res.status).toBe(409);
  });

  test('Rejette un id_oeuvre invalide', async () => {
    const res = await request(app)
      .post('/api/panier/ajouter')
      .set('Authorization', `Bearer ${token}`)
      .send({ id_oeuvre: 'abc' });
    expect(res.status).toBe(422);
  });
});
```

### 10.2 — Checklist sécurité à vérifier

Pour chaque point, écris dans ton rapport si c'est **OK** ou **À CORRIGER** avec une explication.

**Authentification & Autorisation :**
- [ ] Un user peut-il voir les commandes d'un autre user ?
- [ ] Un user peut-il supprimer le panier d'un autre user ?
- [ ] Le webhook Stripe vérifie-t-il bien la signature ?
- [ ] Le webhook Slick-Pay est-il protégé contre la falsification ?

**Données & Injection :**
- [ ] Les champs `quantite` sont-ils bien validés (min=1, max=99) ?
- [ ] Le prix est-il pris du panier (snapshot) et non du body de la requête ?
- [ ] Les montants calculés côté serveur (jamais côté client) ?

**Business Logic :**
- [ ] Le stock est-il décrémenté de façon atomique (transaction SQL) ?
- [ ] Une commande déjà payée peut-elle être re-payée ?
- [ ] Un panier vide peut-il créer une commande ?

### 10.3 — Lancer les tests

```bash
cd backend
npm test -- --testPathPattern=commerce
```

## Livrable
- Tests d'intégration passants (au moins 6 tests)
- Rapport de sécurité (checklist remplie)
- Tous les tests `npm test` verts

## Critères de notation
| Critère | Points |
|---------|--------|
| Tests d'intégration panier (3+ cas) | 4 |
| Checklist sécurité complète | 4 |
| Au moins 1 vulnérabilité identifiée et corrigée | 2 |
| **Total** | **10** |

---

---

## Grille d'évaluation finale

| TP | Thème | Points |
|----|-------|--------|
| TP 1 | Analyse + Setup + Constantes | 10 |
| TP 2 | Modèles Panier & Commande | 10 |
| TP 3 | Modèles Transaction, Facture, Livraison | 10 |
| TP 4 | API Panier (Service + Routes) | 10 |
| TP 5 | API Commande + Checkout (Transactions SQL) | 10 |
| TP 6 | Intégration Stripe | 10 |
| TP 7 | Intégration Slick-Pay (CIB/BaridiMob) | 10 |
| TP 8 | Génération Factures PDF | 10 |
| TP 9 | Dashboard Vendeur + Commissions | 10 |
| TP 10 | Tests & Sécurité | 10 |
| **Bonus** | Code propre, validation complète, gestion erreurs | +10 |
| **Total** | | **100 (+10)** |

---

## Flux complet à la fin des 10 TPs

```
Utilisateur connecté
    │
    ├─► POST /api/panier/ajouter        ← Panier
    ├─► GET  /api/panier                ← Voir le panier
    │
    ├─► POST /api/commandes             ← Checkout (panier → commande)
    │         └── Décrément stock (transaction SQL)
    │         └── Calcul frais port par wilaya
    │
    ├─► POST /api/paiements/stripe/initier   ← Payer par carte
    │         └── Stripe renvoie client_secret
    │         └── Client complète le paiement sur Stripe.js
    │         └── Webhook → commande confirmée + facture générée
    │
    ├─► POST /api/paiements/slickpay/initier ← Payer CIB/BaridiMob
    │         └── Redirect vers page Slick-Pay
    │         └── Callback → commande confirmée + facture générée
    │
    ├─► GET  /api/commandes/:id/facture ← Télécharger sa facture PDF
    └─► GET  /api/vendeur/stats         ← Dashboard vendeur
```

---

## Ressources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI — tester les webhooks en local](https://stripe.com/docs/stripe-cli)
- [Sequelize Transactions](https://sequelize.org/docs/v6/other-topics/transactions/)
- [PDFKit](https://pdfkit.org/)
- [Slick-Pay Documentation](https://slick-pay.com/docs) *(inscription requise)*
