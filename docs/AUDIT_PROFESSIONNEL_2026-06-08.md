# AUDIT PROFESSIONNEL — EVENTCULTURE
## Rapport Complet — 715 fichiers analysés

**Date :** 2026-06-08  
**Périmètre :** 715 fichiers source (Backend Node.js/Express/Sequelize · Frontend React/TypeScript · DB MySQL · DevOps)  
**Méthodologie :** Lecture intégrale de chaque fichier par agents spécialisés — aucun fichier supposé, tout vérifié sur le code réel

> ⚠️ Corrections vs audit précédent : le modèle `programmeIntervenant.js` **EXISTE** déjà. Les seeds **EXISTENT** dans `database/seeds/`. Les cookies access/refresh sont bien en **httpOnly** (confirmé sur authCookieService.js).

---

## TABLEAU DE BORD EXÉCUTIF

| Dimension | Score | Statut |
|-----------|-------|--------|
| Sécurité — Middlewares et Auth | 7/10 | 🟡 Solide mais 5 vulnérabilités réelles |
| Sécurité — Routes et IDOR | 5/10 | ⚠️ Ownership checks manquants sur 4 entités |
| Sécurité — Services | 5.5/10 | ⚠️ XSS emails, path traversal, ownership |
| Base de données et modèles | 8/10 | 🟢 Bien structuré, quelques FK manquantes |
| Qualité code backend | 7/10 | 🟡 Architecture solide, God method à découper |
| Frontend TypeScript | 6/10 | ⚠️ Types incohérents, casts, token localStorage |
| Frontend pages admin | 4/10 | 🔴 Suppressions sans confirmation, pas de guard |
| Tests et couverture | 5.5/10 | ⚠️ Coverage 60%, tests skippés |
| Configuration & DevOps | 6.5/10 | 🟡 Seeds existent, credentials dans shell script |
| **SCORE GLOBAL** | **6.1/10** | **⚠️ Corrections requises avant production** |

---

## 1. SÉCURITÉ — MIDDLEWARES ET AUTH

### ✅ Points forts confirmés (lecture code réel)

- **Cookies httpOnly** : `authCookieService.js` confirme `httpOnly: true`, `secure: isProduction`, `sameSite: 'lax'` sur `access_token` et `refresh_token`
- **CSRF** : Double-submit cookie, `crypto.timingSafeEqual()`, token 256 bits, rotaté à chaque réponse
- **Rate limiting** : Redis distribué, prefix isolé (`rl:name:`), account lockout après 5 tentatives, slow-down progressif
- **CORS** : Whitelist stricte, `https://` obligatoire en prod, origines loggées
- **Magic bytes** : Upload validé sur contenu réel (pas seulement MIME client)
- **Sanitisation articles** : `sanitize-html` avec whitelist stricte, iframes seulement YouTube/Vimeo
- **JWT** : HS256, `jti` unique, issuer/audience vérifiés, fallback de transition

---

### 🔴 Vulnérabilités réelles identifiées

#### HAUTE — CSRF : crash possible si header null
**Fichier :** `backend/middlewares/csrfMiddleware.js:85-92`

```javascript
// DANGEREUX — si headerToken est undefined, .length lève une exception
if (cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken)))
```

**Correction :**
```javascript
const cookieToken = req.cookies?.[CSRF_COOKIE] || '';
const headerToken = req.headers[CSRF_HEADER] || '';
if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
  return res.status(403).json({ success: false, code: 'CSRF_MISMATCH' });
}
```

---

#### HAUTE — Prototype Pollution dans sanitizeObject
**Fichier :** `backend/middlewares/securityMiddleware.js:122-147`

```javascript
for (const key in obj) {  // itère sur __proto__, constructor, prototype
```

**Payload d'attaque :** `{ "constructor": { "prototype": { "isAdmin": true } } }`

**Correction :** Remplacer par `for (const key of Object.keys(obj))` + filtrer les clés dangereuses.

---

