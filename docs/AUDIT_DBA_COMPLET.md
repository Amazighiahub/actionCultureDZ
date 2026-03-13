# AUDIT DBA COMPLET — EventCulture

**Date :** 2026-03-13
**Auditeur :** Claude Opus 4.6 (DBA Senior / Expert Sequelize)
**Scope :** Modèles, migrations, requêtes, index, performance

---

## RÉSUMÉ EXÉCUTIF

| Sévérité | Nombre | Description |
|----------|--------|-------------|
| 🔴 CRITIQUE | 5 | Bugs schema, perte de données, erreurs de prix |
| 🟠 MAJEUR | 14 | N+1, inserts en boucle, cascades manquantes, pagination |
| 🟡 MINEUR | 12 | Index composites, timestamps, conventions |
| 🔵 SUGGESTION | 6 | Optimisations long terme |
| **TOTAL** | **37** | |

**Verdict :** La base est fonctionnelle mais présente des risques de corruption de données (FK cassée ParcoursLieu) et des problèmes de performance qui exploseront sous charge.

---

## 🔴 CRITIQUE

### CRIT-01 — ParcoursLieu référence table inexistante `'lieux'`
**Fichier :** `backend/models/associations/parcoursLieu.js:22`
**Problème :** `references: { model: 'lieux' }` mais la table Lieu a `tableName: 'lieu'` (singulier)
**Impact :** La FK ne peut pas être créée en base → aucune intégrité référentielle sur les parcours
**Correction :**
```js
// Ligne 22
references: {
  model: 'lieu',  // ← était 'lieux'
  key: 'id_lieu'
}
```

---

### CRIT-02 — Artisanat.prix utilise FLOAT au lieu de DECIMAL
**Fichier :** `backend/models/oeuvres/artisanat.js:38-39`
**Problème :** `type: DataTypes.FLOAT` pour un champ monétaire
**Impact :** Erreurs d'arrondi sur les prix (ex: 19.99 stocké comme 19.9899997)
**Correction :**
```js
prix: {
  type: DataTypes.DECIMAL(10, 2)
}
```

---

### CRIT-03 — Inserts séquentiels dans transaction (patrimoine create/update)
**Fichier :** `backend/services/patrimoine/patrimoineService.js:169-227, 281-333`
**Problème :** 4 boucles `for...of` avec `await Model.create()` individuel dans une transaction
**Impact :** Pour un site avec 5 monuments + 3 vestiges + 4 services + 6 médias = 18 queries INSERT séquentielles au lieu de 4 bulkCreate
**Correction :**
```js
// AVANT (169-178)
for (const m of data.monuments) {
  await Monument.create({...}, { transaction });
}

// APRÈS
const monumentsToCreate = data.monuments
  .filter(m => m?.nom?.fr || m?.nom)
  .map(m => ({
    id_detail_lieu: detailId,
    nom: m.nom || { fr: '' },
    description: m.description || { fr: '' },
    type: this._normalizeMonumentType(m.type)
  }));
if (monumentsToCreate.length) {
  await Monument.bulkCreate(monumentsToCreate, { transaction });
}
// Même pattern pour vestiges, services, medias
```

---

### CRIT-04 — Inserts séquentiels parcours étapes
**Fichier :** `backend/services/parcours/parcoursService.js:131`
**Problème :** Boucle `for (const etape of data.etapes) { await addEtape() }` — N inserts séquentiels
**Impact :** Parcours avec 15 étapes = 15 queries INSERT
**Correction :** Utiliser `bulkCreate()` sur ParcoursLieu

---

### CRIT-05 — `model.findAll()` sans limit (bypass BaseRepository)
**Fichiers :**
- `patrimoineRepository.js:79` — `findPopular` → `this.model.findAll()` sans limit
- `patrimoineRepository.js:203` — `findForMap` → `this.model.findAll()` sans limit
- `patrimoineRepository.js:221` — `getStats` → `this.model.findAll()` GROUP BY sans limit
- `evenementRepository.js:142` — `findByOeuvre` → sans limit
- `artisanatRepository.js:197,214` — stats GROUP BY sans limit
- `userRepository.js:209` — stats GROUP BY sans limit
- `serviceRepository.js:146` — stats GROUP BY sans limit

