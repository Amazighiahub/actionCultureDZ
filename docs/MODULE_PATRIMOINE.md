# 📚 Documentation Module Patrimoine - Action Culture DZ

## 🎯 Vue d'ensemble

Le module **Patrimoine** gère les sites patrimoniaux algériens : monuments, musées, sites archéologiques, édifices religieux, etc. Il inclut également les **parcours intelligents** qui permettent de créer des itinéraires touristiques automatiques.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Pages:                    │  Services:                             │
│  - Patrimoine.tsx          │  - patrimoine.service.ts               │
│  - PatrimoineDetail.tsx    │  - lieu.service.ts                     │
│  - AjouterPatrimoine.tsx   │  - parcours.service.ts                 │
│                            │                                        │
│  Composants:               │  Hooks:                                │
│  - CartePatrimoine.tsx     │  - useLieuSearch.ts                    │
│  - LieuSelector.tsx        │                                        │
│  - VisitePlanner.tsx       │                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ API REST
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node.js/Express)                 │
├─────────────────────────────────────────────────────────────────────┤
│  Routes:                   │  Controllers:                          │
│  - patrimoineRoutes.js     │  - PatrimoineController.js             │
│  - lieuRoutes.js           │  - LieuController.js                   │
│                            │  - ParcoursIntelligentController.js    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Sequelize ORM
┌─────────────────────────────────────────────────────────────────────┐
│                           BASE DE DONNÉES (MySQL)                   │
├─────────────────────────────────────────────────────────────────────┤
│  Tables principales:       │  Tables associatives:                  │
│  - lieu                    │  - parcours_lieux                      │
│  - detail_lieux            │  - lieu_medias                         │
│  - monuments               │  - services                            │
│  - vestiges                │                                        │
│  - parcours                │                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des fichiers

### Backend

```
backend/
├── models/
│   ├── places/
│   │   ├── Lieu.js           # Modèle principal des lieux
│   │   ├── DetailLieu.js     # Détails (description, horaires, histoire)
│   │   ├── Monument.js       # Monuments d'un lieu
│   │   ├── Vestige.js        # Vestiges archéologiques
│   │   ├── Service.js        # Services disponibles (restaurant, guide...)
│   │   └── LieuMedia.js      # Photos et vidéos
│   ├── events/
│   │   └── Parcours.js       # Parcours touristiques
│   └── associations/
│       └── ParcoursLieu.js   # Liaison parcours ↔ lieux (avec ordre)
│
├── controllers/
│   ├── LieuController.js              # CRUD lieux + services
│   ├── PatrimoineController.js        # Sites patrimoniaux + QR codes
│   └── ParcoursIntelligentController.js # Génération parcours auto
│
└── routes/
    ├── lieuRoutes.js         # /api/lieux/*
    └── patrimoineRoutes.js   # /api/patrimoine/*
```

### Frontend

```
frontEnd/src/
├── pages/
│   ├── Patrimoine.tsx           # Liste des sites patrimoniaux
│   ├── PatrimoineDetail.tsx     # Détail d'un site (onglets dynamiques)
│   └── admin/
│       ├── AjouterPatrimoine.tsx    # Formulaire création/édition
│       └── AdminPatrimoineTab.tsx   # Gestion admin
│
├── components/
│   ├── CartePatrimoine.tsx      # Carte interactive Leaflet
│   ├── LieuSelector.tsx         # Sélecteur de lieu avec recherche
│   ├── PatrimoineSection.tsx    # Section homepage
│   └── patrimoine/
│       └── VisitePlanner.tsx    # Planificateur de visite
│
└── services/
    ├── patrimoine.service.ts    # Appels API patrimoine
    ├── lieu.service.ts          # Appels API lieux
    └── parcours.service.ts      # Appels API parcours
```

---

## 📊 Modèles de données

### 1. Lieu (Table: `lieu`)

Le modèle central qui représente un site patrimonial.

