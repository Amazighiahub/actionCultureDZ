# Merge des modèles Vérifier et Valider — Analyse et Proposition

## 1. État actuel — Champs et concepts

### Sur le modèle **User**

| Champ | Type | Usage | Conflit possible |
|-------|------|-------|-------------------|
| `statut` | ENUM('actif', 'en_attente_validation', 'inactif', 'suspendu', 'banni') | État global du compte | Chevauche avec statut_validation |
| `statut_validation` | ENUM('en_attente', 'valide', 'rejete', 'suspendu') | Validation professionnelle | Spécifique aux pros |
| `date_validation` | DATE | Date de validation | - |
| `id_user_validate` | INT | Admin qui a validé | - |
| `email_verifie` | BOOLEAN | Email vérifié | Vérification technique |
| `telephone_verifie` | BOOLEAN | Téléphone vérifié | Vérification technique |
| `raison_rejet` | TEXT | Motif de rejet | Lié à statut_validation |

### Logique actuelle (hooks, services)

- **Visiteur** (id_type_user=1) : `statut_validation = 'valide'` à la création
- **Professionnel** : `statut_validation = 'en_attente'` → validation admin → `'valide'`
- **userController** : `statut = data.statut_validation || 'non_demande'` (confusion possible)
- **userRoleController** : `statutCompte = 'en_attente_validation'` pour pros
- **authMiddleware** : vérifie `statut_validation === 'valide'` pour les pros

### Autres modèles

| Modèle | Champs liés | Rôle |
|--------|-------------|------|
| **EmailVerification** | token, type, used_at | Vérification email / MDP |
| **UserCertification** | verifie, date_verification, url_verification | Certifications professionnelles |
| **Oeuvre** | statut, date_validation, validateur_id | Validation contenu |
| **Service** | statut_validation | Validation service |
| **EvenementUser** | date_validation | Validation participation |

---

## 2. Problèmes identifiés

1. **Deux statuts sur User**  
   `statut` et `statut_validation` se recoupent (ex. `en_attente_validation` vs `en_attente`).

2. **Mise à jour non synchronisée**  
   Validation/rejet modifient surtout `statut_validation` sans toujours aligner `statut`.

3. **Lisibilité**  
   Difficile de savoir si on doit utiliser `statut` ou `statut_validation` selon les cas.

4. **`suspendu` en double**  
   `statut` et `statut_validation` peuvent être `suspendu` avec des sémantiques proches.

---

## 3. Proposition de merge — Schéma unifié

### Option A : Fusionner en un seul champ `statut` (recommandé)

**Nouveau ENUM `statut` :**

```
'actif'                    — Compte utilisable (visiteur ou pro validé)
'en_attente_validation'   — Pro en attente de validation admin
'valide'                   — (redondant avec actif pour pro — à éviter)
'rejete'                   — Demande de statut pro refusée
'inactif'                  — Compte désactivé par l'utilisateur
'suspendu'                 — Suspension temporaire (admin)
'banni'                    — Exclusion définitive (admin)
```

**Simplification proposée :**

| Statut unifié | Signification | Accès dashboard pro |
|---------------|---------------|---------------------|
| actif | Compte normal, visiteur ou pro validé | Oui si type = pro |
| en_attente_validation | Pro en attente | Non |
| rejete | Pro refusé | Non |
| inactif | Désactivé | Non |
| suspendu | Suspendu par admin | Non |
| banni | Banni | Non |

**Champs à conserver :**

- `statut` — statut unifié
- `date_validation` — date de dernière validation/rejet
- `id_user_validate` — admin ayant validé/rejeté
- `raison_rejet` — motif si rejet
- `email_verifie`, `telephone_verifie` — inchangés (vérifications techniques)

**Champ à supprimer :**

- `statut_validation` — fusionné dans `statut`

---

## 4. Migration proposée

### Étape 1 : Migration SQL

