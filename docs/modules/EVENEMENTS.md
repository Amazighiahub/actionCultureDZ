# Module : Gestion des Événements

## Vue d'ensemble

Le module Événements permet aux professionnels de créer, gérer et promouvoir des événements culturels en Algérie (festivals, salons du livre, expositions, conférences, etc.).

## Architecture

```
Backend                                    Frontend
─────────────────────────────────          ──────────────────────────────
routes/evenementRoutes.js                  pages/AjouterEvenement.tsx
routes/programmeRoutes.js                  pages/Evenements.tsx
controllers/evenementController.js         pages/EventDetailsPage.tsx
controllers/programmeController.js         pages/event/
models/events/evenement.js                   ├── EventHero.tsx
models/events/programme.js                   ├── EventInfo.tsx
models/events/typeEvenement.js               ├── EventProgram.tsx
models/associations/evenementOeuvre.js        ├── EventGallery.tsx
models/associations/evenementUser.js         ├── EventComments.tsx
models/associations/evenementOrganisation.js ├── EventOrganizers.tsx
                                             ├── EventRegistration.tsx
                                             └── RelatedEvents.tsx
                                           components/event/
                                             ├── GestionEvenement.tsx
                                             └── ParticipantsManager.tsx
```

## API Endpoints

### Routes publiques
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/evenements` | Liste paginée des événements |
| GET | `/api/evenements/:id` | Détail d'un événement |
| GET | `/api/evenements/search` | Recherche d'événements |
| GET | `/api/evenements/a-venir` | Événements à venir |
| GET | `/api/evenements/:id/programme` | Programme d'un événement |

### Routes authentifiées (Professionnel)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/evenements` | Créer un événement |
| PUT | `/api/evenements/:id` | Modifier un événement |
| DELETE | `/api/evenements/:id` | Supprimer un événement |
| POST | `/api/evenements/:id/inscription` | S'inscrire à un événement |
| POST | `/api/programmes` | Créer un programme |
| PUT | `/api/programmes/:id` | Modifier un programme |

### Routes admin
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/evenements` | Liste admin (tous statuts) |
| PUT | `/api/admin/evenements/:id/statut` | Changer le statut |

## Modèle de données

```
Evenement
├── id (PK)
├── titre (multilingue: fr, ar, en, tz)
├── description (multilingue)
├── date_debut, date_fin
├── lieu_id (FK → Lieu)
├── type_evenement_id (FK → TypeEvenement)
├── statut ('brouillon', 'publie', 'annule', 'termine')
├── image_couverture
├── capacite_max
├── prix
├── createdBy (FK → User)
└── timestamps

Programme
├── id (PK)
├── evenement_id (FK → Evenement)
├── titre, description
├── date, heure_debut, heure_fin
├── lieu_specifique
└── intervenants (M2M → Intervenant)
```

## Relations
- **Evenement ↔ Oeuvre** : M2M (événement peut présenter des œuvres)
- **Evenement ↔ Organisation** : M2M (co-organisateurs)
- **Evenement ↔ User** : M2M (inscriptions/participants)
- **Evenement → Programme** : 1:N
- **Programme ↔ Intervenant** : M2M

## Fonctionnalités clés
- Création multi-étapes avec validation
- Gestion des programmes et intervenants
- Inscription des participants avec capacité max
- Recherche par wilaya, date, type
- Support multilingue (fr, ar, en, tz)
- Upload d'images (couverture + galerie)
- Événements liés (suggestions)
- Commentaires et évaluations
- QR Code pour l'inscription

## Fichiers de test
- `frontEnd/src/pages/AjouterEvenement.test.tsx`
- `backend/scripts/seedDatabaseEvent.js` (données de test)
