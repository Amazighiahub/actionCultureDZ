# Module : Parcours Intelligents

## Vue d'ensemble
Génération automatique de parcours touristiques/culturels intelligents autour d'un événement ou d'une position géographique, en tenant compte des centres d'intérêt de l'utilisateur.

## Fichiers clés

**Backend :**
- `routes/parcoursIntelligentRoutes.js`
- `controllers/parcoursIntelligentController.js`
- `models/events/parcours.js`
- `models/associations/parcoursLieu.js`

**Frontend :**
- `pages/admin/` — Gestion admin des parcours
- `components/patrimoine/VisitePlanner.tsx` — Intégré au module patrimoine

## API Endpoints

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/parcours/evenement/:id` | Non | Parcours autour d'un événement |
| GET | `/api/parcours/wilaya/:id/populaires` | Non | Parcours populaires d'une wilaya |
| POST | `/api/parcours/personnalise` | Oui | Parcours personnalisé |

## Paramètres de génération

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `rayon` | float | — | Rayon de recherche (1-50 km) |
| `maxSites` | int | — | Nombre max de sites (1-20) |
| `dureeMaxParcours` | int | — | Durée max en minutes (60-720) |
| `includeRestaurants` | bool | false | Inclure restaurants à proximité |
| `includeHotels` | bool | false | Inclure hôtels à proximité |
| `interests` | array | — | Centres d'intérêt : histoire, art, architecture, nature, religion, gastronomie |
| `transport` | string | — | Mode : marche, velo, voiture |
| `accessibility` | bool | false | Filtrer lieux accessibles PMR |
| `familyFriendly` | bool | false | Filtrer lieux adaptés familles |

## Modèle de données
```
Parcours
├── id (PK)
├── nom
├── description
├── duree_estimee (minutes)
├── distance_totale (km)
├── type ('evenement', 'personnalise', 'populaire')
├── wilaya_id (FK → Wilaya)
├── createdBy (FK → User)
└── timestamps

ParcoursLieu (table pivot)
├── parcours_id (FK → Parcours)
├── lieu_id (FK → Lieu)
├── ordre (position dans le parcours)
└── duree_visite (minutes estimées)
```

## Fonctionnalités
- Génération intelligente basée sur la géolocalisation
- Personnalisation par centres d'intérêt
- Calcul de distance et durée estimée
- Filtrage accessibilité / famille
- Classement des parcours populaires par wilaya
- Intégration avec le module Patrimoine (sites) et Événements