```javascript
{
  id_lieu: INTEGER (PK, auto-increment),
  
  // Type de division administrative
  typeLieu: ENUM('Wilaya', 'Daira', 'Commune'),
  
  // ⚡ Type de patrimoine (détermine les onglets affichés)
  typePatrimoine: ENUM(
    'ville_village',       // → onglets: monuments, vestiges, musées, parcours
    'monument',            // → onglets: programmes, services, galerie, histoire
    'musee',               // → onglets: programmes, collections, services
    'site_archeologique',  // → onglets: vestiges, programmes, services
    'site_naturel',        // → onglets: parcours, services, faune_flore
    'edifice_religieux',   // → onglets: programmes, services, histoire
    'palais_forteresse',   // → onglets: monuments, programmes, services
    'autre'
  ),
  
  // Localisation
  communeId: INTEGER (FK → communes.id_commune),
  localiteId: INTEGER (FK → localite.id_localite, nullable),
  latitude: FLOAT (-90 à 90),
  longitude: FLOAT (-180 à 180),
  
  // ⚡ Champs multilingues (JSON)
  nom: JSON { fr: "Casbah d'Alger", ar: "قصبة الجزائر", en: "Casbah of Algiers" },
  adresse: JSON { fr: "...", ar: "...", en: "..." },
  
  // Timestamps
  createdAt, updatedAt
}
```

**Relations:**
- `belongsTo` Commune → Daira → Wilaya (géographie)
- `hasOne` DetailLieu (détails étendus)
- `hasMany` Service, LieuMedia, QRCode, Evenement, Programme
- `belongsToMany` Parcours (via ParcoursLieu)

---

### 2. DetailLieu (Table: `detail_lieux`)

Informations détaillées d'un lieu (relation 1:1 avec Lieu).

```javascript
{
  id_detailLieu: INTEGER (PK),
  id_lieu: INTEGER (FK, unique),
  
  // ⚡ Champs multilingues (JSON)
  description: JSON { fr: "...", ar: "...", en: "..." },
  horaires: JSON { fr: "9h-17h", ar: "٩-١٧", en: "9am-5pm" },
  histoire: JSON { fr: "...", ar: "...", en: "..." },
  referencesHistoriques: JSON,
  
  noteMoyenne: FLOAT (0-5)
}
```

**Relations:**
- `belongsTo` Lieu
- `hasMany` Monument, Vestige

---

### 3. Monument (Table: `monuments`)

Monuments contenus dans un lieu (ex: mosquées dans une ville).

```javascript
{
  id: INTEGER (PK),
  id_detail_lieu: INTEGER (FK → detail_lieux),
  
  // ⚡ Champs multilingues
  nom: JSON { fr: "Grande Mosquée", ar: "الجامع الكبير" },
  description: JSON,
  
  type: ENUM('Mosquée', 'Palais', 'Statue', 'Tour', 'Musée')
}
```

---

### 4. Vestige (Table: `vestiges`)

Sites archéologiques ou ruines.

```javascript
{
  id: INTEGER (PK),
  id_detail_lieu: INTEGER (FK),
  
  nom: JSON,
  description: JSON,
  
  type: ENUM('Ruines', 'Murailles', 'Site archéologique')
}
```

---

### 5. Service (Table: `services`)

Services disponibles sur un lieu (restaurant, guide, etc.).

```javascript
{
  id: INTEGER (PK),
  id_lieu: INTEGER (FK, nullable),
  id_user: INTEGER (FK, nullable),  // Professionnel propriétaire
  
  nom: JSON,
  description: JSON,
  type_service: ENUM('restaurant', 'hotel', 'guide', 'transport', 'artisanat', 'location', 'autre'),
  
  // Localisation (si pas lié à un lieu)
  latitude: DECIMAL,
  longitude: DECIMAL,
  adresse: JSON,
  
  // Contact
  telephone: STRING,
  email: STRING,
  site_web: STRING,
  
  // Infos pratiques
  horaires: JSON,
  tarif_min: DECIMAL,
  tarif_max: DECIMAL,
  
  disponible: BOOLEAN,
  statut: ENUM('en_attente', 'valide', 'rejete'),
  photo_url: STRING
}
```

