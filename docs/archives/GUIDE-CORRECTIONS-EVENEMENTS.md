# Guide des corrections — Module Événements

> **Date** : 20 février 2026  
> **Branche** : `develop`  
> **Commit** : `28d936b3`

---

## 1. Récupérer les modifications

```bash
# Se placer dans le dossier du projet
cd EventCulture

# Récupérer les dernières modifications
git pull origin develop
```

---

## 2. Installer les dépendances (si nécessaire)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontEnd
npm install
```

---

## 3. Exécuter la migration de base de données

> **IMPORTANT** : Cette étape est obligatoire. Sans elle, la création d'événements échouera.

```bash
cd backend
npx sequelize-cli db:migrate
```

### Ce que fait la migration (`20260220-add-event-virtual-fields.js`) :

| Modification | Détail |
|---|---|
| **ENUM `statut`** | Ajout des valeurs `brouillon` et `publie` (en plus de `planifie`, `en_cours`, `termine`, `annule`, `reporte`) |
| **Colonne `id_lieu`** | Passe de `NOT NULL` à `NULL` (permet les événements virtuels sans lieu physique) |
| **Colonne `url_virtuel`** | Nouvelle colonne `VARCHAR(500)` pour stocker le lien de l'événement en ligne (Zoom, Meet, etc.) |

### Vérifier que la migration a fonctionné :

```bash
npx sequelize-cli db:migrate:status
```

Toutes les migrations doivent être marquées `up`.

---

## 4. Démarrer les serveurs

```bash
# Terminal 1 — Backend
cd backend
npm start
# → http://localhost:3001

# Terminal 2 — Frontend
cd frontEnd
npm run dev
# → http://localhost:8080
```

---

## 5. Résumé des corrections par point de la checklist

### #2 — Lien footer vers la page événements
- **Fichier** : Aucune modification (le lien `/evenements` existait déjà dans `Footer.tsx`)
- **Statut** : Déjà fonctionnel

### #5 — Création d'une organisation (présentiel)
- **Problème** : Aucune route backend pour les organisations, aucune page frontend
- **Fichiers modifiés/créés** :
  - `backend/routes/organisationRoutes.js` *(nouveau)* — Routes CRUD organisations
  - `backend/routes/index.js` — Montage de la route `/api/organisations`
  - `frontEnd/src/pages/AjouterOrganisation.tsx` *(nouveau)* — Page de création d'organisation
  - `frontEnd/src/App.tsx` — Ajout de la route `/ajouter-organisation`
  - `frontEnd/src/config/api.ts` — Ajout des endpoints organisations

#### Routes backend créées :
| Méthode | URL | Description | Auth |
|---------|-----|-------------|------|
| `GET` | `/api/organisations/me` | Mes organisations | Oui |
| `POST` | `/api/organisations` | Créer une organisation | Oui |
| `GET` | `/api/organisations/types` | Types d'organisations | Non |
| `GET` | `/api/organisations/:id` | Détail d'une organisation | Non |

### #6 / #7 — Création d'événement présentiel et en ligne
- **Problème** : Le formulaire utilisait `fetch` avec un mauvais token, pas d'upload d'image, pas de support événement virtuel
- **Fichiers modifiés** :
  - `backend/models/events/Evenement.js` — `id_lieu` nullable, ajout `url_virtuel`, ENUM statut étendu
  - `backend/controllers/evenementController.js` — Gestion multipart (upload affiche), parsing JSON i18n, support `statut`, `url_virtuel`, liaison organisation
  - `backend/routes/evenementRoutes.js` — Ajout middleware multer, validation assouplie (`id_lieu` optionnel)
  - `frontEnd/src/pages/AjouterEvenement.tsx` — Remplacement de `fetch` par `httpClient`, envoi via `FormData` avec image
  - `frontEnd/src/services/evenement.service.ts` — Override de `create()` pour supporter `FormData`

#### Ce qui a changé concrètement :

**Avant** (ne fonctionnait pas) :
```typescript
// Token incorrect + endpoint inexistant
const response = await fetch('/api/users/me/organisations', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});
```

**Après** (corrigé) :
```typescript
// Utilise httpClient qui gère automatiquement le token auth_token
const response = await httpClient.get<any[]>(API_ENDPOINTS.organisations.me);
```

**Avant** (envoi JSON sans image) :
```typescript
const response = await evenementService.create(submitData);
```

**Après** (envoi FormData avec image) :
```typescript
const fd = new FormData();
fd.append('nom_evenement', JSON.stringify(formData.nom));
fd.append('affiche', affiche); // fichier image
fd.append('statut', statut);   // 'publie' ou 'brouillon'
// ...
const response = await evenementService.create(fd);
```

### #8 — Sauvegarder un événement en brouillon
- **Problème** : Le bouton "Sauvegarder brouillon" affichait juste un toast sans rien sauvegarder
- **Fichiers modifiés** :
  - `frontEnd/src/pages/AjouterEvenement.tsx` — Le bouton appelle `submitEvent('brouillon')` qui envoie le formulaire avec `statut=brouillon`
  - `backend/models/events/Evenement.js` — Le hook `beforeValidate` ne remplace plus le statut `brouillon`
  - `backend/controllers/evenementController.js` — Accepte le statut depuis le body de la requête

### #10 — Ajouter un événement aux favoris
- **Problème** : Le hook `useFavoriCheck` retournait une fonction nommée `toggle`, mais `useEventDetails` essayait de la récupérer sous le nom `toggleFavorite` → résultat : `undefined`, le clic ne faisait rien
- **Fichier modifié** :
  - `frontEnd/src/hooks/useFavoris.ts` — Ajout d'un alias `toggleFavorite: toggle` dans le return

**Avant** :
```typescript
return { isFavorite, favoriId, loading, toggle };
```

**Après** :
```typescript
return { isFavorite, favoriId, loading, toggle, toggleFavorite: toggle };
```

### #13 — Annuler son inscription à un événement
- **Problème** : Pas de route `DELETE` backend + le bouton frontend appelait la mauvaise fonction
- **Fichiers modifiés** :
  - `backend/routes/evenementRoutes.js` — Ajout de `DELETE /api/evenements/:id/inscription`
  - `frontEnd/src/pages/event/EventRegistration.tsx` — Le bouton "Annuler" appelle `onUnregister()` au lieu de `onRegister()`
  - `frontEnd/src/pages/EventDetailsPage.tsx` — Passe `unregisterFromEvent` comme prop `onUnregister`

### #19 — Parcourir les événements associés
- **Problème** : Les paramètres de recherche ne correspondaient pas à l'API backend
- **Fichier modifié** :
  - `frontEnd/src/pages/event/RelatedEvents.tsx` — Utilise `type` et `wilaya` (au lieu de `type_evenement_id` et `wilaya_id`), ajoute `upcoming: true`, filtre côté client

### #23 — Note de commentaire sur un événement
- **Problème** : La note (étoiles) saisie par l'utilisateur n'était pas envoyée au backend
- **Fichier modifié** :
  - `frontEnd/src/hooks/useEventDetails.ts` — Ajout de `note_qualite: note` dans l'appel à `commentaireService.createCommentaireEvenement`

**Avant** :
```typescript
const response = await commentaireService.createCommentaireEvenement(eventId, {
  contenu,
  // Note est généralement gérée séparément
});
```

**Après** :
```typescript
const response = await commentaireService.createCommentaireEvenement(eventId, {
  contenu,
  note_qualite: note,
});
```

---

## 6. Liste complète des fichiers modifiés

### Nouveaux fichiers (3)
| Fichier | Rôle |
|---------|------|
| `backend/routes/organisationRoutes.js` | Routes API organisations |
| `backend/migrations/20260220-add-event-virtual-fields.js` | Migration DB |
| `frontEnd/src/pages/AjouterOrganisation.tsx` | Page création organisation |

### Fichiers modifiés (13)
| Fichier | Modification |
|---------|-------------|
| `backend/controllers/evenementController.js` | Upload affiche, parsing FormData, statut, liaison org |
| `backend/models/events/Evenement.js` | ENUM statut, id_lieu nullable, url_virtuel |
| `backend/routes/evenementRoutes.js` | Route DELETE inscription, middleware multer |
| `backend/routes/index.js` | Montage route organisations |
| `frontEnd/src/App.tsx` | Route /ajouter-organisation |
| `frontEnd/src/config/api.ts` | Endpoints organisations |
| `frontEnd/src/hooks/useEventDetails.ts` | note_qualite, cleanup imports |
| `frontEnd/src/hooks/useFavoris.ts` | Alias toggleFavorite |
| `frontEnd/src/pages/AjouterEvenement.tsx` | httpClient, FormData, brouillon |
| `frontEnd/src/pages/EventDetailsPage.tsx` | Prop onUnregister |
| `frontEnd/src/pages/event/EventRegistration.tsx` | Bouton désinscription |
| `frontEnd/src/pages/event/RelatedEvents.tsx` | Params recherche alignés |
| `frontEnd/src/services/evenement.service.ts` | Override create() pour FormData |

---

## 7. Comment tester

### Test rapide des routes backend (PowerShell)
```powershell
# Santé du serveur
Invoke-RestMethod -Uri http://localhost:3001/health

