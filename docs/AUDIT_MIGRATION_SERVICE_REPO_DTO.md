# Audit Migration Service / Repository / DTO

**Date** : 21 mars 2026  
**Scope** : Tous les controllers backend → conformité pattern Service/Repository/DTO + conformité frontend

---

## 1. Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| **Controllers audités** | 25 (+ 4 sous-modules dashboard) |
| **Migrés vers Service Pattern** | ✅ 24/25 |
| **Non-migrés (accès direct DB)** | ⚠️ 1 (statsController) + anomalies partielles dans patrimoineController |
| **DTOs complets (toJSON/toCardJSON/toDetailJSON)** | 8 modules |
| **DTOs manquants** | ~10 controllers sans DTO dédié |
| **Conformité frontend** | ⚠️ 3 problèmes critiques détectés |

---

## 2. Matrice Complète Controller → Service → Repository → DTO

### ✅ Migration COMPLÈTE (Controller → Service → Repository → DTO)

| Controller | Service | Repository | DTO | Export |
|-----------|---------|-----------|-----|--------|
| `userController.js` | `user/userService.js` | `userRepository.js` | `user/userDTO.js` + `createUserDTO.js` + `updateUserDTO.js` | `new UserController()` |
| `oeuvreController.js` | `oeuvre/oeuvreService.js` | `oeuvreRepository.js` | `oeuvre/oeuvreDTO.js` + `createOeuvreDTO.js` + `updateOeuvreDTO.js` | `new OeuvreController()` |
| `evenementController.js` | `evenement/evenementService.js` | `evenementRepository.js` | `evenement/evenementDTO.js` | `new EvenementController()` |
| `artisanatController.js` | `artisanat/artisanatService.js` | `artisanatRepository.js` | `artisanat/artisanatDTO.js` | `new ArtisanatController()` |
| `patrimoineController.js` | `patrimoine/patrimoineService.js` | `patrimoineRepository.js` | `patrimoine/patrimoineDTO.js` | `new PatrimoineController()` |
| `parcoursController.js` | `parcours/parcoursService.js` | `parcoursRepository.js` | `parcours/parcoursDTO.js` | `new ParcoursController()` |
| `serviceController.js` | `service/serviceService.js` | `serviceRepository.js` | `service/serviceDTO.js` | `new ServiceController()` |

**→ Les 7 modules principaux sont 100% migrés avec la chaîne complète Controller → Service → Repository → DTO.**

---

### ✅ Migration Service Pattern (Controller → Service, sans DTO dédié)

Ces controllers délèguent correctement au service, mais n'utilisent pas de DTO dédié (ils utilisent `translateDeep()` ou retournent les données brutes du service).

| Controller | Service | Repository | DTO | Statut |
|-----------|---------|-----------|-----|--------|
| `commentaireController.js` | `commentaireService.js` | `commentaireRepository.js` | ❌ (translateDeep) | ✅ Migré, pas de DTO |
| `favoriController.js` | `favoriService.js` | `favoriRepository.js` | ❌ (translateDeep) | ✅ Migré, pas de DTO |
| `notificationController.js` | `notificationService.js` | `notificationRepository.js` | ❌ (translateDeep) | ✅ Migré, pas de DTO |
| `signalementController.js` | `signalement/signalementService.js` | `signalementRepository.js` | ❌ | ✅ Migré, pas de DTO |
| `intervenantController.js` | `intervenantService.js` | `intervenantRepository.js` | ❌ (translateDeep) | ✅ Migré, pas de DTO |
| `lieuController.js` | `lieuService.js` | `lieuRepository.js` | ❌ (translateDeep) | ✅ Migré, pas de DTO |
| `programmeController.js` | `programmeService.js` | `programmeRepository.js` | ❌ (translateDeep) | ✅ Migré, pas de DTO |
| `vueController.js` | `vueService.js` | `vueRepository.js` | ❌ | ✅ Migré, pas de DTO |
| `articleBlockController.js` | `articleBlockService.js` | `articleBlockRepository.js` | ❌ | ✅ Migré, pas de DTO |

---

### ✅ Migration Service Pattern (Controller → Service, sans Repository)

Ces controllers utilisent un service mais le service accède directement aux models (pas de repository intermédiaire).

| Controller | Service | Repository | Justification |
|-----------|---------|-----------|--------------|
| `metadataController.js` | `metadataService.js` | ❌ | Lecture seule de tables de référence, un repo n'apporterait pas de valeur |
| `uploadController.js` | `upload/uploadService.js` | ❌ | Logique fichiers/Cloudinary, pas de CRUD classique |
| `emailVerificationController.js` | `emailVerificationService.js` | ❌ | Logique transverse (email + token + user), pas un CRUD |
| `multilingualController.js` | `multilingualService.js` | ❌ | Utilitaire de traduction, pas de données propres |
| `professionnelController.js` | `professionnelService.js` | ❌ | Agrège plusieurs repos existants (user, oeuvre, evenement) |
| `searchController.js` | `searchService.js` | ❌ | Recherche multi-entités, agrège plusieurs models |
| `dashboardController.js` | `dashboard/*.js` (5 services) | ❌ | Agrège plusieurs services (stats, moderation, monitoring, userManagement) |