---

### 6. Parcours (Table: `parcours`)

Itinéraires touristiques reliant plusieurs lieux.

```javascript
{
  id_parcours: INTEGER (PK),
  
  // ⚡ Champs multilingues
  nom_parcours: JSON { fr: "Parcours historique", ar: "المسار التاريخي" },
  description: JSON,
  
  // Caractéristiques
  duree_estimee: INTEGER (minutes),
  difficulte: ENUM('facile', 'moyen', 'difficile'),
  theme: STRING (ex: "histoire", "nature", "architecture"),
  distance_km: DECIMAL,
  
  // Points de départ/arrivée
  point_depart: STRING,
  point_arrivee: STRING,
  
  statut: ENUM('actif', 'inactif', 'maintenance'),
  id_createur: INTEGER (FK → users)
}
```

---

### 7. ParcoursLieu (Table: `parcours_lieux`)

Table pivot entre Parcours et Lieu avec informations d'étape.

```javascript
{
  id_parcours_lieu: INTEGER (PK),
  id_parcours: INTEGER (FK),
  id_lieu: INTEGER (FK),
  id_evenement: INTEGER (FK, nullable),  // Si lié à un événement
  
  ordre: INTEGER,                         // Position dans le parcours
  duree_estimee: INTEGER (minutes),       // Temps sur place
  distance_precedent: FLOAT (km),         // Distance depuis étape précédente
  temps_trajet: INTEGER (minutes),
  notes: TEXT,
  transport_mode: ENUM('marche', 'velo', 'voiture', 'transport_public')
}
```

**Index unique:** `(id_parcours, ordre)` - Un seul lieu par position

---

## 🔌 API Endpoints

### Routes Patrimoine (`/api/patrimoine`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/sites` | Liste tous les sites | Non |
| GET | `/sites/populaires` | Sites les plus visités | Non |
| GET | `/sites/:id` | Détail d'un site | Non |
| GET | `/sites/:id/galerie` | Médias d'un site | Non |
| GET | `/sites/:id/qrcode` | Télécharger QR code | Non |
| GET | `/sites/:id/carte-visite` | Carte de visite | Non |
| GET | `/recherche` | Recherche de sites | Non |
| GET | `/types` | Types de patrimoine | Non |
| GET | `/statistiques` | Stats globales | Non |
| GET | `/monuments/:type` | Monuments par type | Non |
| GET | `/vestiges/:type` | Vestiges par type | Non |
| POST | `/sites` | Créer un site | Admin/Pro |
| PUT | `/sites/:id` | Modifier un site | Admin |
| DELETE | `/sites/:id` | Supprimer un site | Admin |
| POST | `/sites/:id/noter` | Noter un site | User |
| POST | `/sites/:id/favoris` | Ajouter aux favoris | User |
| DELETE | `/sites/:id/favoris` | Retirer des favoris | User |

### Routes Parcours (`/api/patrimoine/parcours`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/parcours` | Liste des parcours | Non |
| GET | `/parcours/populaires/:wilayaId` | Parcours populaires | Non |
| GET | `/parcours/evenement/:evenementId` | Parcours pour événement | Non |
| POST | `/parcours/personnalise` | Générer parcours auto | User |

### Routes Lieux (`/api/lieux`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Liste des lieux | Non |
| GET | `/:id` | Détail d'un lieu | Non |
| GET | `/wilaya/:wilayaId` | Lieux par wilaya | Non |
| GET | `/proximite` | Lieux à proximité | Non |
| GET | `/search` | Recherche | Non |
| GET | `/statistiques` | Statistiques | Non |
| POST | `/` | Créer un lieu | Contributeur+ |
| PUT | `/:id` | Modifier un lieu | Modérateur+ |
| DELETE | `/:id` | Supprimer un lieu | Admin |
| GET | `/:id/services` | Services d'un lieu | Non |
| POST | `/:id/services` | Ajouter un service | Contributeur+ |
| PUT | `/:id/services/:serviceId` | Modifier service | Modérateur+ |
| DELETE | `/:id/services/:serviceId` | Supprimer service | Modérateur+ |