**Impact :** Ces queries contournent la pagination de BaseRepository et peuvent scanner la table entière. Sur une table avec 100k+ lignes, c'est un full table scan en production.
**Correction :** Ajouter `limit` à chaque `this.model.findAll()` direct :
```js
// findForMap — limiter les points sur la carte
return this.model.findAll({
  where,
  include,
  attributes: ['id_lieu', 'nom', 'latitude', 'longitude', 'typePatrimoine'],
  order: [['createdAt', 'DESC']],
  limit: options.limit || 500  // ← AJOUTER
});

// GROUP BY stats — limiter les groupes
this.model.findAll({
  attributes: ['id_type_user', [fn('COUNT', col('id_user')), 'count']],
  group: ['id_type_user'],
  raw: true,
  limit: 100  // ← AJOUTER (il n'y aura jamais 100 types)
});
```

---

## 🟠 MAJEUR

### MAJ-01 — Cascade DELETE manquante sur commentaires enfants
**Fichier :** `backend/models/misc/commentaire.js:74-79`
**Problème :** `commentaire_parent_id` FK sans `onDelete: 'CASCADE'`
**Impact :** Supprimer un commentaire parent laisse les réponses orphelines
**Correction :**
```js
Commentaire.belongsTo(models.Commentaire, {
  as: 'CommentaireParent',
  foreignKey: 'commentaire_parent_id',
  onDelete: 'CASCADE'  // ← AJOUTER
});
```

---

### MAJ-02 — Cascade DELETE manquante sur EvenementUser
**Fichier :** `backend/models/associations/evenementUser.js:119-134`
**Problème :** Pas de `onDelete` sur les associations belongsTo
**Impact :** Supprimer un événement/utilisateur laisse des inscriptions orphelines
**Correction :**
```js
EvenementUser.belongsTo(models.Evenement, {
  foreignKey: 'id_evenement',
  onDelete: 'CASCADE'  // ← AJOUTER
});
EvenementUser.belongsTo(models.User, {
  foreignKey: 'id_user',
  onDelete: 'CASCADE'  // ← AJOUTER
});
```

---

### MAJ-03 — Cascade DELETE manquante sur Service→User
**Fichier :** `backend/models/places/service.js:124-126`
**Problème :** `Service.belongsTo(User)` sans `onDelete`
**Impact :** Supprimer un utilisateur laisse des services orphelins
**Correction :** Ajouter `onDelete: 'SET NULL'`

---

### MAJ-04 — Pas de timestamps sur modèles enfants spécialisés
**Fichiers :** `livre.js`, `film.js`, `oeuvreArt.js`, `albumMusical.js`, `artisanat.js`, `critiqueEvaluation.js`, `qrCode.js`
**Problème :** `timestamps: false` sur ces modèles
**Impact :** Impossible de savoir quand une fiche livre/film a été modifiée → audit trail incomplet

---

### MAJ-05 — Entités polymorphiques sans intégrité référentielle
**Fichiers :** `signalement.js`, `favori.js`, `vue.js`
**Problème :** `id_entite` est un INTEGER générique sans FK. Le `type_entite` indique la table cible, mais aucune contrainte DB ne vérifie l'existence
**Impact :** Favoris/signalements/vues sur des entités supprimées → données orphelines
**Note :** Pattern polymorphique classique — pas de solution SQL pure. Mitigation : cleanup job CRON ou trigger applicatif.

---

### MAJ-06 — Boucle de mises à jour séquentielles dans reorderEtapes
**Fichier :** `backend/models/associations/parcoursLieu.js:142-146`
**Problème :**
```js
for (let i = 0; i < etapes.length; i++) {
  await etapes[i].update({ ordre: i + 1 }, { transaction });
}
```
**Impact :** N updates séquentiels pour réordonner les étapes
**Correction :** Raw query avec CASE WHEN :
```js
const cases = etapes.map((e, i) => `WHEN ${e.id_parcours_lieu} THEN ${i + 1}`).join(' ');
await sequelize.query(
  `UPDATE parcours_lieux SET ordre = CASE id_parcours_lieu ${cases} END WHERE id_parcours = ?`,
  { replacements: [parcoursId], transaction }
);
```

---

