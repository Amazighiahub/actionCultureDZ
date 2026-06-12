# Analyse du Backend — Taladz (EventCulture)

> Document de référence pour le développement de l'application Android.
> Généré après analyse complète du code source backend.

---

## 1. Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | ≥ 18.17.0 |
| Framework | Express | 4.21.0 |
| ORM | Sequelize | 6.37.8 |
| Base de données | MySQL | — |
| Cache / Sessions | Redis | 5.5.6 |
| File upload | Multer + Cloudinary | 1.4.5 / 2.9.0 |
| Authentification | JWT (jsonwebtoken) | 9.0.2 |
| Temps réel | Socket.IO | 4.8.1 |
| File d'attente | Bull | 4.16.5 |
| Email | Nodemailer | 7.0.11 |
| Images | Sharp | 0.34.2 |
| Logs | Winston | 3.19.0 |

---

## 2. Architecture générale

```
Routes (Express Router)
    ↓
Middleware (Auth · Validation · Rate Limiting · Audit · Cache)
    ↓
Controllers (pattern BaseController)
    ↓
Services (ServiceContainer)
    ↓
Repositories (Data Access Layer)
    ↓
Models (Sequelize)
    ↓
MySQL
```

---

## 3. Authentification

### Type de token
- **Access Token** : JWT Bearer (httpOnly cookie + header `Authorization: Bearer`)
- **Refresh Token** : JWT rotatif, 7 jours, stocké dans Redis + cookie httpOnly

### Claims du JWT
```json
{
  "userId": 42,
  "email": "user@example.com",
  "id_type_user": 6,
  "pwdAt": "2026-01-15T10:00:00.000Z",
  "jti": "uuid-unique-par-token",
  "iss": "eventculture-api",
  "aud": "eventculture-web"
}
```

### Durée de vie
- Access token : `JWT_EXPIRATION` (défaut **1 heure**)
- Refresh token : **7 jours**

### Mécanisme de refresh
```
POST /api/users/refresh-token
Cookie: refresh_token=<token>
→ Nouveau access token + nouveau refresh token (rotatif)
```

### Révocation
- Access tokens blacklistés dans Redis (`jwt:blacklist:jti:{jti}`)
- Refresh tokens supprimés de Redis à la déconnexion
- Invalidation automatique si le mot de passe change

### Headers attendus par l'app mobile
```
Authorization: Bearer <access_token>
```
Ou via cookie httpOnly (géré automatiquement par le navigateur / CookieJar OkHttp).

---

## 4. Modèles de données principaux

### User
```
id_user          INTEGER PK
nom              JSON {fr, ar, ...}
prenom           JSON {fr, ar, ...}
email            STRING UNIQUE
mot_de_passe     STRING (bcrypt)
id_type_user     FK → TypeUser  [1=Visiteur, 2-28=Professionnels, 29=Admin]
wilaya_residence FK → Wilaya (nullable)
telephone        STRING
photo_url        STRING (Cloudinary)
biographie       JSON
statut           ENUM: actif | en_attente_validation | inactif | suspendu | banni
email_verifie    BOOLEAN
password_changed_at DATETIME
derniere_connexion  DATETIME
```

### Oeuvre (Livre / Ebook)
```
id_oeuvre        INTEGER PK
titre            JSON {fr, ar, en}
id_type_oeuvre   FK → TypeOeuvre
id_langue        FK → Langue
description      JSON
prix             DECIMAL
annee_creation   INTEGER
saisi_par        FK → User
statut           ENUM: brouillon | en_attente | publie | rejete | archive | supprime
est_mis_en_avant BOOLEAN
nb_vues          INTEGER
```

### Livre (extension de Oeuvre)
```
id_livre   INTEGER PK
id_oeuvre  FK → Oeuvre
isbn       STRING
nb_pages   INTEGER
id_genre   FK → Genre
```

### Media
```
id_media    INTEGER PK
id_entite   INTEGER (polymorphique)
type_entite STRING (oeuvre | evenement | lieu | ...)
url         STRING (Cloudinary)
mimetype    STRING
size        INTEGER
type_block  STRING
```

### Notification
```
id_notification   INTEGER PK
id_user           FK → User
type_notification ENUM: message_admin | validation_compte | ... 
titre             STRING
message           TEXT
lu                BOOLEAN
date_creation     DATETIME
```

