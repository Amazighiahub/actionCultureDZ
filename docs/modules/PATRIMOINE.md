# Module : Gestion du Patrimoine

## Vue d'ensemble
Recenser, documenter et promouvoir les sites patrimoniaux algériens (monuments, vestiges, musées, sites naturels).

## Fichiers clés

**Backend :**
- `routes/patrimoineRoutes.js`, `routes/lieuRoutes.js`
- `controllers/patrimoineController.js`, `controllers/lieuController.js`
- `models/places/` : `lieu.js`, `monument.js`, `vestige.js`, `detailLieu.js`, `lieuMedia.js`, `service.js`
- `models/geography/` : `wilaya.js`, `daira.js`, `commune.js`
- `routes/admin/adminPatrimoineRoutes.js`

**Frontend :**
- `pages/Patrimoine.tsx` — Liste des sites
- `pages/PatrimoineDetail.tsx` — Détail d'un site
- `pages/AjouterPatrimoinePro.tsx` — Formulaire de création (pro)
- `pages/admin/AdminPatrimoineTab.tsx` — Onglet admin
- `components/CartePatrimoine.tsx` — Carte interactive Leaflet
- `components/patrimoine/VisitePlanner.tsx` — Planificateur de visite

## API Endpoints

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/patrimoine/sites` | Non | Liste paginée |
| GET | `/api/patrimoine/sites/populaires` | Non | Sites populaires |
| GET | `/api/patrimoine/sites/:id` | Non | Détail |
| GET | `/api/patrimoine/recherche` | Non | Recherche |
| GET | `/api/patrimoine/sites/:id/qrcode` | Non | QR Code |
| POST | `/api/patrimoine/sites` | Pro | Créer |
| PUT | `/api/patrimoine/sites/:id` | Pro | Modifier |
| DELETE | `/api/patrimoine/sites/:id` | Pro | Supprimer |
| GET | `/api/lieux` | Non | Liste lieux |
| GET | `/api/lieux/:id` | Non | Détail lieu |

## Modèle de données
- **Lieu** : id, nom, adresse, latitude, longitude, wilaya_id, daira_id, commune_id, type
- **Monument** : extends Lieu — époque, style, classement UNESCO
- **Vestige** : extends Lieu — période, état_conservation
- **DetailLieu** : horaires, tarifs, accessibilité, contact
- **LieuMedia** : photos, vidéos associées au lieu

## Fonctionnalités
- Carte interactive (Leaflet) avec filtrage par wilaya
- QR Codes générés automatiquement pour chaque site
- Recherche géographique par wilaya/daira/commune
- Support multilingue (fr, ar, en, tz)
- Upload photos/médias
- Planificateur de visite