---

### ⚠️ NON-MIGRÉ / Anomalies

| Controller | Problème | Sévérité |
|-----------|----------|----------|
| **`statsController.js`** | Accède directement aux models Sequelize (`Lieu.count()`, `User.count()`, etc.) via `container._models` — **NE passe PAS par un service** | 🔴 **Critique** |
| **`patrimoineController.js`** lignes 115-122 | `getTypes()` accède directement à `models.Lieu.findAll()` au lieu de passer par `patrimoineService` | 🟡 Moyen |
| **`patrimoineController.js`** lignes 224-261 | `noter()`, `ajouterFavoris()`, `retirerFavoris()` accèdent directement aux models via `this.patrimoineService.models` | 🟡 Moyen |
| **`patrimoineController.js`** lignes 263-295 | `uploadMedias()`, `deleteMedia()` accèdent directement aux models `LieuMedia` | 🟡 Moyen |
| **`commentaireController.js`** ligne 209 | Export `module.exports = CommentaireController` (classe, pas singleton) — **incohérent** avec les 7 modules principaux qui exportent `new XxxController()` | 🟡 Moyen |
| **`favoriController.js`** ligne 180 | Export `module.exports = FavoriController` (classe, pas singleton) | 🟡 Moyen |
| **`notificationController.js`** ligne 236 | Export `module.exports = NotificationController` (classe, pas singleton) | 🟡 Moyen |
| **`signalementController.js`** ligne 94 | Export `module.exports = SignalementController` (classe, pas singleton) | 🟡 Moyen |
| **`searchController.js`** ligne 81 | Export `module.exports = SearchController` (classe, pas singleton) | 🟡 Moyen |
| **`vueController.js`** ligne 160 | Export `module.exports = VueController` (classe, pas singleton) | 🟡 Moyen |

> **Note sur les exports** : Les routes instancient ces controllers avec `new XxxController()` dans les fichiers routes, donc fonctionnellement ça marche. Mais c'est **incohérent** avec le pattern singleton des 7 modules principaux (`module.exports = new XxxController()`).

---

## 3. Conformité Frontend ↔ Backend

### ⚠️ Problème Critique #1 : Format de réponse `GET /api/oeuvres`

**Backend** (`oeuvreController.js` ligne 46-50) retourne :
```json
{
  "success": true,
  "data": [ ... ],        // tableau direct d'oeuvres
  "pagination": { ... }
}
```

**Frontend** (`oeuvre.service.ts` ligne 79-87, `OeuvreListResponse`) attend :
```json
{
  "success": true,
  "data": {
    "oeuvres": [ ... ],   // tableau DANS un objet
    "pagination": { ... }
  }
}
```

**Impact** : Le frontend accède à `response.data.oeuvres` (ligne 438, 656, 659) mais le backend envoie `response.data` comme tableau direct. La propriété `.oeuvres` sera `undefined`.

**Fichiers concernés** :
- Backend : `oeuvreController.js` lignes 46-50 (list), 93-97 (search), 113-116 (getPopular), 131-135 (getRecent)
- Frontend : `oeuvre.service.ts` lignes 438, 499-508, 565-588, 607-616, 648-671

---

### ⚠️ Problème Critique #2 : `POST /api/users/login` — données retournées

**Backend** (`userController.js` lignes 77-83) retourne :
```json
{
  "success": true,
  "message": "...",
  "data": {
    "user": { ... }       // seulement le user
  }
}
```

**Frontend** (`auth.service.ts` ligne 90-94) attend :
```ts
response.data → AuthTokenData (avec expiresIn, user, etc.)
```

**Impact** : Le backend retourne `{ user: {...} }` dans `data`, mais le frontend traite `response.data` comme un `AuthTokenData` et appelle `setAuthData(response.data)` qui cherche `expiresIn` et `user` directement sur `data`. Le `user` est imbriqué dans `data.user`, ce qui fonctionne. Mais `expiresIn` n'est **jamais envoyé** par le backend, donc le token expiry ne sera pas stocké correctement.

**Fichiers concernés** :
- Backend : `userController.js` lignes 74-83
- Frontend : `auth.service.ts` lignes 66-87, 90-95

---

### ⚠️ Problème Critique #3 : `POST /api/tracking/view` route vs appel frontend

**Frontend** (`oeuvre.service.ts` ligne 322) appelle :
```
POST /api/tracking/oeuvre/:id/view
```

**Backend** (`vueController.js`) expose :
```
POST /api/tracking/view    (avec body { type_entite, id_entite })
```