# Liste des événements
Invoke-RestMethod -Uri http://localhost:3001/api/evenements

# Types d'organisations
Invoke-RestMethod -Uri http://localhost:3001/api/organisations/types
```

### Tests manuels dans le navigateur (`http://localhost:8080`)

1. **Footer → Événements** : Scroller en bas de la page d'accueil, cliquer sur "Événements"
2. **Créer une organisation** : Se connecter en pro → `/ajouter-organisation` → remplir le formulaire
3. **Créer un événement** : `/ajouter-evenement` → choisir présentiel ou en ligne → ajouter une image → publier
4. **Sauvegarder brouillon** : Sur la page création, cliquer "Sauvegarder brouillon"
5. **Favoris** : Ouvrir un événement → cliquer sur le cœur
6. **Désinscription** : S'inscrire à un événement → cliquer "Annuler mon inscription"
7. **Événements associés** : En bas d'une page événement → vérifier que des événements similaires s'affichent
8. **Note commentaire** : Ajouter un avis avec des étoiles sur un événement

---

## 8. En cas de problème

### La migration échoue
```bash
# Vérifier le statut
npx sequelize-cli db:migrate:status

# Annuler la dernière migration
npx sequelize-cli db:migrate:undo

# Relancer
npx sequelize-cli db:migrate
```

### Le backend ne démarre pas
- Vérifier que MySQL est lancé
- Vérifier le fichier `.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- Vérifier que `DB_SYNC=false` dans `.env`

### Le frontend affiche des erreurs TypeScript
```bash
cd frontEnd
npm run dev
# Les erreurs s'affichent dans le terminal
```