---

## 5. Endpoints par domaine

### A. Authentification — `/api/users`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/register` | Non | Inscription (visiteur ou professionnel) |
| POST | `/login` | Non | Connexion, retourne access + refresh token |
| POST | `/refresh-token` | Cookie | Renouvelle le token (refresh rotatif) |
| POST | `/logout` | Oui | Révoque les tokens |
| POST | `/verify-email/:token` | Non | Vérification email |
| POST | `/check-email` | Non | Vérifie si email disponible |
| GET | `/profile` | Oui | Profil complet de l'utilisateur connecté |
| PUT | `/profile` | Oui | Mise à jour du profil |
| PATCH | `/profile/photo` | Oui | Upload photo de profil |
| POST | `/change-password` | Oui | Changement de mot de passe |
| GET | `/types` | Non | Types d'utilisateurs |

**Exemple — Login :**
```bash
curl -X POST https://api.taladz.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"MonMotDePasse123!"}'
```
```json
{
  "success": true,
  "user": {
    "id_user": 42,
    "email": "test@example.com",
    "nom": {"fr": "Dupont"},
    "prenom": {"fr": "Jean"},
    "id_type_user": 6,
    "statut": "actif",
    "photo_url": "https://res.cloudinary.com/..."
  },
  "expiresIn": 3600
}
```

---

### B. Œuvres (Ebooks / Livres) — `/api/oeuvres`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | Non | Liste paginée des œuvres |
| GET | `/search` | Non | Recherche filtrée |
| GET | `/recent` | Non | Œuvres récentes |
| GET | `/popular` | Non | Œuvres populaires |
| GET | `/:id` | Non | Détail d'une œuvre + médias |
| GET | `/:id/similar` | Non | Œuvres similaires |
| GET | `/:id/medias` | Non | Médias d'une œuvre |
| POST | `/` | Oui | Créer une œuvre (brouillon) |
| PUT | `/:id` | Oui | Modifier une œuvre |
| DELETE | `/:id` | Oui | Supprimer |
| POST | `/:id/submit` | Oui | Soumettre pour validation |
| POST | `/:id/medias/upload` | Oui | Upload médias (max 10, 100 MB) |
| GET | `/my/list` | Oui | Mes œuvres |

**Exemple — Liste des œuvres :**
```bash
curl "https://api.taladz.com/api/oeuvres?page=1&limit=20&type=livre"
```
```json
{
  "oeuvres": [
    {
      "id_oeuvre": 1,
      "titre": {"fr": "Nedjma", "ar": "نجمة"},
      "description": {"fr": "Roman de Kateb Yacine"},
      "prix": 0,
      "nb_vues": 1240,
      "statut": "publie",
      "type": {"id": 2, "nom": "Livre"},
      "medias": [{"url": "https://...", "type_block": "couverture"}]
    }
  ],
  "pagination": {"page": 1, "limit": 20, "total": 145, "pages": 8}
}
```

---

### C. Upload / Téléchargement — `/api/upload`

| Méthode | Endpoint | Auth | Limite | Description |
|---------|----------|------|--------|-------------|
| POST | `/image/public` | Non | 10 MB | Upload image public |
| POST | `/document/public` | Non | 50 MB | Upload document public |
| POST | `/profile-photo` | Oui | 10 MB | Photo de profil (auto-update) |
| POST | `/oeuvre/media` | Oui | 100 MB × 5 | Médias d'une œuvre |
| GET | `/file/:id` | Optionnel | — | Télécharger un fichier |
| DELETE | `/:id` | Oui | — | Supprimer un média |

> **Note pour l'app Android :** les fichiers EPUB/PDF sont stockés sur Cloudinary.
> Le téléchargement offline se fait via l'URL Cloudinary du média.
> Il n'existe pas encore d'endpoint dédié "download for offline" pour les ebooks.

---

### D. Notifications — `/api/notifications`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/list` | Oui | Liste paginée des notifications |
| GET | `/summary` | Oui | Résumé (nb non lues, urgences) |
| PUT | `/:id/read` | Oui | Marquer comme lue |
| PUT | `/read-all` | Oui | Tout marquer comme lu |
| DELETE | `/:id` | Oui | Supprimer une notification |
| GET | `/preferences` | Oui | Préférences de notification |
| PUT | `/preferences` | Oui | Modifier les préférences |

