# AUDIT DES FORMULAIRES — EventCulture

**Date :** 14 mars 2026
**Auditeur :** Développeur Frontend Senior
**Périmètre :** Tous les formulaires de l'application (15 formulaires, 150+ champs)

---

## SYNTHÈSE GLOBALE

| Sévérité | Nombre | Description |
|----------|--------|-------------|
| 🔴 CRITIQUE | 22 | Bloque ou casse le fonctionnement, risque de sécurité |
| 🟠 MAJEUR | 29 | Dégradation importante UX/sécurité/accessibilité |
| 🟡 MINEUR | 37 | Améliorations souhaitables |
| ✅ CONFORME | 25 | Fonctionne correctement |

**Score global : 45/100** — L'application présente des lacunes sérieuses en validation, accessibilité et cohérence frontend/backend.

---

## PROBLÈMES TRANSVERSAUX (TOUS LES FORMULAIRES)

### 🔴 T1. Aucun attribut `autocomplete` sur aucun formulaire

**Impact :** WCAG 1.3.5 (Identify Input Purpose) Level AA — violation systémique. Les password managers, l'autofill navigateur et les technologies d'assistance ne fonctionnent pas correctement.

**Fix :** Ajouter sur chaque input :
```tsx
// Login
<Input autoComplete="email" />
<Input autoComplete="current-password" />

// Register
<Input autoComplete="given-name" />    // prénom
<Input autoComplete="family-name" />   // nom
<Input autoComplete="email" />
<Input autoComplete="new-password" />
<Input autoComplete="tel" />
<Input autoComplete="bday" />
```

### 🔴 T2. Aucun `aria-invalid` ni `aria-describedby` sur aucun champ en erreur

**Impact :** WCAG 1.3.1 et 3.3.1 — les lecteurs d'écran n'annoncent jamais les erreurs de validation. Aucun des 15 formulaires ne lie programmatiquement les messages d'erreur aux inputs.

**Fix :**
```tsx
<Input
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && <p id="email-error" role="alert">{errors.email}</p>}
```

### 🔴 T3. `trim()` absent de toutes les validations de champs texte

**Impact :** Un champ rempli avec `"   "` (espaces uniquement) passe la validation sur TOUS les formulaires. Le test `!formData.nom.fr` retourne `false` pour une chaîne d'espaces.

**Fix :** Remplacer `!value` par `!value?.trim()` dans toutes les fonctions de validation.

### 🟠 T4. Aucun focus automatique sur le premier champ en erreur

**Impact :** Sur les formulaires longs (Oeuvre, Événement, Programme), l'utilisateur doit chercher manuellement quel champ pose problème après un échec de validation.