```sql
-- 1. Mettre à jour statut selon statut_validation
UPDATE user 
SET statut = CASE 
  WHEN statut_validation = 'valide' THEN 'actif'
  WHEN statut_validation = 'en_attente' THEN 'en_attente_validation'
  WHEN statut_validation = 'rejete' THEN 'rejete'
  WHEN statut_validation = 'suspendu' THEN 'suspendu'
  ELSE statut
END
WHERE statut_validation IS NOT NULL;

-- 2. Étendre l'ENUM statut si nécessaire
ALTER TABLE user MODIFY COLUMN statut 
ENUM('actif', 'en_attente_validation', 'rejete', 'inactif', 'suspendu', 'banni');

-- 3. Supprimer statut_validation
ALTER TABLE user DROP COLUMN statut_validation;
```

### Étape 2 : Mise à jour du modèle Sequelize

```javascript
// backend/models/users/user.js
statut: {
  type: DataTypes.ENUM('actif', 'en_attente_validation', 'rejete', 'inactif', 'suspendu', 'banni'),
  defaultValue: 'actif',
  allowNull: false
},
// Supprimer statut_validation
```

### Étape 3 : Remplacements dans le code

| Ancien | Nouveau |
|--------|---------|
| `user.statut_validation === 'valide'` | `user.statut === 'actif'` (pour pro) ou garder logique type + statut |
| `user.statut_validation === 'en_attente'` | `user.statut === 'en_attente_validation'` |
| `user.statut_validation === 'rejete'` | `user.statut === 'rejete'` |
| `statut_validation: 'valide'` | `statut: 'actif'` |
| `statut_validation: 'en_attente'` | `statut: 'en_attente_validation'` |

### Étape 4 : Fichiers à adapter (liste non exhaustive)

- `backend/models/users/user.js` — hooks, définition du modèle
- `backend/middlewares/authMiddleware.js` — `statut_validation` → `statut`
- `backend/services/dashboard/userManagementService.js` — validation users
- `backend/services/user/userService.js` — validation, suspension
- `backend/repositories/userRepository.js` — requêtes sur statut
- `backend/controllers/userController.js` — filtres, réponse API
- `backend/controllers/userRoleController.js` — création users
- `backend/routes/intervenantRoutes.js` — vérification pro
- `frontEnd/src/services/permissions.service.ts` — `statut_validation`
- `frontEnd/src/hooks/usePermissions.ts` — si usage de statut
- Tous les composants/admin qui affichent ou filtrent par statut

---

## 5. Option B : Garder les deux champs mais clarifier les rôles

Si on préfère ne pas supprimer `statut_validation` :

| Champ | Rôle |
|-------|------|
| `statut` | État du compte (actif, inactif, suspendu, banni) |
| `statut_validation` | Uniquement pour les pros (en_attente, valide, rejete) |

Conditions :

1. `statut` = état d’accès au site (connexion, suspension, bannissement).
2. `statut_validation` = workflow de validation du statut professionnel.
3. Un pro validé aura `statut = 'actif'` et `statut_validation = 'valide'`.

Avantage : aucune migration de schéma.  
Inconvénient : deux champs à maintenir et à synchroniser.

---

## 6. Recommandation

**Recommandation : Option A (merge en un seul `statut`)** pour :

1. Un seul champ à interroger et à maintenir.
2. Moins de risque d’incohérence entre `statut` et `statut_validation`.
3. Modèle plus simple à comprendre pour les développeurs.
4. Réduction des cas particuliers (ex. `suspendu` en double).

Prérequis :

- Faire la migration en environnement de dev/staging.
- Mettre à jour tous les usages de `statut_validation` listés plus haut.
- Vérifier les tests et les parcours critiques (auth, dashboard pro, admin).

---

## 7. Distinction Vérifier / Valider (à conserver)

Même après le merge, on garde la distinction suivante :

| Concept | Rôle | Exemples |
|---------|------|----------|
| **Vérifier** | Contrôle technique (email, téléphone, etc.) | `email_verifie`, `EmailVerification` |
| **Valider** | Décision humaine (admin) sur contenu ou statut | `date_validation`, `validateur_id` |

- **EmailVerification** : reste dédié aux tokens (email, MDP, etc.).
- **UserCertification** : reste pour les certifications avec `verifie`, `date_verification`.
- Les champs `*_verifie` (email, téléphone) restent des booléens de vérification technique.

Seul le statut du compte (actif / en attente / rejeté / suspendu / banni) est unifié dans `statut`.