---

### E. Favoris — `/api/favoris`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | Oui | Mes favoris paginés |
| GET | `/check/:type/:id` | Oui | Est-ce un favori ? |
| POST | `/` | Oui | Ajouter un favori |
| DELETE | `/:type/:id` | Oui | Retirer un favori |

```json
// POST /api/favoris
{
  "type_entite": "oeuvre",
  "id_entite": 42
}
```

---

### F. Métadonnées — `/api/metadata`

Tous publics, sans auth.

| Endpoint | Retourne |
|----------|----------|
| `/types-oeuvre` | Types d'œuvres (livre, film, musique...) |
| `/langues` | Langues disponibles |
| `/genres` | Genres littéraires |
| `/wilayas` | 58 wilayas d'Algérie |
| `/type-users` | Types d'utilisateurs |

---

## 6. Distribution des fichiers EPUB/PDF

**Situation actuelle :**
- Les fichiers sont stockés sur **Cloudinary** (CDN)
- L'URL est dans `media.url` pour chaque œuvre
- Téléchargement direct via l'URL Cloudinary (HTTPS)
- Pas de signature d'URL ni de DRM pour l'instant

**Pour l'app Android :**
```
1. GET /api/oeuvres/:id/medias
   → récupérer l'URL du fichier EPUB/PDF

2. Télécharger le fichier directement depuis l'URL Cloudinary
   → stocker en local (Room + fichier chiffré)

3. Lecture offline via Readium
```

---

## 7. Endpoints MANQUANTS pour l'app mobile

Ces endpoints seront à ajouter au backend plus tard :

| Endpoint manquant | Priorité | Description |
|-------------------|----------|-------------|
| `POST /oeuvres/:id/progress` | HAUTE | Sauvegarder la position de lecture (CFI Readium) |
| `GET /oeuvres/:id/progress` | HAUTE | Récupérer la dernière position |
| `GET /users/library` | HAUTE | Bibliothèque de l'utilisateur (ebooks acquis) |
| `POST /oeuvres/:id/annotations` | MOYENNE | Créer une annotation/surlignage |
| `GET /oeuvres/:id/annotations` | MOYENNE | Récupérer mes annotations |
| `DELETE /annotations/:id` | MOYENNE | Supprimer une annotation |
| `POST /devices/fcm-token` | HAUTE | Enregistrer le token FCM pour push |
| `DELETE /devices/fcm-token` | HAUTE | Désenregistrer à la déconnexion |
| `GET /oeuvres/recommended` | BASSE | Recommandations personnalisées |
| `POST /oeuvres/:id/download` | HAUTE | Endpoint dédié download offline avec checksum |

---

## 8. Points importants pour l'app Android

### Refresh token — stratégie recommandée
```
1. Stocker l'access token dans EncryptedSharedPreferences
2. Refresh token : httpOnly cookie (géré par CookieJar OkHttp)
3. Avant chaque requête : vérifier expiry du JWT (claim exp)
4. Si expiré : appeler /refresh-token en amont (silent refresh)
5. Si refresh échoue (401) : rediriger vers l'écran de login
```

### Pagination
- Format : `{ page, limit, total, pages }`
- Défaut : `page=1, limit=20`
- Maximum conseillé : `limit=50`

### Multilingue
- Les champs `nom`, `titre`, `description` sont des objets JSON `{fr, ar, en}`
- L'app doit choisir la langue selon `Locale.getDefault()`
- Fallback : `fr` → `ar` → `en` → première valeur disponible

### Rate limiting
- Login : 5 tentatives / 5 min → lockout
- Upload : 10 fichiers / jour (anonyme)
- Réponse 429 → header `Retry-After` à respecter

### Codes d'erreur standards
```json
{ "success": false, "error": "MESSAGE", "code": "ERROR_CODE" }
```
- `401` → token expiré ou invalide
- `403` → accès refusé (rôle insuffisant)
- `404` → ressource introuvable
- `422` → erreur de validation
- `429` → trop de requêtes
- `500` → erreur serveur

---

## 9. URL de base

```
Production : https://api.taladz.com   (à confirmer)
Développement local : http://10.0.2.2:3001  (émulateur Android)
```

---

*Fin de l'analyse — Phase 0 complète. En attente de validation pour passer à la Phase 1 (plan des 14 TP).*