**Impact** : Le frontend appelle une route qui n'existe pas sur le backend. Le tracking des vues d'oeuvres échouera silencieusement (404).

---

### ✅ Conformité OK pour les modules suivants

| Module Frontend | Service Frontend | Backend Route | Format | Statut |
|----------------|-----------------|---------------|--------|--------|
| Auth login | `auth.service.ts` | `POST /api/users/login` | `{ success, data.user }` | ✅ (sauf expiresIn) |
| Auth register | `auth.service.ts` | `POST /api/users/register` | `{ success, data.user }` | ✅ |
| Auth logout | `auth.service.ts` | `POST /api/users/logout` | `{ success }` | ✅ |
| Auth profile | `auth.service.ts` | `GET /api/users/profile` | `{ success, data }` | ✅ |
| Artisanat list | `artisanat.service.ts` | `GET /api/artisanat` | `{ success, data[], pagination }` | ✅ |
| Evenement list | `evenement.service.ts` | `GET /api/evenements` | `{ success, data[], pagination }` | ✅ |
| Patrimoine list | `patrimoine.service.ts` | `GET /api/patrimoine/sites` | `{ success, data[], pagination }` | ✅ |
| Metadata | `metadata.service.ts` | `GET /api/metadata/all` | `{ success, data{...} }` | ✅ |
| Notifications | `notification.service.ts` | `GET /api/notifications` | `{ success, data{...} }` | ✅ |
| Favoris | `favori.service.ts` | `GET/POST /api/favoris` | `{ success, data }` | ✅ |
| Upload | `upload.service.ts` | `POST /api/upload/*` | `{ success, data }` | ✅ |

---

## 4. DTOs Manquants

Les controllers suivants n'ont pas de DTO dédié. Ce n'est pas bloquant (ils fonctionnent), mais c'est une dette technique :

| Module | A besoin d'un DTO ? | Priorité |
|--------|---------------------|----------|
| Commentaire | Oui (formatage réponse imbriquée) | Basse |
| Favori | Non (données simples) | — |
| Notification | Non (utilise translateDeep) | — |
| Signalement | Non (données admin simples) | — |
| Intervenant | Oui (formatage complexe avec stats) | Moyenne |
| Lieu | Oui (beaucoup de champs multilingues) | Moyenne |
| Programme | Oui (relations complexes) | Moyenne |
| Vue | Non (données analytics simples) | — |
| ArticleBlock | Non (structure simple) | — |

---

## 5. Actions Recommandées

### 🔴 Priorité Haute — ✅ CORRIGÉ

1. **✅ CORRIGÉ — Format de `GET /api/oeuvres`** : `oeuvreController.js` modifié pour retourner `{ data: { oeuvres: [...], pagination } }` sur les endpoints `list()`, `search()`, `getPopular()`, `getRecent()`, `getMyOeuvres()`.

2. **✅ CORRIGÉ — `expiresIn` dans les réponses auth** : `userController.js` modifié pour inclure `expiresIn` (en secondes) dans les réponses `login()`, `register()` et `refreshToken()` via la méthode `_getTokenExpirySeconds()`.

3. **✅ FAUX POSITIF — Route tracking** : La route `POST /api/tracking/:type/:id/view` existait déjà dans `trackingRoutes.js` (ligne 87). Le frontend est conforme.

### 🟡 Priorité Moyenne — ✅ CORRIGÉ

4. **✅ CORRIGÉ — `statsController.js`** : Logique migrée vers `statsService.getPublicStats()`. Le controller délègue maintenant à `container.statsService`. Zéro accès direct aux models.

5. **✅ CORRIGÉ — `patrimoineController.js`** : 6 méthodes migrées vers `patrimoineService.js` (`getTypes`, `noter`, `ajouterFavoris`, `retirerFavoris`, `uploadMedias`, `deleteMedia`). Le controller ne contient plus aucun accès direct aux models Sequelize.

6. **✅ CORRIGÉ — Exports singletons** : Les 19 controllers secondaires exportent maintenant des singletons (`module.exports = new XxxController()`). Les 19 fichiers routes correspondants ont été mis à jour pour utiliser le singleton directement au lieu de `new`.

### 🟢 Priorité Basse

7. Créer des DTOs pour `Intervenant`, `Lieu`, `Programme` si le formatage des réponses devient plus complexe.

---

## 6. Conclusion

La migration vers le pattern Service/Repository/DTO est **globalement réussie** pour les 7 modules principaux (User, Oeuvre, Evenement, Artisanat, Patrimoine, Parcours, Service). Les 18 controllers secondaires utilisent tous le service pattern via le `serviceContainer`, avec quelques exceptions mineures.

Les **3 problèmes critiques de conformité frontend** (format oeuvres, expiresIn manquant, route tracking) doivent être corrigés pour garantir le bon fonctionnement de l'application.
