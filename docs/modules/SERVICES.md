# Module : Gestion des Services

## Vue d'ensemble
Gestion des services culturels et touristiques proposés par les professionnels : guides touristiques, ateliers, restauration, hébergement, transport, etc.

## Fichiers clés

**Backend :**
- `routes/servicesRoutes.js`
- `routes/admin/adminServicesRoutes.js`
- `controllers/servicesController.js`
- `models/places/service.js`
- `models/places/detailLieu.js`

**Frontend :**
- `pages/AjouterService.tsx` — Formulaire création (user)
- `pages/AjouterServicePro.tsx` — Formulaire création avancé (pro)
- `pages/admin/AdminServicesTab.tsx` — Onglet admin
- `components/home/` — Sections services sur la page d'accueil

## API Endpoints

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/services` | Non | Liste paginée |
| GET | `/api/services/:id` | Non | Détail |
| GET | `/api/services/search` | Non | Recherche |
| POST | `/api/services` | Pro | Créer un service |
| PUT | `/api/services/:id` | Pro | Modifier (propriétaire) |
| DELETE | `/api/services/:id` | Pro | Supprimer (propriétaire) |

## Modèle de données
```
Service
├── id (PK)
├── nom (multilingue)
├── description (multilingue)
├── type ('guide', 'atelier', 'restauration', 'hebergement', 'transport', 'autre')
├── tarif, devise
├── horaires
├── contact (tel, email, site web)
├── detailLieu_id (FK → DetailLieu)
├── createdBy (FK → User)
├── statut ('actif', 'inactif', 'en_attente')
└── timestamps
```

## Fonctionnalités
- Création par professionnels validés
- Vérification de propriété (ownership check middleware)
- Recherche par type, localisation, prix
- Support multilingue
- Validation admin avant publication
- Lien avec les lieux patrimoniaux (DetailLieu)