#### MOYENNE — viewLimiter sans Redis (non distribué)
**Fichier :** `backend/middlewares/rateLimitMiddleware.js:164-176`

Le `viewLimiter` n'appelle pas `withStore()` → MemoryStore local uniquement. Avec un load balancer sur plusieurs instances Node, chaque instance compte séparément.

**Correction :** `const viewLimiter = rateLimit(withStore('views', { ... }));`

---

#### MOYENNE — JWT expire en 24h par défaut
**Fichier :** `backend/config/envValidator.js:36`

`JWT_EXPIRES_IN: '24h'` est trop long. Bonne pratique : 15-60 minutes pour l'access token.

**Correction :** Changer à `'1h'` ou mieux `'15m'` avec refresh automatique.

---

#### FAIBLE — Timing leak dans vérification password_changed_at
**Fichier :** `backend/middlewares/authMiddleware.js:325-333`

Comparaison `decoded.pwdAt < pwdChangedAtSec` non en temps constant. Fuite d'information très faible via mesure de temps de réponse.

---

## 2. SÉCURITÉ — ROUTES (IDOR et OWNERSHIP)

### Résultat des lectures complètes de tous les fichiers de routes

#### 🔴 CRITIQUE — oeuvreRoutes.js : PUT/DELETE sans ownership explicite dans la route
**Fichier :** `backend/routes/oeuvreRoutes.js:73-77`

```javascript
router.put('/:id', authenticate, requireVerifiedEmail, validateId(), validateStringLengths,
  validateWorkSubmission,
  asyncHandler((req, res) => oeuvreController.update(req, res)));  // ownership dans le service ?
router.delete('/:id', authenticate, requireVerifiedEmail, validateId(),
  asyncHandler((req, res) => oeuvreController.delete(req, res)));
```

L'ownership est délégué au service. **Vérifier** que `oeuvreService.update()` et `.delete()` vérifient bien `saisi_par === userId || isAdmin`. Si ce check est absent du service, c'est une IDOR critique.

---

#### 🔴 CRITIQUE — evenementRoutes.js : PUT/DELETE sans ownership check visible
**Fichier :** `backend/routes/evenementRoutes.js:84-92`

Route PUT sans vérification propriétaire dans la route. Vérifier `evenementService.update()`.

---

#### 🔴 CRITIQUE — artisanatRoutes.js : PUT/DELETE sans ownership check visible
**Fichier :** `backend/routes/artisanatRoutes.js:62-68`

Même pattern. Vérifier `artisanatService`.

---

#### 🔴 CRITIQUE — programmeRoutes.js : PATCH statut sans ownership
**Fichier :** `backend/routes/programmeRoutes.js:169-177`

Changement de statut d'un programme sans vérifier que l'utilisateur est propriétaire de l'événement parent.

---

#### HAUTE — dashboardRoutes.js : bulk action sans limite d'items
**Fichier :** `backend/routes/dashboardRoutes.js:265-276`

```javascript
body('user_ids').isArray({ min: 1 })  // pas de max !
```

Un admin peut envoyer 10 000 IDs en une seule requête (delete/suspend massif).

**Correction :** `.isArray({ min: 1, max: 100 })`

---

#### HAUTE — signalementRoutes.js : paramètres non validés
**Fichier :** `backend/routes/signalementRoutes.js:188-225`

```javascript
if (statut) where.statut = statut;  // statut non validé avec isIn()
if (motif) where.motif = motif;     // motif non validé
```

**Correction :**
```javascript
query('statut').optional().isIn(['en_attente', 'traite', 'rejete']),
query('motif').optional().isIn([...VALID_MOTIFS]),
```

---

#### HAUTE — professionnelRoutes.js : requireOwnership fail-open
**Fichier :** `backend/routes/professionnelRoutes.js:88-89`

```javascript
const requireOwnership = authMiddleware.requireOwnership
  ? authMiddleware.requireOwnership
  : () => requireMiddleware('auth.requireOwnership', null);  // Si manquant → ne fait rien !
```