---

## 🖥️ Pages Frontend

### 1. Patrimoine.tsx - Liste des sites

**Fonctionnalités:**
- Affichage en grille des sites patrimoniaux
- Filtres par type de patrimoine, wilaya
- Recherche textuelle multilingue
- Carte interactive (lazy loading)
- Pagination

**État local:**
```typescript
const [sites, setSites] = useState<SitePatrimoine[]>([]);
const [loading, setLoading] = useState(true);
const [selectedType, setSelectedType] = useState<string>('all');
const [searchQuery, setSearchQuery] = useState('');
```

---

### 2. PatrimoineDetail.tsx - Détail d'un site

**Fonctionnalités:**
- Affichage adaptatif selon `typePatrimoine`
- Onglets dynamiques (monuments, vestiges, programmes, services...)
- Galerie photos/vidéos
- QR Code téléchargeable
- Planificateur de visite
- Carte de localisation

**Configuration des onglets par type:**
```typescript
const TABS_CONFIG: Record<TypePatrimoine, string[]> = {
  ville_village: ['monuments', 'vestiges', 'musees', 'parcours', 'services'],
  monument: ['programmes', 'services', 'galerie', 'histoire'],
  musee: ['programmes', 'collections', 'services', 'galerie'],
  site_archeologique: ['vestiges', 'programmes', 'services', 'histoire'],
  site_naturel: ['parcours', 'services', 'faune_flore', 'galerie'],
  edifice_religieux: ['programmes', 'services', 'histoire', 'galerie'],
  palais_forteresse: ['monuments', 'programmes', 'services', 'histoire'],
  autre: ['monuments', 'vestiges', 'services', 'programmes', 'parcours']
};
```

---

### 3. AjouterPatrimoine.tsx - Formulaire admin

**Fonctionnalités:**
- Création/modification de site patrimonial
- Sélection de lieu sur carte
- Gestion des services (CRUD)
- Upload de médias
- Génération automatique de QR code
- Création de programmes
- Liaison avec parcours

**Structure du formulaire (onglets):**
1. **Informations générales** - Nom, type, localisation
2. **Détails** - Description, histoire, horaires
3. **Services** - Liste des services disponibles
4. **Médias** - Photos et vidéos
5. **Programmes** - Événements récurrents
6. **Parcours** - Liaison avec parcours existants

---

## 🧭 Parcours Intelligents

### Concept

Les parcours intelligents génèrent automatiquement des itinéraires touristiques basés sur:
- La position de l'utilisateur
- Ses centres d'intérêt
- Le temps disponible
- Le mode de transport

### Algorithme de génération

```javascript
// ParcoursIntelligentController.js
async generateParcoursPersonnalise(req, res) {
  const { latitude, longitude, interests, duration, transport } = req.body;
  
  // 1. Trouver les lieux à proximité
  const lieuxProches = await this.findLieuxProximite(latitude, longitude, rayon);
  
  // 2. Filtrer par intérêts
  const lieuxFiltres = this.filterByInterests(lieuxProches, interests);
  
  // 3. Optimiser l'itinéraire (TSP simplifié)
  const parcours = this.optimizeRoute(lieuxFiltres, duration, transport);
  
  // 4. Calculer les temps de trajet
  const parcoursComplet = this.calculateTravelTimes(parcours, transport);
  
  return parcoursComplet;
}
```

### Génération pour un événement

```javascript
// Génère un parcours autour d'un événement
GET /api/patrimoine/parcours/evenement/:evenementId?rayon=10&maxSites=5
```

---

## 🌍 Internationalisation (i18n)

### Champs multilingues

Tous les champs textuels sont stockés en JSON:

```json
{
  "fr": "Texte en français",
  "ar": "النص بالعربية",
  "en": "Text in English"
}
```

### Helper de traduction (Frontend)

