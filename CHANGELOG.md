# Changelog — EventCulture

## [2026-02-13] Fix article scientifique — médias et affichage

---

### 6. Correction : Médias non affichés après création d'une œuvre

**Problème :** Après avoir créé une œuvre (article scientifique ou autre) avec des fichiers médias, les médias n'apparaissaient pas sur la page de détail.

**Cause racine :** Le backend `OeuvreController.create()` recevait les fichiers uploadés via `req.files` (multer), mais ne créait jamais les enregistrements `Media` dans la base de données. Les fichiers étaient uploadés sur le serveur mais jamais associés à l'œuvre.

**Fichier modifié :**
- `backend/controllers/OeuvreController.js` — Ajout de l'étape 5 dans `create()` : parcours de `req.files`, parsing de `media_metadata` pour `is_principal`, et création des enregistrements `Media` dans la transaction.

---

### 7. Correction : Détails spécifiques non affichés sur la page de détail

**Problème :** La page de détail d'une œuvre n'affichait pas les champs spécifiques au type (journal, DOI, volume pour un article scientifique ; ISBN, nb_pages pour un livre ; durée, réalisateur pour un film, etc.).

**Cause racine (backend) :** `OeuvreController.getById()` ne chargeait pas les relations spécialisées (`Livre`, `Film`, `AlbumMusical`, `Article`, `ArticleScientifique`, `Artisanat`, `OeuvreArt`).

**Cause racine (frontend) :** `OeuvreInfo.tsx` n'avait aucune section pour afficher les champs spécifiques par type d'œuvre.

**Fichiers modifiés :**
- `backend/controllers/OeuvreController.js` — Ajout des includes conditionnels pour toutes les relations spécialisées dans `getById()`. Ajout de `is_principal` dans les attributs Media.
- `frontEnd/src/pages/oeuvre-detail/oeuvre/OeuvreInfo.tsx` — Ajout de sections dédiées pour :
  - **Article Scientifique** : journal, DOI (lien cliquable), volume/numéro, pages, badge peer-reviewed
  - **Article** : auteur, source, résumé, lien vers l'original
  - **Livre** : ISBN, nb_pages, format, collection
  - **Film** : durée, réalisateur, producteur, studio
  - **Album Musical** : durée, nb_pistes, label
  - Fix du rendu multilingue de la description (`getLocalizedText`)
  - Fix des accès directs `oeuvre.isbn` → `oeuvre.Livre?.isbn`, `oeuvre.duree` → `oeuvre.Film?.duree_minutes`
- `frontEnd/src/types/models/oeuvres-specialisees.types.ts` — Ajout des champs manquants : `Livre.format`, `Livre.collection`, `Film.producteur`, `Film.studio`, `AlbumMusical.nb_pistes`

---

## [2026-02-11] Corrections et améliorations

---

### 1. Correction du formulaire de création d'événement (`AjouterEvenement.tsx`)

**Problème :** Erreur 400 "Erreurs de validation" lors de la création d'un événement. Le frontend envoyait des noms de champs incorrects au backend.

**Cause racine :** Le mapping des champs frontend → backend ne correspondait pas aux validations du routeur Express (`evenementRoutes.js`).

| Champ frontend (avant) | Champ backend attendu | Type attendu |
|---|---|---|
| `nom` | `nom_evenement` | JSON multilingue |
| `typeEvenement` (string) | `id_type_evenement` | Integer (FK) |
| `lieu_id` | `id_lieu` | Integer (FK) |
| `maxParticipants` | `capacite_max` | Integer |

**Fichiers modifiés :**
- `frontEnd/src/pages/AjouterEvenement.tsx` — Corrigé le `handleSubmit` pour envoyer les bons noms et types de champs
- `frontEnd/src/services/metadata.service.ts` — Ajouté `getTypesEvenements()` pour charger les types d'événements depuis l'API `/metadata/types-evenements`

---

### 2. Intégration du composant `LieuSelector` dans les formulaires Patrimoine

**Problème :** Les formulaires d'ajout de patrimoine utilisaient des champs manuels (recherche d'adresse + latitude/longitude en saisie libre), alors que le formulaire d'événement disposait d'un composant `LieuSelector` plus ergonomique avec carte interactive et autocomplétion.

**Solution :** Remplacement des champs manuels par le composant `LieuSelector` dans les deux formulaires patrimoine.

**Fichiers modifiés :**
- `frontEnd/src/pages/admin/AjouterPatrimoine.tsx` (formulaire admin)
  - Import de `LieuSelector`
  - Remplacement de la section Localisation (recherche d'adresse, champs lat/lng, aperçu carte statique) par `<LieuSelector>`
  - Conservation des sélecteurs Wilaya/Commune pour le filtrage
  - Affichage des coordonnées en lecture seule quand un lieu est sélectionné
- `frontEnd/src/pages/AjouterPatrimoinePro.tsx` (formulaire professionnel)
  - Même remplacement que le formulaire admin
  - Suppression du code mort : fonctions `searchAddress`, `handleAddressInputChange`, `checkDuplicateLieu`, `handleSelectAddress`, `handleUseCurrentLocation`, `handleLocationSelect` et leurs états associés
  - Nettoyage des imports inutilisés (`lieuService`, `GeocodingResult`, `Search`, `Navigation`, `Eye`)

**Fonctionnalités du `LieuSelector` :**
- Sélection d'un lieu existant (recherche avec filtres par type, tri par distance)
- Création d'un nouveau lieu (carte interactive Leaflet, recherche d'adresse, géolocalisation, vérification de doublons)
- Mise à jour automatique de `latitude`, `longitude` et `adresse` dans le formulaire