### MAJ-07 — Includes imbriqués 4 niveaux (produit cartésien)
**Fichier :** `backend/repositories/evenementRepository.js:30-50`
**Problème :** Lieu → Commune → Daira → Wilaya en includes imbriqués
**Impact :** Chaque niveau multiplie les lignes du résultat. Avec beaucoup de données, la taille du résultat explose
**Correction :** Spécifier `attributes` minimaux à chaque niveau :
```js
{
  model: this.models.Commune,
  attributes: ['id_commune', 'nom'],
  required: false,
  include: [{
    model: this.models.Daira,
    attributes: ['id_daira', 'nom'],
    required: false,
    include: [{
      model: this.models.Wilaya,
      attributes: ['id_wilaya', 'nom', 'code'],
      required: false
    }]
  }]
}
```

---

### MAJ-08 — findWithFullDetails charge 15+ associations
**Fichier :** `backend/repositories/oeuvreRepository.js:191-242`
**Problème :** Une seule query avec ~15 includes (Tags, Users, Categorie, Intervenants, Livre, Film, etc.)
**Impact :** Produit cartésien massif. Pour une oeuvre avec 3 tags, 2 users, 1 intervenant = 3×2×1 = 6 lignes SQL, mais avec plus de relations ça explose
**Correction :** Charger les associations séparément :
```js
// 1. Charger l'oeuvre avec includes directs (belongsTo)
const oeuvre = await this.model.findByPk(id, { include: basicIncludes });
// 2. Charger les many-to-many séparément
oeuvre.Tags = await oeuvre.getTags();
oeuvre.Intervenants = await OeuvreIntervenant.findAll({ where: { id_oeuvre: id } });
```

---

### MAJ-09 — Booleans avec DEFAULT sans allowNull: false
**Fichier :** `backend/models/users/user.js:195-294`
**Problème :** Champs comme `notifications_email`, `notifications_push`, `theme_sombre` ont `defaultValue: false` mais `allowNull` n'est pas `false`
**Impact :** NULL ≠ false en SQL. Les queries `WHERE notifications_email = false` ne retournent PAS les NULL
**Correction :** Ajouter `allowNull: false` sur tous les booleans avec defaultValue

---

### MAJ-10 — Composite PK mal défini sur ProgrammeIntervenant
**Fichier :** `backend/models/associations/programmeIntervenant.js:6-23`
**Problème :** Deux champs marqués `primaryKey: true` individuellement. Sequelize traite ça comme composite PK, mais la sémantique est ambiguë
**Impact :** Fonctionne en pratique mais rend le code ambigu
**Note :** À traiter séparément — changement de PK est risqué sur table existante

---

