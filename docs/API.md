# Documentation API - EventCulture

## Base URL

- **Développement**: `http://localhost:3001/api`
- **Production**: `https://api.votredomaine.com/api`

## Authentification

L'API utilise des tokens JWT (JSON Web Tokens).

### Obtenir un token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "motdepasse"
}
```

**Réponse:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id_user": 1,
    "nom": "Nom",
    "prenom": "Prénom",
    "email": "user@example.com",
    "roleNames": ["User"]
  }
}
```

### Utiliser le token

Inclure le token dans le header `Authorization`:

```http
GET /api/evenements
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Format des réponses

### Réponse standard

```json
{
  "success": true,
  "data": { /* données */ },
  "message": "Message optionnel"
}
```

### Réponse d'erreur

```json
{
  "success": false,
  "error": "Description de l'erreur",
  "details": "Détails techniques (dev only)"
}
```

### Réponse paginée

```json
{
  "success": true,
  "data": [ /* tableau de données */ ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 15,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Endpoints

### Authentification

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/auth/register` | Inscription | Non |
| POST | `/auth/login` | Connexion | Non |
| POST | `/auth/logout` | Déconnexion | Oui |
| GET | `/auth/me` | Profil utilisateur | Oui |
| POST | `/auth/forgot-password` | Demande reset password | Non |
| POST | `/auth/reset-password` | Reset password | Non |
| GET | `/auth/verify-email/:token` | Vérification email | Non |
| POST | `/auth/resend-verification` | Renvoyer email vérification | Oui |

### Utilisateurs

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/users` | Liste des utilisateurs | Admin |
| GET | `/users/:id` | Détail utilisateur | Admin |
| PUT | `/users/:id` | Modifier utilisateur | Admin/Owner |
| DELETE | `/users/:id` | Supprimer utilisateur | Admin |
| PUT | `/users/:id/password` | Changer mot de passe | Owner |
| GET | `/users/:id/favoris` | Favoris de l'utilisateur | Owner |
| GET | `/users/:id/oeuvres` | Œuvres de l'utilisateur | Owner |

### Œuvres

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/oeuvres` | Liste des œuvres | Non |
| GET | `/oeuvres/:id` | Détail d'une œuvre | Non |
| POST | `/oeuvres` | Créer une œuvre | Pro |
| PUT | `/oeuvres/:id` | Modifier une œuvre | Pro/Admin |
| DELETE | `/oeuvres/:id` | Supprimer une œuvre | Pro/Admin |
| GET | `/oeuvres/:id/commentaires` | Commentaires | Non |
| POST | `/oeuvres/:id/commentaires` | Ajouter commentaire | Oui |
| GET | `/oeuvres/search` | Recherche | Non |

**Paramètres de filtrage GET /oeuvres:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | number | Page (défaut: 1) |
| `limit` | number | Éléments par page (défaut: 10, max: 100) |
| `type` | string | Type d'œuvre (livre, film, album...) |
| `categorie` | number | ID catégorie |
| `langue` | number | ID langue |
| `search` | string | Recherche texte |
| `sort` | string | Tri (date_creation, titre, popularite) |
| `order` | string | Ordre (ASC, DESC) |

### Événements

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/evenements` | Liste des événements | Non |
| GET | `/evenements/upcoming` | Événements à venir | Non |
| GET | `/evenements/:id` | Détail événement | Non |
| POST | `/evenements` | Créer événement | Pro |
| PUT | `/evenements/:id` | Modifier événement | Pro/Admin |
| DELETE | `/evenements/:id` | Supprimer événement | Pro/Admin |
| POST | `/evenements/:id/inscription` | S'inscrire | Oui |
| DELETE | `/evenements/:id/inscription` | Se désinscrire | Oui |
| GET | `/evenements/:id/participants` | Liste participants | Pro/Admin |
| GET | `/evenements/:id/programmes` | Programme | Non |
| GET | `/evenements/:id/medias` | Médias | Non |

**Paramètres de filtrage GET /evenements:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | number | Page |
| `limit` | number | Éléments par page |
| `wilaya_id` | number | Filtrer par wilaya |
| `type_id` | number | Type d'événement |
| `date_debut` | date | Date minimum (ISO 8601) |
| `date_fin` | date | Date maximum |
| `statut` | string | planifie, en_cours, termine, annule |

### Patrimoine

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/patrimoine` | Sites patrimoniaux | Non |
| GET | `/patrimoine/:id` | Détail site | Non |
| POST | `/patrimoine` | Créer site | Pro/Admin |
| PUT | `/patrimoine/:id` | Modifier site | Pro/Admin |
| DELETE | `/patrimoine/:id` | Supprimer site | Admin |
| GET | `/patrimoine/:id/services` | Services du site | Non |
| GET | `/patrimoine/:id/parcours` | Parcours disponibles | Non |

### Lieux

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/lieux` | Liste des lieux | Non |
| GET | `/lieux/:id` | Détail lieu | Non |
| GET | `/lieux/search` | Recherche de lieux | Non |
| POST | `/lieux` | Créer lieu | Pro/Admin |

### Géographie

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/wilayas` | Liste des wilayas | Non |
| GET | `/wilayas/:id/dairas` | Dairas d'une wilaya | Non |
| GET | `/dairas/:id/communes` | Communes d'une daira | Non |

### Favoris

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/favoris` | Mes favoris | Oui |
| POST | `/favoris` | Ajouter favori | Oui |
| DELETE | `/favoris/:type/:id` | Retirer favori | Oui |

**Body POST /favoris:**
```json
{
  "type": "oeuvre|evenement|lieu",
  "id": 123
}
```

### Commentaires

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/commentaires/:type/:id` | Commentaires d'un élément | Non |
| POST | `/commentaires` | Ajouter commentaire | Oui |
| PUT | `/commentaires/:id` | Modifier commentaire | Owner |
| DELETE | `/commentaires/:id` | Supprimer commentaire | Owner/Admin |

### Notifications

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/notifications` | Mes notifications | Oui |
| PUT | `/notifications/:id/read` | Marquer comme lu | Oui |
| PUT | `/notifications/read-all` | Tout marquer comme lu | Oui |
| DELETE | `/notifications/:id` | Supprimer notification | Oui |

### Métadonnées

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/metadata/categories` | Catégories | Non |
| GET | `/metadata/genres` | Genres | Non |
| GET | `/metadata/langues` | Langues | Non |
| GET | `/metadata/types-oeuvres` | Types d'œuvres | Non |
| GET | `/metadata/types-evenements` | Types d'événements | Non |

### Upload

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/upload/image` | Upload image | Oui |
| POST | `/upload/document` | Upload document | Oui |
| POST | `/upload/video` | Upload vidéo | Pro |
| DELETE | `/upload/:filename` | Supprimer fichier | Owner/Admin |

**Limites de fichiers:**
- Images: 10 MB (jpeg, png, gif, webp)
- Documents: 50 MB (pdf, doc, docx)
- Vidéos: 500 MB (mp4, webm)

### Administration

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/admin/dashboard` | Statistiques | Admin |
| GET | `/admin/users` | Gestion utilisateurs | Admin |
| PUT | `/admin/users/:id/status` | Changer statut user | Admin |
| GET | `/admin/oeuvres/pending` | Œuvres en attente | Admin |
| PUT | `/admin/oeuvres/:id/validate` | Valider œuvre | Admin |
| GET | `/admin/signalements` | Signalements | Admin |
| PUT | `/admin/signalements/:id` | Traiter signalement | Admin |

---

## Codes d'erreur HTTP

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource non trouvée |
| 409 | Conflit (doublon) |
| 422 | Données invalides |
| 429 | Trop de requêtes |
| 500 | Erreur serveur |

---

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| `/auth/login` | 5 req / 15 min |
| `/auth/register` | 3 req / heure |
| `/upload/*` | 10 req / min |
| Autres | 1000 req / 15 min |

En cas de dépassement:
```json
{
  "success": false,
  "error": "Trop de requêtes",
  "retryAfter": 300
}
```

---

## Internationalisation

### Header de langue

```http
GET /api/evenements
Accept-Language: ar
```

Ou via query parameter:
```http
GET /api/evenements?lang=ar
```

### Langues supportées

| Code | Langue |
|------|--------|
| `fr` | Français (défaut) |
| `ar` | Arabe |
| `en` | Anglais |
| `tz-ltn` | Tamazight (Latin) |
| `tz-tfng` | Tamazight (Tifinagh) |

---

## Exemples

### Créer un événement

```http
POST /api/evenements
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "nom_evenement": {
    "fr": "Festival de musique",
    "ar": "مهرجان الموسيقى"
  },
  "description": {
    "fr": "Un grand festival de musique traditionnelle",
    "ar": "مهرجان كبير للموسيقى التقليدية"
  },
  "date_debut": "2024-06-15T18:00:00Z",
  "date_fin": "2024-06-15T23:00:00Z",
  "id_lieu": 5,
  "id_type_evenement": 1,
  "capacite_max": 500,
  "tarif": 0,
  "inscription_requise": true
}
```

### Rechercher des œuvres

```http
GET /api/oeuvres?search=algérie&type=livre&categorie=3&page=1&limit=20&sort=date_creation&order=DESC
```

### S'inscrire à un événement

```http
POST /api/evenements/42/inscription
Authorization: Bearer eyJ...
```

**Réponse:**
```json
{
  "success": true,
  "message": "Inscription confirmée",
  "data": {
    "id_EventUser": 156,
    "statut_participation": "confirme",
    "date_inscription": "2024-01-15T10:30:00Z"
  }
}
```