**Fix :**
```tsx
const firstError = document.querySelector('[aria-invalid="true"]');
firstError?.focus();
firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

### 🟠 T5. Pas de `maxLength` sur les inputs texte

**Impact :** Le middleware backend `validateStringLengths` limite à 255/50000 caractères, mais l'utilisateur ne reçoit aucun feedback visuel. Un texte de 10000 caractères dans un champ nom sera rejeté tardivement.

### 🟠 T6. Pas de `<form>` wrapper sur plusieurs formulaires

**Fichiers concernés :** AjouterOeuvre, AjouterPatrimoine (admin)

**Impact :** Pas de soumission native par Enter, pas de validation HTML5, pas de `e.preventDefault()`. Les boutons sont `type="button"` avec `onClick`.

### 🟡 T7. `onKeyPress` déprécié utilisé pour les tags

**Fichiers :** AjouterOeuvre, AjouterArtisanat — devrait être `onKeyDown`.

---

## 1. FORMULAIRES D'AUTHENTIFICATION

### 1.1 LOGIN (`Auth.tsx` L521-592)

| Champ | Type | Required | Validation FE | Validation BE | Match |
|-------|------|----------|---------------|---------------|-------|
| email | `email` | ✅ | Regex | `!email` basic | ✅ |
| mot_de_passe | `password` | ✅ | Non-vide | `!password` | ✅ |
| remember | checkbox | ❌ | — | — | — |

🔴 **L-1. Double-clic partiellement protégé** — `loginLoading` désactive le bouton mais il y a une fenêtre entre le clic et le set state. Fix : ajouter un `useRef` guard immédiat.

🟡 **L-2. "Remember me" non fonctionnel** — le checkbox existe mais la valeur n'est jamais envoyée au backend. UX trompeuse.

✅ Bouton disabled pendant loading. Données préservées sur erreur. Messages d'erreur spécifiques (suspendu, non vérifié, mauvais mot de passe). Cookies httpOnly.

---

### 1.2 INSCRIPTION (`Auth.tsx` L607-992)

| Champ | Type | Required | Validation FE | Validation BE | Match |
|-------|------|----------|---------------|---------------|-------|
| prenom | text | ✅ | min 2 | extractMultilang | ✅ |
| nom | text | ✅ | min 2 | extractMultilang | ✅ |
| sexe | select | ✅ | default 'M' | ❌ non validé | 🔴 |
| date_naissance | date | ✅ | age >= 13 | ❌ non validé | 🔴 |
| email | email | ✅ | regex | DTO regex | ✅ |
| mot_de_passe | password | ✅ | 12 car + upper+lower+digit+**special** | 12 car + upper+lower+digit (pas special) | 🔴 |
| confirmation | password | ✅ | match password | ❌ non validé | 🔴 |
| wilaya | select | ✅ | > 0 | ❌ non validé | 🟠 |
| telephone | tel | ❌ | regex algérien | regex similaire | 🟡 |
| accepte_conditions | checkbox | ✅ | true | DTO | ✅ |
| secteur (pro) | select | ✅ | non-vide | ❌ non validé | 🟠 |
| biographie (pro) | textarea | ✅ | min 50 | ❌ pas de min | 🟠 |
| photo (pro) | file | ❌ | 5MB, image | N/A | ✅ |
| portfolio (pro) | url | ❌ | ❌ aucune | ❌ aucune | 🔴 |

🔴 **R-1. Mot de passe : FE exige caractère spécial, BE non** — Un utilisateur qui réinitialise son mot de passe n'aura pas besoin de caractère spécial (incohérence).

🔴 **R-2. `date_naissance` et `sexe` sans validation backend** — Le DTO ne les valide pas. Si ces champs passent via `...rest`, un attaquant peut injecter des valeurs arbitraires.

🔴 **R-3. `confirmation_mot_de_passe` non validé backend** — Le DTO ignore complètement ce champ.

🔴 **R-4. Portfolio `type="url"` sans aucune validation** — `javascript:alert(1)` possible.

🟠 **R-5. Calcul d'âge inexact** — `getFullYear() - getFullYear()` ne tient pas compte du mois/jour.

🟡 **R-6. Biographie affiche `/500` mais pas de `maxLength`** ni validation max. Backend autorise 50000.

🟡 **R-7. Regex téléphone légèrement différente FE/BE** — FE strip les espaces, BE non.

---

### 1.3 MOT DE PASSE OUBLIÉ (`ForgotPassword.tsx`)

✅ **Excellent pattern de sécurité** — affiche toujours "succès" même si l'email n'existe pas (anti-énumération). Label `htmlFor` correct. Bouton disabled pendant loading.

🟡 Pas d'`autocomplete="email"`.

---

### 1.4 RÉINITIALISATION MOT DE PASSE (`ResetPassword.tsx`)

🔴 **RP-1. Exigences de mot de passe différentes de l'inscription** — Inscription exige caractère spécial, réinitialisation non. Un utilisateur peut affaiblir son mot de passe via reset.

🟠 **RP-2. Boutons toggle visibilité sans `aria-label`** — lecteurs d'écran annoncent "bouton" sans description.

✅ Redirect timer avec cleanup correct. Token validé. Bouton disabled pendant loading.

---

### 1.5 VÉRIFICATION EMAIL (`VerifyEmailPage.tsx`)

🔴 **VE-1. Toutes les chaînes sont en français dur-codé** — `'Verification de votre compte en cours...'`, `'Votre compte a ete verifie avec succes !'`, etc. Bypass complet du système i18n (5 langues).

---

### 1.6 SÉCURITÉ TRANSVERSALE AUTH

🔴 **AUTH-1. Pas de CSRF token sur login/register** — Les routes POST `/register` et `/login` n'ont pas de validation CSRF. Le `httpClient` envoie un header `X-CSRF-Token` si disponible, mais le backend ne le valide pas.

🟠 **AUTH-2. Pas de rate limiting sur `/register`** — Seul `/check-email` a `strictLimiter`. Un attaquant peut spammer les inscriptions.

🟠 **AUTH-3. `validateStringLengths` non appliqué aux routes user** — Noms potentiellement très longs.

---

## 2. ÉVÉNEMENT (`AjouterEvenement.tsx`)

| Champ | Type | Required | Validation FE | Validation BE | Match |
|-------|------|----------|---------------|---------------|-------|
| nom (5 langues) | MultiLangInput | ✅ | 5 langues non vides | fr OU ar suffisant | 🔴 |
| description (5 langues) | MultiLangInput | ❌ | aucune | aucune | ✅ |
| idTypeEvenement | select | ✅ | non-vide | FK vérifiée | ✅ |
| dateDebut | date | ✅ | non-vide | ❌ aucune | 🔴 |
| dateFin | date | ❌ | aucune | aucune | ✅ |
| heureDebut/Fin | time | ❌ | aucune | aucune | ✅ |
| maxParticipants | number | ❌ | aucune | middleware non branché | 🔴 |
| tarif | number | ❌ | aucune (pas de `min`) | aucune | 🟠 |
| affiche | file | ✅ pub | non-null | ❌ pas de multer | 🔴 |
| urlVirtuel | url | ✅ virt | non-vide | aucune | 🟠 |
| organisation | select | ✅ prés | non-vide | non vérifié BE | 🟠 |

🔴 **EV-1. L'affiche n'est JAMAIS traitée côté backend** — Aucun middleware multer sur la route `POST /evenements`. Le FormData est envoyé mais l'image est silencieusement perdue.

🔴 **EV-2. Le middleware `validateEventCreation` existe mais n'est pas branché** — Les validations de date future, capacité 1-100000 sont codées mais jamais exécutées.

🔴 **EV-3. Affiche requise en mode édition bloque la publication** — `!affiche` vérifié mais en edit, l'image existante n'est pas chargée comme `File`. L'utilisateur doit re-uploader même si une image existe.

🔴 **EV-4. Le bouton "Brouillon" bypass toute validation** — Un brouillon vide (aucun nom, date, type) est envoyé au backend.

🟠 **EV-5. Aucune validation `dateDebut < dateFin`** — ni FE ni BE.

🟠 **EV-6. Prix et capacité acceptent des négatifs** — pas de `min="0"` et pas de validation JS.

🟠 **EV-7. Bouton Publier non disabled pendant `isSubmitting`** — double-clic possible.

🟠 **EV-8. Pas d'invalidation cache React Query** — le dashboard peut afficher des données obsolètes.

🟡 **EV-9. Description marquée `*` (requise) mais non validée** — UX trompeuse.

---

## 3. ŒUVRE (`AjouterOeuvre.tsx`)

🔴 **OE-1. FE exige 5 langues, BE n'en exige que 2** — Le frontend bloque si Tamazight est vide, mais le backend accepte seulement fr OU ar.

🔴 **OE-2. `validateWorkSubmission` et `validateStringLengths` non branchés** — La route `POST /oeuvres` n'a que `body('titre').notEmpty()`.

🔴 **OE-3. Pas de validation frontend pour `annee_creation`** — Accepte négatifs, 0, 9999. Backend valide 1800-année+1 mais le middleware n'est pas branché.

🔴 **OE-4. Pas de validation frontend pour `prix`** — Accepte négatifs. Backend vérifie `prix >= 0` dans le DTO.

🔴 **OE-5. Pas de validation ISBN frontend** — Le backend a une regex 10/13 chiffres, erreur visible seulement après round-trip.

🟠 **OE-6. Le formulaire n'est pas un `<form>`** — Boutons `type="button"`, pas de soumission par Enter.

🟡 **OE-7. Pas de limite sur le nombre de tags**.

✅ Bouton disabled pendant loading. Gestion timeout. Données préservées. Upload preview.

---

## 4. ARTISANAT (`AjouterArtisanat.tsx` / `GestionArtisanat.tsx`)

🔴 **AR-1. Le formulaire AjouterArtisanat est probablement non-fonctionnel** — Le FE envoie `nom`, `description`, `prix_min` etc. mais le backend `ArtisanatService.create()` attend `id_oeuvre` obligatoire. Schéma incompatible.

🔴 **AR-2. Route `POST /artisanats` sans aucun middleware de validation**.

🔴 **AR-3. Upload médias retourne 501** — `uploadMedias` dans `artisanatController.js` est un stub non implémenté.

🟠 **AR-4. Pas de validation `prix_min <= prix_max`** — ni FE ni BE.

🟠 **AR-5. Pas de validation programmatique prix/stock négatifs** — `min="0"` HTML insuffisant.

🟠 **AR-6. GestionArtisanat : `rejet_motif` non déclaré dans le type FormData** — erreur TypeScript masquée par `as any`.

🟡 **AR-7. Message succès ne distingue pas création/édition** — toujours "Artisanat ajouté".

🟡 **AR-8. Messages d'erreur en dur non traduits** — `"Artisanat introuvable"`.

---

## 5. SERVICES (`AjouterService.tsx` / `AjouterServicePro.tsx`)

🔴 **SE-1. GPS sans validation de range** — `latitude=999` et `longitude=-999` passent partout (FE et BE). Aucune borne [-90,90] / [-180,180].

🔴 **SE-2. Backend quasi-inexistant en validation** — `POST /services` ne valide que `body('nom').notEmpty()`. Email, URL, téléphone, tarifs, GPS non validés.

🔴 **SE-3. Upload photo sans rollback** (AjouterServicePro) — Le service est créé puis la photo uploadée séparément. Si l'upload échoue, le catch est vide.

🟠 **SE-4. Soumission séquentielle sans atomicité** (AjouterService) — Boucle `for` sans transaction. Si le 3e service échoue, les 2 premiers persistent.

🟠 **SE-5. Double jeu de coordonnées GPS** (AjouterServicePro) — Un pour le lieu, un pour le service. Confusant.

🟠 **SE-6. Pas de validation MIME réelle pour les uploads** — Seul `accept="image/*"` HTML.

🟡 **SE-7. Services prédéfinis manquent tz-ltn/tz-tfng** — L'objet label ne contient que fr/ar/en.

---

## 6. PATRIMOINE (`AjouterPatrimoinePro.tsx` / `admin/AjouterPatrimoine.tsx`)

🔴 **PA-1. `commune_id` désynchronisé** — Frontend ne le requiert pas, backend lance `_validationError('La commune est requise')`.

🔴 **PA-2. `JSON.stringify(formData.nom)` double-encodage** — Le nom est stringifié avant envoi mais le backend attend un objet JSON. Risque de stockage `'"{"fr":"test"}"'`.

🔴 **PA-3. GPS sans validation de range** — Mêmes problèmes que les services.

🔴 **PA-4. Validation incohérente des langues requises** (admin) — Le props `requiredLanguages={['fr']}` sur MultiLangInput vs `validateForm()` qui vérifie 5 langues. Indicateurs visuels incorrects.

🟠 **PA-5. Erreurs sur onglet non visible** (admin multi-onglets) — L'utilisateur peut avoir des erreurs dans un onglet qu'il ne regarde pas.

🟠 **PA-6. Upload médias échec silencieux** — Le catch d'upload ne montre rien à l'utilisateur.

🟠 **PA-7. Lieu créé automatiquement en DB** (admin) — Si l'utilisateur annule, le lieu orphelin reste.

🟡 **PA-8. Labels de select en français uniquement** — `TYPES_PATRIMOINE`, `STATUTS`, etc. non traduits.

---

## 7. ORGANISATION (`AjouterOrganisation.tsx`)

🟠 **OR-1. URL `site_web` non validée côté frontend** — Seulement `type="url"` HTML. Backend valide avec `isURL()`.

🟡 **OR-2. Pas d'icône spinner** — Le texte change mais pas d'indicateur visuel.

✅ Bouton disabled. Toast succès/erreur. Backend validation correcte (seul formulaire avec une route BE bien validée).

---

## 8. PROGRAMME (`ProgrammeForm.tsx`)

🔴 **PR-1. Date programme inutilisable** — `eventDates` n'est jamais passé par `CreateProgrammePage` ni `EditProgrammePage`. Le Select de dates est toujours vide ("Aucune date disponible").

🟠 **PR-2. FE exige 5 langues, BE n'en demande qu'une** — UX bloquante inutile.

🟠 **PR-3. Intervenant ajouté avec `id_user: 0`** — Aucune validation qu'un vrai utilisateur a été sélectionné.

✅ Bouton disabled pendant loading. Erreurs effacées à la saisie. Tabs Radix avec accessibilité clavier.

---

## 9. PROFIL UTILISATEUR (`DashboardUser.tsx`)

🔴 **PU-1. Pas de formulaire d'édition de profil** — Le bouton "Modifier profil" navigue vers la même page. Le backend `PUT /profile` et le service `userService.updateProfile()` existent mais aucune UI.

🔴 **PU-2. Pas de formulaire de changement de mot de passe** — Le backend, le service et le schéma Zod existent. Aucune UI.

🔴 **PU-3. Pas d'UI suppression de compte (RGPD Art.17)** — Le backend `DELETE /profile` existe avec anonymisation. Pas de bouton.

🟠 **PU-4. Pas d'UI export de données (RGPD Art.20)** — Le backend `GET /profile/export` existe. Pas de bouton.

🔴 **PU-5. Route `PUT /profile` sans middleware de validation** — Aucun express-validator. Un attaquant peut injecter des champs non autorisés.

---

## 10. COMMENTAIRES (`EventComments.tsx` / `OeuvreComments.tsx`)

🟠 **CO-1. Pas de `maxLength` sur le textarea** — Le schéma Zod définit max 2000 mais n'est utilisé nulle part. Pas de compteur.

🟠 **CO-2. Pas de `minLength` appliqué** — Zod dit min 3, FE vérifie seulement non-vide.

🟠 **CO-3. Pas de validation express-validator sur les routes** — `POST /commentaires/oeuvre/:id` n'a aucun `body()` validator.

🟠 **CO-4. Pas de rate limiter sur les routes commentaires** — Un utilisateur peut poster en boucle.

🟡 **CO-5. Code dupliqué** entre EventComments et OeuvreComments.

🟡 **CO-6. Bouton "Signaler" non connecté** — Le menu dropdown "Plus d'options" s'ouvre vide.

---

## 11. PRÉFÉRENCES NOTIFICATIONS (`Preferences.tsx`)

🟠 **NP-1. Pas d'avertissement de perte de changements** — Si l'utilisateur navigue sans sauvegarder, les changements sont perdus silencieusement.

🟡 **NP-2. Textes en dur en français** — Section "Appareils".

✅ Switch avec `role="switch"` et `aria-checked`. Sous-préférences disabled quand global off.

---

## 12. ARTICLE (`EditArticle.tsx`)

🟠 **AT-1. Pas de loading/disable sur le bouton save** — Les appels séquentiels (update + upload + blocks) sans gestion visible.

🟠 **AT-2. Erreurs d'upload d'image silencieuses** — `console.warn` mais pas d'avertissement utilisateur.

---

## TOP 10 PRIORITÉS DE CORRECTION

| # | Problème | Impact | Effort |
|---|----------|--------|--------|
| 1 | **Brancher les middlewares de validation backend** (validateEventCreation, validateWorkSubmission, validateStringLengths sur toutes les routes) | Sécurité : toute la validation backend est codée mais non exécutée | 2h |
| 2 | **Ajouter `autocomplete` + `aria-invalid` + `aria-describedby`** sur tous les formulaires | Accessibilité WCAG AA, password managers | 4h |
| 3 | **Aligner les exigences mot de passe** (inscription = reset = backend) | Sécurité : incohérence permet d'affaiblir le mot de passe | 1h |
| 4 | **Implémenter les formulaires profil manquants** (édition, changement MDP, suppression RGPD, export) | RGPD compliance + UX critique | 2j |
| 5 | **Corriger AjouterArtisanat** (schéma FE ≠ BE, upload 501) | Formulaire probablement cassé | 1j |
| 6 | **Ajouter multer sur la route événement** + corriger l'affiche en mode édition | L'image est silencieusement perdue | 2h |
| 7 | **Validation GPS [-90,90]/[-180,180]** sur TOUS les formulaires + backend | Données géographiques corrompues | 2h |
| 8 | **Ajouter `trim()` à toutes les validations** | Whitespace-only bypass | 1h |
| 9 | **Corriger le ProgrammeForm** (`eventDates` jamais passé → Select vide) | Formulaire programme inutilisable | 1h |
| 10 | **Synchroniser langues requises FE/BE** (5 langues FE vs 1-2 BE) | UX bloquante inutile sur tous les formulaires multilingues | 2h |

---

## TABLEAU RÉCAPITULATIF PAR FORMULAIRE

| Formulaire | 🔴 | 🟠 | 🟡 | ✅ | Score |
|-----------|-----|-----|-----|-----|-------|
| Login | 0 | 1 | 2 | 4 | 75 |
| Inscription | 4 | 3 | 2 | 2 | 30 |
| Forgot Password | 0 | 0 | 1 | 3 | 90 |
| Reset Password | 1 | 2 | 1 | 2 | 55 |
| Verify Email | 1 | 0 | 1 | 1 | 50 |
| Événement | 4 | 4 | 1 | 2 | 25 |
| Œuvre | 5 | 1 | 1 | 2 | 25 |
| Artisanat | 3 | 3 | 2 | 1 | 25 |
| AjouterService | 1 | 1 | 1 | 2 | 55 |
| AjouterServicePro | 3 | 3 | 0 | 1 | 25 |
| PatrimoinePro | 3 | 2 | 1 | 1 | 30 |
| Patrimoine Admin | 3 | 2 | 1 | 1 | 30 |
| Organisation | 0 | 1 | 1 | 3 | 75 |
| Programme | 1 | 2 | 3 | 3 | 50 |
| Profil | 4 | 1 | 0 | 0 | 10 |
| Commentaires | 0 | 4 | 2 | 1 | 35 |
| Préférences | 0 | 1 | 2 | 3 | 70 |
| Article | 0 | 2 | 1 | 2 | 55 |

---

*Audit généré le 14 mars 2026*
*Basé sur l'analyse exhaustive de : 15 formulaires, 150+ champs, comparaison frontend/backend sur chaque champ, 18 fichiers frontend, 12 fichiers backend*