### MAJ-11 — User.id_user_validate non contraint par FK
**Fichier :** `backend/models/users/user.js`
**Problème :** `id_user_validate` (l'admin qui a validé) n'a pas de FK vers user
**Impact :** Si l'admin est supprimé, la référence pointe vers un ID inexistant

---

### MAJ-12 — Queries dans boucles du CRON service
**Fichier :** `backend/services/cronService.js:160,359,369,463`
**Problème :** Boucles `for...of` avec des updates/sends individuels
**Impact :** Les jobs CRON en production avec beaucoup de données seront très lents
**Correction :** bulkUpdate ou raw SQL batch

---

### MAJ-13 — bulkValidate/bulkSuspend font N updates
**Fichier :** `backend/services/dashboard/userManagementService.js:254`
**Problème :** `for (const userId of userIds)` avec update individuel
**Impact :** Validation de 50 utilisateurs = 50 UPDATE queries
**Correction :** `User.update({ statut: 'actif' }, { where: { id_user: { [Op.in]: userIds } } })`

---

### MAJ-14 — emailService.js envoie emails dans boucle séquentielle
**Fichier :** `backend/services/emailService.js:512`
**Problème :** `for (const participant of participants)` → envoi email individuel
**Impact :** 100 participants = 100 envois séquentiels (timeout possible)
**Note :** Partiellement mitigé par emailQueueService mais le pattern initial est problématique

---

## 🟡 MINEUR

### MIN-01 — Index composites manquants pour queries fréquentes
Voir section INDEX ci-dessous.

### MIN-02 — Notification.titre/message non-JSON (inconsistance i18n)
**Fichier :** `backend/models/misc/notification.js:35-41`
**Problème :** STRING/TEXT au lieu de JSON pour les champs multilingues

### MIN-03 — Convention de nommage indexes inconsistante
Certains nommés `id_index_*`, d'autres `idx_*`, d'autres sans nom.

### MIN-04 — VARCHAR(500) pour URLs (trop court)
**Fichiers :** `media.js:30`, `evenement.js:60`
**Correction :** VARCHAR(2048) ou TEXT

### MIN-05 — FLOAT pour coordonnées GPS (lieu.js vs DECIMAL ailleurs)
**Fichier :** `backend/models/places/lieu.js:61-75`
**Correction :** DECIMAL(10, 8) pour latitude, DECIMAL(11, 8) pour longitude

### MIN-06 — Pas de soft-delete unifié
Certains modèles utilisent `statut: 'supprime'`, d'autres suppriment réellement.

### MIN-07 — createdAt/updatedAt snake_case vs camelCase
`emailVerification.js` utilise `created_at`, les autres utilisent `date_creation` ou camelCase.

### MIN-08 — Index sur date_modification manquant
Colonnes `date_modification` dans user, oeuvre, evenement non indexées (utilisées dans ORDER BY).

### MIN-09 — Lieu.latitude/longitude devraient avoir CHECK constraint
Les coordonnées GPS devraient être bornées : lat [-90,90], lng [-180,180].

### MIN-10 — Service : pas de CHECK (id_lieu OU lat/lng obligatoire)
**Fichier :** `backend/models/places/service.js:11-17`

### MIN-11 — QRScan manque association vers QRCode
**Fichier :** `backend/models/misc/qrScan.js`

### MIN-12 — Boucle updates séquentiels dans cronService cleanup
**Fichier :** `backend/services/cronService.js:398`

---

## 🔵 SUGGESTIONS

### SUG-01 — Pagination cursor-based pour les listes longues
Offset-based pagination (actuelle) est O(n) pour les grands offsets. Cursor-based (WHERE id > last_id) est O(1).
**Candidats :** notifications, commentaires, favoris.

### SUG-02 — Read replicas pour les requêtes analytics
Les queries de stats (dashboard) pourraient être routées vers un replica MySQL.

### SUG-03 — Partitioning sur table `vues` et `audit_logs`
Tables à forte croissance → partition par mois sur `date_vue`/`date_action`.

### SUG-04 — Covering indexes pour les queries fréquentes
Ex: `idx_oeuvre_list(statut, date_creation, id_type_oeuvre) INCLUDE (nom, saisi_par)` pour éviter les lookups.

### SUG-05 — Connection pooling optimisation
Vérifier la config pool Sequelize (min/max/idle) selon la charge attendue.

### SUG-06 — Query logging en production
Activer le slow query log MySQL (> 1s) pour identifier les requêtes problématiques.

---

## SCHÉMA D'INDEX OPTIMAL

### Index existants (déjà en place) — OK ✅
Les migrations `20250119-add-performance-indexes.js` ont ajouté ~25 index couvrant les cas principaux.

### Index manquants — À AJOUTER

#### Priorité 1 (Performance critique)

| Table | Colonnes | Type | Raison |
|-------|----------|------|--------|
| `evenement` | `(statut, date_debut)` | Composite | Query "événements à venir publiés" |
| `oeuvre` | `(statut, date_creation)` | Composite | Query "oeuvres récentes publiées" |
| `user` | `(id_type_user, statut)` | Composite | Query "professionnels actifs" |
| `commentaire` | `(id_oeuvre, date_creation)` | Composite | Commentaires récents par oeuvre |
| `signalement` | `(id_moderateur)` | Single | FK lookup modérateur |

#### Priorité 2 (Optimisation)

| Table | Colonnes | Type | Raison |
|-------|----------|------|--------|
| `media` | `(id_oeuvre, visible_public)` | Composite | Médias publics d'une oeuvre |
| `notification` | `(id_evenement)` | Single | FK lookup |
| `notification` | `(id_oeuvre)` | Single | FK lookup |
| `evenement_oeuvre` | `(id_presentateur)` | Single | FK lookup |
| `user` | `(date_modification)` | Single | ORDER BY |
| `oeuvre` | `(date_modification)` | Single | ORDER BY |

---

## MIGRATION COMPLÈTE — Index + Fixes Schema

Voir fichier : `backend/migrations/20260313-dba-audit-fixes.js`