```typescript
const translate = (
  value: string | { fr?: string; ar?: string; en?: string } | null,
  lang: string
): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.fr || value.ar || value.en || '';
};
```

### Helper de traduction (Backend)

```javascript
// helpers/i18n.js
const translate = (obj, lang = 'fr') => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.fr || obj.ar || '';
};

const translateDeep = (data, lang) => {
  // Traduit récursivement tous les champs JSON
};
```

### Méthodes d'instance (Models)

```javascript
// Lieu.js
Lieu.prototype.getNom = function(lang = 'fr') {
  return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
};
```

---

## 🔐 Permissions

| Rôle | Permissions |
|------|-------------|
| **Visiteur** | Consulter, rechercher |
| **User** | + Noter, favoris |
| **Contributeur** | + Créer lieux, ajouter services |
| **Professionnel** | + Gérer ses services |
| **Modérateur** | + Modifier lieux/services |
| **Admin** | Tout (CRUD complet, suppression) |

---

## 📱 Fonctionnalités Mobile

### QR Code

Chaque site peut avoir un QR code généré automatiquement:
- Scan → Redirection vers la page détail
- Téléchargeable en PNG/SVG

### Mode hors-ligne

```javascript
GET /api/patrimoine/mobile/offline/:wilayaId
// Retourne un pack de données pour consultation hors-ligne
```

### Géolocalisation

```javascript
GET /api/patrimoine/mobile/nearby?lat=36.75&lng=3.04&radius=5
// Sites et parcours suggérés à proximité
```

---

## 🧪 Exemples d'utilisation

### Créer un site patrimonial (API)

```javascript
POST /api/patrimoine/sites
{
  "lieu": {
    "nom": { "fr": "Casbah d'Alger", "ar": "قصبة الجزائر" },
    "adresse": { "fr": "Casbah, Alger", "ar": "القصبة، الجزائر" },
    "latitude": 36.785,
    "longitude": 3.06,
    "typeLieu": "Commune",
    "typePatrimoine": "ville_village",
    "communeId": 579
  },
  "details": {
    "description": { "fr": "Site classé UNESCO...", "ar": "موقع مصنف من اليونسكو..." },
    "histoire": { "fr": "Fondée au Xe siècle...", "ar": "تأسست في القرن العاشر..." },
    "horaires": { "fr": "Ouvert 24h/24", "ar": "مفتوح 24 ساعة" }
  },
  "services": [
    { "nom": { "fr": "Guide touristique" }, "type_service": "guide" },
    { "nom": { "fr": "Restaurant traditionnel" }, "type_service": "restaurant" }
  ]
}
```

### Générer un parcours personnalisé

```javascript
POST /api/patrimoine/parcours/personnalise
{
  "latitude": 36.75,
  "longitude": 3.04,
  "interests": ["histoire", "architecture"],
  "duration": 180,  // 3 heures
  "transport": "marche"
}

// Réponse
{
  "parcours": {
    "nom_parcours": { "fr": "Parcours historique d'Alger" },
    "duree_estimee": 165,
    "distance_km": 3.2,
    "etapes": [
      { "lieu": {...}, "ordre": 1, "duree_estimee": 45, "distance_precedent": 0 },
      { "lieu": {...}, "ordre": 2, "duree_estimee": 30, "distance_precedent": 0.8 },
      { "lieu": {...}, "ordre": 3, "duree_estimee": 60, "distance_precedent": 1.2 }
    ]
  }
}
```

---

## 📝 Résumé

Le module Patrimoine est le cœur de l'application Action Culture DZ. Il permet de:

1. **Cataloguer** les sites patrimoniaux algériens avec support multilingue
2. **Classifier** par type (monument, musée, site archéologique...)
3. **Enrichir** avec détails, services, médias
4. **Naviguer** via des parcours intelligents générés automatiquement
5. **Interagir** via QR codes, favoris, notes

Les **parcours intelligents** sont la fonctionnalité clé qui différencie l'application en proposant des itinéraires personnalisés basés sur la géolocalisation et les préférences de l'utilisateur.