---

### 3. Correction du responsive mobile (Header)

**Problème :** Le menu hamburger et le menu déroulant ne fonctionnaient pas correctement sur mobile.

**Fichier modifié :**
- `frontEnd/src/components/Header.tsx` — Réécriture du bloc JSX pour corriger le comportement responsive (navigation mobile vs desktop)

---

### 4. Correction du zoom excessif sur PC

**Problème :** L'interface apparaissait trop zoomée sur PC à 100%.

**Fichiers modifiés :**
- `frontEnd/src/index.css` — Réduction de la taille de police du header h1 et de la hauteur minimale de la navigation sur desktop. Suppression du override de font-size des badges desktop.
- `frontEnd/src/styles/language-styles.css` — Suppression du override de font-size sur la langue Tifinagh qui causait un effet de zoom.

---

### 5. Correction du dashboard admin — "Voir tout" et erreur React multilingue

#### 5a. Les liens "Voir tout" ne fonctionnaient pas

**Problème :** Cliquer sur "Voir tout" dans la vue d'ensemble admin naviguait vers `/admin?tab=users` mais l'onglet ne changeait pas.

**Cause racine :** `DashboardAdmin.tsx` utilisait `useState('overview')` pour l'onglet actif mais ne lisait jamais le paramètre `?tab=` de l'URL.

**Fichier modifié :**
- `frontEnd/src/pages/DashboardAdmin.tsx`
  - Ajout de `useSearchParams` pour lire le paramètre `?tab=` de l'URL
  - Synchronisation bidirectionnelle : URL → state (quand on navigue) et state → URL (quand on clique un onglet)

#### 5b. Erreur React : "Objects are not valid as a React child"

**Problème :** Crash avec l'erreur `Objects are not valid as a React child (found: object with keys {ar, en, fr})`.

**Cause racine :** Les champs `nom` et `prenom` du modèle `User` sont des **JSON multilingues** (`DataTypes.JSON` dans Sequelize), pas des strings. Ils étaient rendus directement comme enfants React (`{user.nom}`) au lieu d'extraire la bonne langue.

**Fichiers modifiés :**
- `frontEnd/src/pages/admin/AdminOverview.tsx`
  - Ajout du helper `getLocalizedText()` pour extraire la string d'un champ multilingue
  - Wrapping de `user.prenom`, `user.nom`, `user.type_user`, `oeuvre.titre`, `oeuvre.auteur.prenom/nom`, `item.entity_title` dans `getLocalizedText()`
- `frontEnd/src/pages/admin/AdminUsersTab.tsx`
  - Wrapping de `user.prenom`, `user.nom`, `user.type_user` dans `getLocalizedText()`
  - Correction de la recherche/filtrage pour utiliser `getLocalizedText()` avant comparaison

#### 5c. Bug `StatusBadge` avec `children`

**Problème :** `StatusBadge` était utilisé avec des `children` et un color string pour `status`, mais le composant n'accepte pas de `children` — il génère son propre label depuis le `status` prop.

**Fichiers modifiés :**
- `frontEnd/src/pages/admin/AdminUsersTab.tsx` — `<StatusBadge status={user.statut || 'en_attente'} size="sm" />`
- `frontEnd/src/pages/admin/AdminOeuvresTab.tsx` — `<StatusBadge status={oeuvre.statut || 'en_attente'} size="sm" />`
- `frontEnd/src/pages/admin/AdminEvenementsTab.tsx` — `<StatusBadge status={event.statut || 'brouillon'} size="sm" />`
- Suppression des fonctions `getStatusColor()` devenues inutiles dans ces trois fichiers
- Nettoyage des imports inutilisés (`Badge`, `useEffect`, `CardHeader`, `CardTitle`, `Filter`)

---

### Résumé des fichiers modifiés

| Fichier | Type de modification |
|---|---|
| `frontEnd/src/pages/AjouterEvenement.tsx` | Fix mapping champs événement |
| `frontEnd/src/services/metadata.service.ts` | Ajout `getTypesEvenements()` |
| `frontEnd/src/pages/admin/AjouterPatrimoine.tsx` | Intégration LieuSelector |
| `frontEnd/src/pages/AjouterPatrimoinePro.tsx` | Intégration LieuSelector + cleanup |
| `frontEnd/src/components/Header.tsx` | Fix responsive mobile |
| `frontEnd/src/index.css` | Fix zoom PC |
| `frontEnd/src/styles/language-styles.css` | Fix zoom Tifinagh |
| `frontEnd/src/pages/DashboardAdmin.tsx` | Fix "Voir tout" (sync URL ↔ tabs) |
| `frontEnd/src/pages/admin/AdminOverview.tsx` | Fix rendu multilingue |
| `frontEnd/src/pages/admin/AdminUsersTab.tsx` | Fix rendu multilingue + StatusBadge |
| `frontEnd/src/pages/admin/AdminOeuvresTab.tsx` | Fix StatusBadge |
| `frontEnd/src/pages/admin/AdminEvenementsTab.tsx` | Fix StatusBadge + cleanup |