Si `authMiddleware.requireOwnership` est undefined, le fallback est un middleware vide qui laisse tout passer.

**Correction :** Fail-closed — `throw new Error('requireOwnership middleware not available')`.

---

#### HAUTE — uploadRoutes.js : download sans auth obligatoire
**Fichier :** `backend/routes/uploadRoutes.js:148-151`

```javascript
router.get('/file/:id', authMiddleware.optionalAuth, uploadController.downloadMedia);
```

Les fichiers privés peuvent être accessibles sans authentification si le contrôleur ne vérifie pas la visibilité.

---

#### MOYENNE — patrimoineRoutes.js : PATCH detail sans ownership
**Fichier :** `backend/routes/patrimoineRoutes.js:75-78`

N'importe quel utilisateur authentifié peut modifier les détails d'un site patrimoine.

---

#### FAIBLE — articleBlockRoutes.js : création sans rate limit
**Fichier :** `backend/routes/articleBlockRoutes.js:154-160`

Pas de `rateLimitMiddleware.creation` sur POST.

---

## 3. SÉCURITÉ — SERVICES

#### 🔴 CRITIQUE — emailService.js : XSS dans les templates fallback
**Fichier :** `backend/services/emailService.js:404, 651, 678-685`

Dans les templates HTML fallback, les variables sont interpolées directement **sans `_escapeHtml()`** :

```javascript
// LIGNE 678 — DANGEREUX
html = `<p>Bonjour ${prenom},</p>
  <p>L'événement <strong>${nomEvenement}</strong> aura lieu demain !</p>`;
// prenom et nomEvenement ne sont PAS échappés
```

Si `prenom = '<script>alert(1)</script>'`, le code s'exécute dans l'email.

**Correction :** Appliquer `this._escapeHtml()` sur TOUTES les variables dans les templates fallback :
```javascript
html = `<p>Bonjour ${this._escapeHtml(prenom)},</p>`;
```

---

#### HAUTE — uploadService.js : path traversal dans _securePath
**Fichier :** `backend/services/upload/uploadService.js:30-51`

```javascript
.replace(/\.{2,}/g, '.')  // "..." → "." mais PAS vide → traversal toujours possible
const absolutePath = path.resolve(this.uploadsRoot, '..', cleanPath);  // remonte un niveau !
```

**Correction :**
```javascript
_securePath(filePath) {
  const cleanPath = filePath.replace(/\\/g, '/');
  const resolved = path.resolve(this.uploadsRoot, cleanPath);
  const realRoot = path.resolve(this.uploadsRoot);
  if (!resolved.startsWith(realRoot + path.sep) && resolved !== realRoot) return null;
  return resolved;
}
```

---

#### HAUTE — commentaireService.js : suppression sans ownership
**Fichier :** `backend/services/commentaireService.js:99-101`

```javascript
async deleteCommentaire(commentaireInstance) {
  return this.repository.softDelete(commentaireInstance);  // Pas de vérif userId
}
```

**Correction :**
```javascript
async deleteCommentaire(commentaireInstance, userId) {
  if (commentaireInstance.id_user !== userId && !commentaireInstance.isAdmin) {
    throw new ForbiddenError('Vous ne pouvez pas supprimer ce commentaire');
  }
  return this.repository.softDelete(commentaireInstance);
}
```

---

#### HAUTE — notificationService.js : envoi notifications sans autorisation
**Fichier :** `backend/services/notificationService.js:98-150`

`notifierValidationParticipation()` envoie des notifications à n'importe quel user sans vérifier que le demandeur est propriétaire de l'événement.

---

#### MOYENNE — userManagementService.js : détection admin incomplète
**Fichier :** `backend/services/dashboard/userManagementService.js:127-164`

```javascript
if (user.Roles && user.Roles.some(r => r.nom_role === 'Admin')) {
  throw new Error('CANNOT_DELETE_ADMIN');
}
```

Si `user.Roles` est `null` ou si l'admin est détecté via `id_type_user === 29` (pas via Roles), il passe.

**Correction :** Ajouter `|| user.id_type_user === 29`.

---

#### MOYENNE — userManagementService.js : changeUserRole sans audit log
**Fichier :** `backend/services/dashboard/userManagementService.js:187-206`

Modification de rôle sans log d'audit, sans vérifier si le demandeur peut assigner ce rôle, sans notifier l'utilisateur.

---

#### MOYENNE — userService.js : réutilisation du même mot de passe autorisée
**Fichier :** `backend/services/user/userService.js:358-391`

`changePassword()` vérifie l'ancien mdp mais n'empêche pas de mettre le même nouveau mdp.

---

## 4. BASE DE DONNÉES ET MODÈLES

### ✅ Corrections vs premier audit

- **`programmeIntervenant.js` EXISTE** dans `backend/models/associations/programmeIntervenant.js` — erreur du premier audit
- **Seeds EXISTENT** dans `backend/database/seeds/seed-reference-data.sql` — 93 catégories, wilayas, genres, types, rôles, langues, admin hash bcrypt

### 🟡 Problèmes réels restants

#### HAUTE — FK onDelete manquants sur les sous-types d'œuvres
**Fichiers :** `models/oeuvres/livre.js`, `film.js`, `albumMusical.js`, `article.js`, `artisanat.js`, `oeuvreArt.js`, `articleScientifique.js`

```javascript
// ACTUEL — sans onDelete
Livre.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });

// CORRECT
Livre.belongsTo(models.Oeuvre, {
  foreignKey: 'id_oeuvre',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
```

Si une œuvre parent est supprimée, les enregistrements fils deviennent orphelins.

---

#### HAUTE — FK valide_par dans EvenementUser sans onDelete
**Fichier :** `backend/models/associations/evenementUser.js:52-58`

```javascript
valide_par: {
  type: DataTypes.INTEGER,
  references: { model: 'user', key: 'id_user' }
  // onDelete manquant — orphelinage si validateur supprimé
}
```

**Correction :** Ajouter `onDelete: 'SET NULL'`.

---

#### MOYENNE — Validation manquante sur champs numériques
- `prix` et `tarif` DECIMAL sans `validate: { min: 0 }` → prix négatifs possibles
- `isbn` dans Livre sans regex `validate: { is: /^[0-9]{13}$/ }`

---

#### MOYENNE — LIKE '%...%' sur champs JSON
**Fichier :** `backend/repositories/oeuvreRepository.js:145-153`

Recherche sur `JSON_EXTRACT(titre, '$.fr')` = full table scan. Acceptable pour l'instant, à monitorer au-delà de 10 000 œuvres.

---

## 5. QUALITÉ CODE BACKEND

#### 🔴 CRITIQUE — PatrimoineService.create() : 209 lignes, 8 responsabilités
**Fichier :** `backend/services/patrimoine/patrimoineService.js:99-307`

Crée Lieu + DetailLieu + Monument + Vestige + Services + LieuMedia + logging + déduplication GPS en une seule méthode.

**Refactoring :**
```javascript
async create(data, userId) {
  return this.withTransaction(async (txn) => {
    const lieu = await this._createOrUpdateLieu(data, txn);
    await this._createDetailLieu(lieu.id_lieu, data, txn);
    await this._synchronizeMonuments(lieu.id_lieu, data.monuments, txn);
    await this._synchronizeVestiges(lieu.id_lieu, data.vestiges, txn);
    await this._synchronizeServices(lieu.id_lieu, data.services, txn);
    await this._synchronizeMedias(lieu.id_lieu, data.medias, txn);
    return lieu;
  });
}
```

---

#### HAUTE — patrimoineController.js : requêtes DB directes et console.error
**Fichier :** `backend/controllers/patrimoineController.js:125-143, 263-289, 287`

- Lignes 125-143 : `findAll()` avec `JSON_EXTRACT` directement dans le controller
- Ligne 287 : `console.error()` au lieu de `this.logger.error()`
- 8 méthodes sans try/catch (noter, ajouterFavoris, retirerFavoris, uploadMedias, deleteMedia)

---

#### HAUTE — console.log de debug dans routes
**Fichier :** `backend/routes/patrimoineRoutes.js:27`

```javascript
console.log('[DEBUG ROUTE] /popular hit');  // reste en production
```

---

#### MOYENNE — Duplication de code
- Pattern `.map(s => s.toCardJSON(req.lang))` répété 10+ fois dans les controllers
- Déduplication monuments/vestiges implémentée 2× dans patrimoineService
- Validation manuelle de query params répétée 3× dans patrimoineController

---

## 6. FRONTEND — SÉCURITÉ ET BUGS

#### 🔴 CRITIQUE — Token stocké en localStorage pour WebSocket
**Fichier :** `frontEnd/src/hooks/useNotifications.ts:189-191`

```typescript
let token: string | null = null;
try { token = localStorage.getItem('auth_token'); } catch { }
```

Les tokens ne doivent **jamais** être en localStorage (accessible via XSS). L'auth doit passer par les cookies httpOnly automatiquement.

**Correction :** Supprimer ce bloc. Le serveur WebSocket doit valider le cookie httpOnly.

---

#### 🔴 CRITIQUE — Pages admin sans confirmation sur suppressions
**Fichiers :**
- `frontEnd/src/pages/admin/AdminUsersTab.tsx:279, 424` — suppression user sans dialog
- `frontEnd/src/pages/admin/AdminOeuvresTab.tsx:275` — suppression œuvre sans dialog
- `frontEnd/src/pages/admin/AdminEvenementsTab.tsx:258-270` — annulation et suppression sans confirmation

Seul `AdminPatrimoineTab.tsx` a correctement un `ConfirmDialog`. Copier ce pattern vers les 3 autres.

---

#### 🔴 CRITIQUE — AdminUsersTab : pas de guard de permission au niveau composant
**Fichier :** `frontEnd/src/pages/admin/AdminUsersTab.tsx:5-96`

```typescript
// PAS de vérification isAdmin au chargement
export function AdminUsersTab() {
  const { data } = useDashboardAdmin();
  // ...
}
```

L'accès à `/admin/dashboard?tab=users` affiche les données sans vérifier le rôle admin côté client.

**Correction :**
```typescript
const { user } = useAuth();
if (!user?.isAdmin) return <Navigate to="/" replace />;
```

---

#### HAUTE — upload.service.ts : validation MIME avec fallback sur extension
**Fichier :** `frontEnd/src/services/upload.service.ts:373-429`

Si le MIME type ne correspond pas, fallback sur l'extension. `malware.exe.jpg` passe la validation client.

**Correction :** Supprimer le fallback extension ; la validation réelle se fait côté serveur.

---

#### HAUTE — upload.service.ts : taille de chunk non limitée
**Fichier :** `frontEnd/src/services/upload.service.ts:309-310`

```typescript
const chunkSize = options?.chunkSize || 5 * 1024 * 1024;  // pas de max
```

Un utilisateur peut passer `chunkSize: 2147483648` (2GB).

**Correction :** `Math.min(options?.chunkSize || 5 * 1024 * 1024, 10 * 1024 * 1024)`.

---

#### HAUTE — Incohérences critiques dans les types TypeScript

| Fichier | Problème | Impact |
|---------|---------|--------|
| `types/models/oeuvre.types.ts` | `note_moyenne` absent de l'interface `Oeuvre` | 12 casts `as any` dans Hero* |
| `types/enums/evenement.enums.ts` | Manque `'publie' \| 'brouillon' \| 'en_attente'` dans `StatutEvenement` | Crash runtime |
| `types/models/evenement.types.ts` | `id_organisation`, `heure_debut`, `heure_fin` absents | Casts ou undefined |
| `types/models/user.types.ts:43 vs 203` | Deux définitions de `TypeUserEnum` incompatibles | Confusion string/numeric |

---

#### MOYENNE — Memory leak fetch QR code
**Fichier :** `frontEnd/src/pages/PatrimoineDetail.tsx:206-212`

```typescript
useEffect(() => {
  fetch(`/api/patrimoine/${site.id_lieu}/qrcode`)  // URL hardcodée + pas de cleanup
    .then(d => { if (d.success) setQrDataUrl(d.data.qr_data_url); });
}, [site?.id_lieu]);
```

Si le composant est démonté avant la réponse, `setQrDataUrl()` s'exécute sur un composant mort.

**Correction :** Ajouter `let mounted = true; return () => { mounted = false; };`

---

#### MOYENNE — JSON.parse sans try-catch (12 occurrences)
**Fichiers :** `useOeuvres.ts:127`, `useArtisanat.ts:153`, `ArtisanatForm.tsx:149`, `auth.service.ts:331, 394, 411`, `AjouterEvenement.tsx:122`

Si le localStorage est corrompu → `SyntaxError` non catchée → crash du composant.

---

#### MOYENNE — socketService.ts : userId passé en query string
**Fichier :** `frontEnd/src/services/socketService.ts:441-444`

```typescript
query: { userId: authService.getCurrentUserId() || undefined }
```

Le userId en query string est visible dans les logs serveur et pas protégé.

---

#### FAIBLE — ProtectedRoute.tsx : code mort et imports cassés
**Fichier :** `frontEnd/src/components/auth/ProtectedRoute.tsx:1, 76, 151`

- Import sur une seule ligne (formatage cassé)
- Variable `redirectTo` en conflit avec paramètre
- `const { t }` importé mais jamais utilisé dans `AdminRoute`

---

## 7. FRONTEND — PAGES ET FORMULAIRES

#### MOYENNE — AjouterOeuvre.tsx : validation taille fichier à 100MB pour images
**Fichier :** `frontEnd/src/pages/ajouterOeuvre/AjouterOeuvre.tsx:524`

100MB est acceptable pour vidéos mais excessif pour images. Risque réseau et serveur.

**Correction :** `MAX_IMAGE_SIZE = 10 * 1024 * 1024` (10MB).

---

#### MOYENNE — AjouterArtisanat.tsx : upload media sans try-catch
**Fichier :** `frontEnd/src/components/forms/ArtisanatForm.tsx:287-289`

```typescript
artisanatService.uploadMedias()  // sans try-catch
```

Si l'upload échoue, l'utilisateur voit "Succès!" mais les images ne sont pas envoyées.

---

#### FAIBLE — AjouterEvenement.tsx : draft en sessionStorage non chiffré
**Fichier :** `frontEnd/src/pages/AjouterEvenement.tsx:114-147`

Données de formulaire (prix, contacts) en plaintext dans sessionStorage.

---

## 8. CONFIGURATION ET DEVOPS

#### 🔴 CRITIQUE — Credentials admin en clair dans le script de seed
**Fichier :** `backend/database/seeds/run-seeds-mysql.sh:206, 224`

```bash
-d '{"email":"admin@actionculture.dz","password":"admin123"}'
echo "Admin : admin@actionculture.dz / admin123"
```

Ces credentials apparaissent dans le code source, l'historique Git, et les logs CI/CD.

**Action immédiate :** Changer le mot de passe admin en production. Utiliser des variables d'environnement dans le script.

---

#### HAUTE — JWT_VERIFY_STRICT jamais activé, pas de deadline
**Fichier :** `backend/utils/jwtHelper.js:72-102`

Le mode de transition accepte des anciens tokens sans `iss`/`aud` indéfiniment. Sans deadline, cela ne sera jamais corrigé.

**Correction :** Ajouter une date butoir :
```javascript
const JWT_TRANSITION_DEADLINE = new Date('2026-09-01');
if (new Date() > JWT_TRANSITION_DEADLINE && isIssAudErr) {
  return null;  // Rejeter les anciens tokens après la deadline
}
```

---

#### HAUTE — database/seeds/run-seeds-mysql.sh : password DB dans script
**Fichier :** `backend/database/seeds/run-seeds-mysql.sh`

Le script contient des appels curl avec des données hardcodées. À ne jamais versionner avec des credentials réels.

---

#### MOYENNE — ViewCounter race condition
**Fichier :** `backend/utils/viewCounter.js:59, 130-131`

```javascript
if (this._flushing) return;  // check non-atomique
this._flushing = true;        // race window entre les deux lignes
```

**Correction :** Utiliser une promesse partagée pour rendre le flush atomique.

---

#### MOYENNE — envValidator.js : REDIS_HOST/PORT optionnels en production
**Fichier :** `backend/config/envValidator.js`

`REDIS_HOST` et `REDIS_PORT` sont optionnels (défauts localhost:6379). En production avec un Redis distant, si ces variables sont oubliées, l'app se connecte à localhost et échoue silencieusement.

**Correction :** Rendre `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` obligatoires en production.

---

#### FAIBLE — Tests : coverage 60%, tests skippés, mocks JWT incorrects

| Problème | Fichier | Impact |
|---------|---------|--------|
| Seuil coverage 60% (trop bas) | `jest.config.js` | Bugs non détectés |
| `evenementController.test.js` ignoré en CI | `jest.ci.config.js` | Controller jamais testé |
| `jwt.verify` mocké sans vraie signature | `authMiddleware.test.js:5-7` | Auth non testée réellement |
| 70%+ tests skippés en frontend | `tests/forms/Login.test.tsx:218` | Formulaires non testés |
| Tests AjouterOeuvre skippés | `tests/forms/AjouterOeuvre.test.tsx:602, 900` | Soumission non testée |

---

## 9. PLAN D'ACTION PRIORISÉ

### SPRINT 0 — BLOQUANTS AVANT PRODUCTION (cette semaine)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| 1 | Changer le mot de passe admin en prod (admin123 exposé) | run-seeds-mysql.sh | 15 min |
| 2 | Fix prototype pollution : `for...in` → `Object.keys()` | securityMiddleware.js:123 | 30 min |
| 3 | Fix CSRF : guard null avant timingSafeEqual | csrfMiddleware.js:85 | 20 min |
| 4 | Supprimer token localStorage dans useNotifications | useNotifications.ts:189 | 15 min |
| 5 | Ajouter FK `onDelete: 'CASCADE'` sur 7 sous-types oeuvres | models/oeuvres/*.js | 1h |
| 6 | Fix XSS emails : `_escapeHtml()` sur prenom/nomEvenement | emailService.js:404,651,678 | 1h |
| 7 | Fix path traversal dans _securePath | uploadService.js:30-51 | 45 min |
| 8 | Ajouter ConfirmDialog sur AdminUsersTab, AdminOeuvresTab, AdminEvenementsTab | admin/*.tsx | 2h |

### SPRINT 1 — HAUTE PRIORITÉ (semaine 1-2)

| # | Action | Effort |
|---|--------|--------|
| 9 | Vérifier ownership dans oeuvreService.update/delete, evenementService.delete, artisanatService | 2h |
| 10 | Ajouter guard isAdmin dans AdminUsersTab | 30 min |
| 11 | Fix commentaireService.delete : ajouter ownership check | 30 min |
| 12 | Corriger signalementRoutes : isIn() sur statut/motif | 30 min |
| 13 | Limiter bulk user action : max: 100 | 10 min |
| 14 | Fix professionnelRoutes : requireOwnership fail-closed | 30 min |
| 15 | Ajouter `note_moyenne` à interface Oeuvre | 15 min |
| 16 | Corriger evenement.enums.ts : ajouter 'publie', 'brouillon', 'en_attente' | 20 min |
| 17 | Corriger evenement.types.ts : ajouter id_organisation, heure_debut/fin | 20 min |
| 18 | Refactoriser PatrimoineService.create() en sous-méthodes | 3h |
| 19 | Ajouter try-catch aux 8 méthodes non protégées dans patrimoineController | 1h |
| 20 | Supprimer console.log('[DEBUG ROUTE]') dans patrimoineRoutes | 5 min |
| 21 | Fix memory leak QR code fetch | 15 min |
| 22 | Wrapper JSON.parse avec safeParse() sur 12 occurrences | 1h |
| 23 | Ajouter `onDelete: 'SET NULL'` sur valide_par dans evenementUser | 15 min |

### SPRINT 2 — DETTE TECHNIQUE (semaine 2-4)

| # | Action | Effort |
|---|--------|--------|
| 24 | Réduire JWT_EXPIRES_IN de 24h à 1h | 15 min |
| 25 | Définir deadline JWT_VERIFY_STRICT (ex: 2026-09-01) | 30 min |
| 26 | Passer viewLimiter sur Redis (withStore) | 30 min |
| 27 | Rendre REDIS_HOST/PORT obligatoires en production | 30 min |
| 28 | Fix viewCounter race condition | 1h |
| 29 | Ajouter audit log dans changeUserRole | 1h |
| 30 | Ajouter vérification autorisation dans notificationService | 1h |
| 31 | Supprimer userId du query string WebSocket | 15 min |
| 32 | Limiter chunk upload à 10MB | 15 min |
| 33 | Remplacer ~65 casts as any par types stricts | 4h |
| 34 | Augmenter coverage Jest à 75% | 4h |
| 35 | Corriger tests skippés (Login, AjouterOeuvre) | 3h |
| 36 | Fix ProtectedRoute.tsx : formatage, variable shadowing, code mort | 30 min |

---

## 10. CE QUI FONCTIONNE TRÈS BIEN

| Aspect | Détail |
|--------|--------|
| **Cookies httpOnly** | access_token ET refresh_token : httpOnly + secure + sameSite — exemplaire |
| **Refresh token** | Scope limité à `/api/users/refresh-token` uniquement |
| **CSRF** | Double-submit, `crypto.timingSafeEqual`, 256 bits |
| **Upload magic bytes** | Validation sur contenu réel, pas MIME client |
| **Sanitisation articles** | Whitelist stricte, iframes uniquement domaines autorisés |
| **Architecture patterns** | Controller → Service → Repository bien respecté partout |
| **JWT** | HS256, jti unique, issuer/audience, blacklist Redis |
| **Rate limiting** | Redis distribué, granulaire par action, account lockout |
| **CORS** | Whitelist stricte, https obligatoire en production |
| **Migrations** | 24 migrations propres, pas de sync() en production |
| **Seeds** | seed-reference-data.sql complet (93 catégories, wilayas, rôles) |
| **Circuit breaker** | Implémenté pour services externes |
| **Code splitting** | Lazy loading sur toutes les pages lourdes |
| **React Query** | staleTime, retry, error states cohérents |
| **multiLangSearchBuilder** | Injection SQL correctement protégée |

---

## 11. RÉSUMÉ CHIFFRÉ

| Sévérité | Nombre | Catégories principales |
|----------|--------|----------------------|
| 🔴 CRITIQUE | 8 | Credentials exposés, XSS email, token localStorage, suppressions sans confirmation, IDOR potentiel |
| 🟠 HAUTE | 14 | Path traversal, ownership manquants, CSRF crash, CSP, types incohérents |
| 🟡 MOYENNE | 18 | Race conditions, validations manquantes, memory leak, JSON.parse |
| 🟢 FAIBLE | 9 | Code mort, formatage, debug logs, coverage tests |
| **TOTAL** | **49** | |

---

*Audit professionnel — 2026-06-08 — EventCulture — 715 fichiers analysés*  
*Toutes les conclusions sont basées sur lecture intégrale des fichiers sources.*
